import chalk from 'chalk';
import ora from 'ora';
import * as unsplash from './utils/unsplash.js';
import * as pexels from './utils/pexels.js';
import { callClaude } from './utils/anthropic.js';
import { IMAGE_SELECTION_PROMPT } from './utils/prompts.js';

// Get featured image candidates for user selection
export async function getFeaturedImageCandidates(article, brief, imageSource = 'unsplash') {
  const sourceName = imageSource === 'pexels' ? 'Pexels' : 'Unsplash';
  console.log(chalk.cyan(`\n🖼️  Finding featured image candidates from ${sourceName}...\n`));

  const featuredPlacement = article.imagePlacements.find(p => p.position === 'featured');

  if (!featuredPlacement) {
    return { success: false, error: 'No featured image placement found' };
  }

  console.log(chalk.white(`  Query: "${featuredPlacement.searchQuery}"`));

  const spinner = ora(`Searching ${sourceName}...`).start();

  // Choose API based on imageSource
  const api = imageSource === 'pexels' ? pexels : unsplash;
  const searchResult = await api.searchPhotos(featuredPlacement.searchQuery, {
    perPage: 6,
    orientation: 'landscape',
  });

  spinner.stop();

  if (!searchResult.success) {
    return { success: false, error: searchResult.error };
  }

  if (searchResult.results.length === 0) {
    return { success: false, error: 'No images found' };
  }

  const candidates = searchResult.results.map(photo => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.thumb || photo.urls.small,
    altText: featuredPlacement.altText || photo.alt_description || photo.description,
    description: photo.description || photo.alt_description || 'No description',
    credit: `Photo by ${photo.user.name} on ${sourceName}`,
    creditLink: photo.user.links.html,
    photographerName: photo.user.name,
    downloadLocation: photo.links?.download_location,
    source: imageSource,
  }));

  console.log(chalk.green(`\n✓ Found ${candidates.length} featured image candidates\n`));

  return {
    success: true,
    candidates,
    placement: featuredPlacement,
    source: imageSource,
  };
}

// Select images for article (with user-selected featured image)
export async function selectImages(article, brief, selectedFeaturedId = null, imageSource = 'unsplash') {
  const sourceName = imageSource === 'pexels' ? 'Pexels' : 'Unsplash';
  console.log(chalk.cyan(`\n🖼️  Finding images for your article from ${sourceName}...\n`));
  console.log(chalk.gray('[ImageSelector] Debug: article.imagePlacements:', JSON.stringify(article.imagePlacements, null, 2)));

  const selectedImages = [];
  const usedImageIds = new Set(); // Track used image IDs to prevent duplicates

  // Choose API based on imageSource
  const api = imageSource === 'pexels' ? pexels : unsplash;

  for (let i = 0; i < article.imagePlacements.length; i++) {
    const placement = article.imagePlacements[i];
    console.log(chalk.gray(`[ImageSelector] Debug: Processing placement ${i}:`, JSON.stringify(placement, null, 2)));

    console.log(chalk.yellow(`\nSearching for image ${i + 1}/${article.imagePlacements.length}:`));
    console.log(chalk.white(`  Query: "${placement.searchQuery}"`));

    const spinner = ora(`Searching ${sourceName}...`).start();

    // Search using selected API
    const searchResult = await api.searchPhotos(placement.searchQuery, {
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

    let selectedPhoto;
    let selectionResult = { imageIndex: 0 };

    // If this is the featured image and user has selected one, use it
    if (placement.position === 'featured' && selectedFeaturedId) {
      selectedPhoto = searchResult.results.find(photo => photo.id === selectedFeaturedId);
      if (selectedPhoto) {
        spinner.succeed(chalk.green('Using your selected featured image'));
        // Find the index of the selected photo
        selectionResult.imageIndex = searchResult.results.findIndex(photo => photo.id === selectedFeaturedId);
      } else {
        spinner.text = 'Analyzing images with AI...';
      }
    }

    // If not featured or not found, use AI selection
    if (!selectedPhoto) {
      spinner.text = 'Analyzing images with AI...';

      // Get context around the image placement
      const context = getContextAroundPlacement(article.content, placement);

      // Use Claude to select the best image
      selectionResult = await selectBestImage(
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

      selectedPhoto = searchResult.results[selectionResult.imageIndex];
    }

    // Check for duplicates and pick a different image if needed
    let attempts = 0;
    while (usedImageIds.has(selectedPhoto.id) && attempts < searchResult.results.length) {
      console.log(chalk.yellow(`  ⚠️  Image already used, selecting alternative...`));
      attempts++;
      // Try the next image in the results
      const nextIndex = (selectionResult.imageIndex + attempts) % searchResult.results.length;
      selectedPhoto = searchResult.results[nextIndex];
    }

    // If all images have been used (unlikely but possible), use it anyway
    if (usedImageIds.has(selectedPhoto.id)) {
      console.log(chalk.yellow(`  ⚠️  All available images used, allowing duplicate`));
    }

    // Mark this image as used
    usedImageIds.add(selectedPhoto.id);

    console.log(chalk.green(`  ✓ Selected: ${selectedPhoto.description || selectedPhoto.alt_description || 'Image'}`));
    console.log(chalk.gray(`    By ${selectedPhoto.user.name} on ${sourceName}`));

    // Trigger download tracking (required by Unsplash only)
    if (imageSource === 'unsplash' && selectedPhoto.links?.download_location) {
      await unsplash.triggerDownload(selectedPhoto.links.download_location);
    }

    selectedImages.push({
      position: placement.position,
      url: selectedPhoto.urls.regular,
      altText: placement.altText || selectedPhoto.alt_description || selectedPhoto.description,
      credit: `Photo by ${selectedPhoto.user.name} on ${sourceName}`,
      creditLink: selectedPhoto.user.links.html,
      photographerName: selectedPhoto.user.name,
      imageId: selectedPhoto.id,
      downloadLocation: selectedPhoto.links?.download_location,
      placeholder: placement.placeholder,
      source: imageSource,
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
      const sourceName = image.source === 'pexels' ? 'Pexels' : 'Unsplash';
      const imageHtml = `
<figure class="wp-block-image">
  <img src="${image.url}" alt="${image.altText}" />
  <figcaption>${image.credit} - <a href="${image.creditLink}" target="_blank" rel="noopener">View on ${sourceName}</a></figcaption>
</figure>`;

      updatedContent = updatedContent.replace(image.placeholder, imageHtml);
    }
  }

  // Remove any remaining image placeholders
  updatedContent = updatedContent.replace(/\[IMAGE:\s*[^\]]+\]/g, '');

  return updatedContent;
}
