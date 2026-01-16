import axios from 'axios';
import FormData from 'form-data';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { downloadImage } from './utils/unsplash.js';

dotenv.config();

// Create an HTTPS agent with specific TLS settings
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Accept self-signed certificates
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: 'ALL',
  honorCipherOrder: false,
  secureOptions: 0, // Disable all checks
  keepAlive: false,
});

// Get WordPress credentials
function getWordPressAuth() {
  const wpUrl = process.env.WORDPRESS_URL;
  const wpUsername = process.env.WORDPRESS_USERNAME;
  const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!wpUrl || !wpUsername || !wpAppPassword) {
    throw new Error('WordPress credentials not found in .env file');
  }

  const auth = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

  return {
    url: wpUrl,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  };
}

// Get or create categories
async function getOrCreateCategories(categories) {
  if (!categories || categories.length === 0) {
    return [];
  }

  const auth = getWordPressAuth();
  const categoryIds = [];

  for (const categoryName of categories) {
    try {
      // Search for existing category
      const searchResponse = await axios.get(
        `${auth.url}/wp-json/wp/v2/categories`,
        {
          params: { search: categoryName },
          headers: auth.headers,
          httpsAgent,
        }
      );

      let categoryId;

      if (searchResponse.data.length > 0) {
        categoryId = searchResponse.data[0].id;
      } else {
        // Create new category
        const createResponse = await axios.post(
          `${auth.url}/wp-json/wp/v2/categories`,
          { name: categoryName },
          { headers: auth.headers, httpsAgent }
        );
        categoryId = createResponse.data.id;
      }

      categoryIds.push(categoryId);
    } catch (error) {
      console.log(chalk.yellow(`  Warning: Could not process category "${categoryName}"`));
    }
  }

  return categoryIds;
}

// Get or create tags
async function getOrCreateTags(tags) {
  if (!tags || tags.length === 0) {
    return [];
  }

  const auth = getWordPressAuth();
  const tagIds = [];

  for (const tagName of tags) {
    try {
      // Search for existing tag
      const searchResponse = await axios.get(
        `${auth.url}/wp-json/wp/v2/tags`,
        {
          params: { search: tagName },
          headers: auth.headers,
          httpsAgent,
        }
      );

      let tagId;

      if (searchResponse.data.length > 0) {
        tagId = searchResponse.data[0].id;
      } else {
        // Create new tag
        const createResponse = await axios.post(
          `${auth.url}/wp-json/wp/v2/tags`,
          { name: tagName },
          { headers: auth.headers, httpsAgent }
        );
        tagId = createResponse.data.id;
      }

      tagIds.push(tagId);
    } catch (error) {
      console.log(chalk.yellow(`  Warning: Could not process tag "${tagName}"`));
    }
  }

  return tagIds;
}

// Upload image to WordPress media library
async function uploadImageToWordPress(imageUrl, altText, caption) {
  const spinner = ora('Uploading image...').start();

  try {
    const auth = getWordPressAuth();

    // Download image from Unsplash
    const filename = `image-${Date.now()}.jpg`;
    const downloadResult = await downloadImage(imageUrl, filename);

    if (!downloadResult.success) {
      spinner.fail(chalk.red('Failed to download image'));
      return null;
    }

    // Read the file
    const imageBuffer = fs.readFileSync(downloadResult.filepath);

    // Create form data
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename,
      contentType: 'image/jpeg',
    });

    if (altText) {
      formData.append('alt_text', altText);
    }

    if (caption) {
      formData.append('caption', caption);
    }

    // Upload to WordPress
    const response = await axios.post(
      `${auth.url}/wp-json/wp/v2/media`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': auth.headers.Authorization,
        },
        httpsAgent,
      }
    );

    // Clean up temp file
    fs.unlinkSync(downloadResult.filepath);

    spinner.succeed(chalk.green('Image uploaded'));

    return {
      id: response.data.id,
      url: response.data.source_url,
    };
  } catch (error) {
    spinner.fail(chalk.red('Failed to upload image'));
    console.error('Error details:', error.message);
    return null;
  }
}

// Create draft post (with optional publish/schedule)
export async function createDraft(article, images, options = {}) {
  const { publishStatus = 'draft', scheduleDate = null } = options;

  console.log(chalk.cyan('\n📤 Creating WordPress post...\n'));

  try {
    const auth = getWordPressAuth();

    // Get or create categories and tags
    const spinner = ora('Processing categories and tags...').start();
    const categoryIds = await getOrCreateCategories(article.categories);
    const tagIds = await getOrCreateTags(article.tags);
    spinner.succeed(chalk.green('Categories and tags processed'));

    // Upload featured image
    let featuredMediaId = null;
    if (images.featuredImage) {
      console.log(chalk.yellow('\nUploading featured image...'));
      const uploadResult = await uploadImageToWordPress(
        images.featuredImage.url,
        images.featuredImage.altText,
        images.featuredImage.credit
      );

      if (uploadResult) {
        featuredMediaId = uploadResult.id;
      }
    }

    // Upload inline images and update content
    let updatedContent = article.content;
    if (images.inlineImages && images.inlineImages.length > 0) {
      console.log(chalk.yellow(`\nUploading ${images.inlineImages.length} inline images...`));
      console.log(chalk.gray('Debug: Inline images:', JSON.stringify(images.inlineImages.map(img => ({ placeholder: img.placeholder, position: img.position })), null, 2)));

      for (const image of images.inlineImages) {
        console.log(chalk.gray(`\nDebug: Processing image with placeholder: "${image.placeholder}"`));
        console.log(chalk.gray(`Debug: Placeholder in content: ${updatedContent.includes(image.placeholder || '')}`));

        const uploadResult = await uploadImageToWordPress(
          image.url,
          image.altText,
          image.credit
        );

        if (uploadResult && image.placeholder) {
          console.log(chalk.gray(`Debug: Replacing placeholder "${image.placeholder}" with uploaded image`));

          // Replace placeholder with WordPress image HTML
          const imageHtml = `
<figure class="wp-block-image">
  <img src="${uploadResult.url}" alt="${image.altText}" />
  <figcaption>${image.credit}</figcaption>
</figure>`;

          const beforeLength = updatedContent.length;
          updatedContent = updatedContent.replace(image.placeholder, imageHtml);
          const afterLength = updatedContent.length;

          if (beforeLength === afterLength) {
            console.log(chalk.red(`Debug: Placeholder "${image.placeholder}" NOT found in content!`));
          } else {
            console.log(chalk.green(`Debug: Successfully replaced placeholder`));
          }
        } else if (!image.placeholder) {
          console.log(chalk.yellow(`Debug: Image has no placeholder property!`));
        }
      }
    }

    // Remove any remaining image placeholders
    updatedContent = updatedContent.replace(/\[IMAGE:\s*[^\]]+\]/g, '');

    // Create post
    const postSpinner = ora(`Creating ${publishStatus === 'publish' ? 'published' : publishStatus === 'future' ? 'scheduled' : 'draft'} post...`).start();

    const postData = {
      title: article.title,
      content: updatedContent,
      excerpt: article.excerpt,
      status: publishStatus,
      categories: categoryIds,
      tags: tagIds,
    };

    // Add schedule date if scheduling
    if (publishStatus === 'future' && scheduleDate) {
      postData.date = scheduleDate;
    }

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    const response = await axios.post(
      `${auth.url}/wp-json/wp/v2/posts`,
      postData,
      { headers: auth.headers, httpsAgent }
    );

    postSpinner.succeed(chalk.green(`Post ${publishStatus === 'publish' ? 'published' : publishStatus === 'future' ? 'scheduled' : 'created as draft'} successfully!`));

    const post = response.data;

    // Debug: Log the response structure if needed
    if (!post || !post.id) {
      console.log(chalk.yellow('Debug: Response structure:'), JSON.stringify(post, null, 2).substring(0, 500));
    }

    // Handle different response structures
    const postId = post.id || post.ID;
    const postTitle = post.title?.rendered || post.title || article.title;
    const postStatus = post.status || 'draft';
    const postLink = post.link || post.guid?.rendered || post.guid;

    console.log(chalk.green(`\n✓ WordPress post ${publishStatus === 'publish' ? 'published' : publishStatus === 'future' ? 'scheduled' : 'created'}!\n`));
    console.log(chalk.bold('Post Details:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.white(`Post ID: ${postId}`));
    console.log(chalk.white(`Title: ${postTitle}`));
    console.log(chalk.white(`Status: ${postStatus}`));
    if (publishStatus === 'future' && post.date) {
      console.log(chalk.white(`Scheduled for: ${post.date}`));
    }
    console.log(chalk.white(`Edit URL: ${auth.url}/wp-admin/post.php?post=${postId}&action=edit`));
    if (publishStatus === 'publish') {
      console.log(chalk.white(`View URL: ${postLink}`));
    }
    console.log(chalk.gray('─'.repeat(60)));

    return {
      success: true,
      postId: postId,
      status: postStatus,
      editUrl: `${auth.url}/wp-admin/post.php?post=${postId}&action=edit`,
      previewUrl: postLink,
      publishUrl: publishStatus === 'publish' ? postLink : null,
      scheduledDate: publishStatus === 'future' ? post.date : null,
    };
  } catch (error) {
    console.log(chalk.red('\n✗ Failed to create post'));

    if (error.response?.status === 401) {
      console.log(chalk.red('Authentication failed. Please check your WordPress credentials in .env'));
    } else if (error.response?.data?.message) {
      console.log(chalk.red(`Error: ${error.response.data.message}`));
    } else {
      console.log(chalk.red(`Error: ${error.message}`));
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Publish a draft post
export async function publishPost(postId) {
  const spinner = ora('Publishing post...').start();

  try {
    const auth = getWordPressAuth();

    const response = await axios.post(
      `${auth.url}/wp-json/wp/v2/posts/${postId}`,
      { status: 'publish' },
      { headers: auth.headers, httpsAgent }
    );

    spinner.succeed(chalk.green('Post published!'));

    return {
      success: true,
      url: response.data.link,
    };
  } catch (error) {
    spinner.fail(chalk.red('Failed to publish post'));
    console.error('Error:', error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

// Schedule a post
export async function schedulePost(postId, datetime) {
  const spinner = ora('Scheduling post...').start();

  try {
    const auth = getWordPressAuth();

    const response = await axios.post(
      `${auth.url}/wp-json/wp/v2/posts/${postId}`,
      {
        status: 'future',
        date: datetime,
      },
      { headers: auth.headers, httpsAgent }
    );

    spinner.succeed(chalk.green('Post scheduled!'));

    return {
      success: true,
      scheduledDate: response.data.date,
    };
  } catch (error) {
    spinner.fail(chalk.red('Failed to schedule post'));
    console.error('Error:', error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

// Get recent drafts
export async function getRecentDrafts(perPage = 10) {
  const spinner = ora('Fetching recent drafts...').start();

  try {
    const auth = getWordPressAuth();

    const response = await axios.get(
      `${auth.url}/wp-json/wp/v2/posts`,
      {
        params: {
          status: 'draft',
          per_page: perPage,
          orderby: 'modified',
          order: 'desc',
        },
        headers: auth.headers,
        httpsAgent,
      }
    );

    spinner.succeed(chalk.green('Drafts fetched'));

    return {
      success: true,
      drafts: response.data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        modified: post.modified,
        editUrl: `${auth.url}/wp-admin/post.php?post=${post.id}&action=edit`,
      })),
    };
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch drafts'));

    return {
      success: false,
      error: error.message,
    };
  }
}

// Delete a post
export async function deletePost(postId) {
  const spinner = ora('Deleting post...').start();

  try {
    const auth = getWordPressAuth();

    await axios.delete(
      `${auth.url}/wp-json/wp/v2/posts/${postId}`,
      {
        params: { force: true },
        headers: auth.headers,
        httpsAgent,
      }
    );

    spinner.succeed(chalk.green('Post deleted'));

    return { success: true };
  } catch (error) {
    spinner.fail(chalk.red('Failed to delete post'));

    return {
      success: false,
      error: error.message,
    };
  }
}
