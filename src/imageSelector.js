import chalk from 'chalk';
import ora from 'ora';
import { searchPhotos, triggerDownload } from './utils/unsplash.js';
import { callClaude } from './utils/anthropic.js';
import { IMAGE_SELECTION_PROMPT } from './utils/prompts.js';

// Select images for article
export async function selectImages(article, brief) {
  console.log(chalk.cyan('\n🖼️  Finding images for your article...\n'));

  const selectedImages = [];

  for (let i = 0; i < article.imagePlacements.length; i++) {
    const placement = article.imagePlacements[i];

    console.log(chalk.yellow(`\nSearching for image ${i + 1}/${article.imagePlacements.length}:`));
    console.log(chalk.white(`  Query: "${placement.searchQuery}"`));

    const spinner = ora('Searching Unsplash...').start();

    // Search Unsplash
    const searchResult = await searchPhotos(placement.searchQuery, {
      perPage: 10,
      orientation: 'landscape',
    });

    if (!searchResult.success) {
      spinner.fail(chalk.red(searchResult.error));
      console.log(chalk.yellow('  Skipping this image placement...'));
      continue;
    }

    if (searchResult.results.length === 0) {
      spinner.warn(chalk.yellow('No images found for this query'));
      console.log(chalk.yellow('  Skipping this image placement...'));
      continue;
    }

    spinner.text = 'Analyzing images with AI...';

    // Get context around the image placement
    const context = getContextAroundPlacement(article.content, placement);

    // Use Claude to select the best image
    const selectionResult = await selectBestImage(
      searchResult.results,
      context,
      brief.topic
    );

    spinner.stop();

    if (!selectionResult.success) {
      console.log(chalk.yellow(`  ${selectionResult.error}`));
      console.log(chalk.yellow('  Using first search result as fallback...'));
      selectionResult.imageIndex = 0;
    }

    const selectedPhoto = searchResult.results[selectionResult.imageIndex];

    console.log(chalk.green(`  ✓ Selected: ${selectedPhoto.description || selectedPhoto.alt_description || 'Image'}`));
    console.log(chalk.gray(`    By ${selectedPhoto.user.name} on Unsplash`));

    // Trigger download tracking (required by Unsplash)
    await triggerDownload(selectedPhoto.links.download_location);

    selectedImages.push({
      position: placement.position,
      url: selectedPhoto.urls.regular,
      altText: placement.altText || selectedPhoto.alt_description || selectedPhoto.description,
      credit: `Photo by ${selectedPhoto.user.name} on Unsplash`,
      creditLink: selectedPhoto.user.links.html,
      photographerName: selectedPhoto.user.name,
      unsplashId: selectedPhoto.id,
      downloadLocation: selectedPhoto.links.download_location,
      placeholder: placement.placeholder,
    });
  }

  console.log(chalk.green(`\n✓ Selected ${selectedImages.length} images\n`));

  return {
    featuredImage: selectedImages.find(img => img.position === 'featured') || selectedImages[0],
    inlineImages: selectedImages.filter(img => img.position !== 'featured'),
    allImages: selectedImages,
  };
}

// Use AI to select the best image from search results
async function selectBestImage(images, context, topic) {
  const prompt = IMAGE_SELECTION_PROMPT(images, context, topic);

  const result = await callClaude(prompt, {
    maxTokens: 500,
    temperature: 0.5,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      imageIndex: 0,
    };
  }

  try {
    // Remove markdown code blocks if present
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }
    const selection = JSON.parse(jsonContent);
    const imageIndex = selection.imageNumber - 1; // Convert 1-based to 0-based

    if (imageIndex < 0 || imageIndex >= images.length) {
      return {
        success: false,
        error: 'Invalid image selection',
        imageIndex: 0,
      };
    }

    return {
      success: true,
      imageIndex,
      reason: selection.reason,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Could not parse image selection',
      imageIndex: 0,
    };
  }
}

// Get text context around image placement
function getContextAroundPlacement(content, placement) {
  if (!placement.placeholder) {
    return content.substring(0, 500);
  }

  const placeholderIndex = content.indexOf(placement.placeholder);

  if (placeholderIndex === -1) {
    return content.substring(0, 500);
  }

  // Get 250 chars before and after the placeholder
  const start = Math.max(0, placeholderIndex - 250);
  const end = Math.min(content.length, placeholderIndex + 250);

  return content.substring(start, end);
}

// Replace image placeholders in content with actual HTML
export function replaceImagePlaceholders(content, images) {
  let updatedContent = content;

  for (const image of images) {
    if (image.placeholder && image.position !== 'featured') {
      const imageHtml = `
<figure class="wp-block-image">
  <img src="${image.url}" alt="${image.altText}" />
  <figcaption>${image.credit} - <a href="${image.creditLink}" target="_blank" rel="noopener">View on Unsplash</a></figcaption>
</figure>`;

      updatedContent = updatedContent.replace(image.placeholder, imageHtml);
    }
  }

  // Remove any remaining image placeholders
  updatedContent = updatedContent.replace(/\[IMAGE:\s*[^\]]+\]/g, '');

  return updatedContent;
}
