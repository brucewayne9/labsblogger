import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { callClaude } from './utils/anthropic.js';
import { ARTICLE_WRITING_PROMPT } from './utils/prompts.js';

// Load brand voice configuration
function loadBrandVoice() {
  const brandVoicePath = path.join(process.cwd(), 'config', 'brand-voice.json');
  return JSON.parse(fs.readFileSync(brandVoicePath, 'utf8'));
}

// Extract image placements from content
function extractImagePlacementsFromContent(content) {
  const imagePlacementRegex = /\[IMAGE:\s*([^\]]+)\]/g;
  const placements = [];
  let match;

  while ((match = imagePlacementRegex.exec(content)) !== null) {
    const description = match[1].trim();
    placements.push({
      position: placements.length === 0 ? 'featured' : `inline-${placements.length}`,
      searchQuery: description,
      altText: description,
      placeholder: match[0],
    });
  }

  return placements;
}

// Validate SEO requirements
function validateSEO(article, brief) {
  const issues = [];
  const text = stripHtml(article.content).toLowerCase();
  const title = article.title.toLowerCase();

  // Check title length
  if (article.title.length > 60) {
    issues.push(`Title too long (${article.title.length} chars, should be ≤60)`);
  }

  // Check meta description
  if (!article.excerpt || article.excerpt.length < 140 || article.excerpt.length > 155) {
    issues.push(`Meta description should be 140-155 chars (currently ${article.excerpt?.length || 0})`);
  }

  // Check for H2 headings
  const h2Count = (article.content.match(/<h2/gi) || []).length;
  if (h2Count < 3) {
    issues.push(`Only ${h2Count} H2 headings found (recommend at least 3 for SEO)`);
  }

  // Check word count
  const wordCount = countWords(article.content);
  if (wordCount < 850) {
    issues.push(`Article is only ${wordCount} words (minimum required: 850)`);
  } else if (wordCount < 1000) {
    issues.push(`Article is ${wordCount} words (recommend 1000+ for better SEO)`);
  }

  // Display SEO validation results
  if (issues.length > 0) {
    console.log(chalk.yellow('\n⚠️  SEO Recommendations:'));
    issues.forEach(issue => {
      console.log(chalk.yellow(`  • ${issue}`));
    });
  } else {
    console.log(chalk.green('\n✓ SEO validation passed!'));
  }

  return issues;
}

// Generate article from outline
export async function generateArticle(outline, brief) {
  const brandVoice = loadBrandVoice();

  console.log(chalk.cyan('\n✍️  Writing full article...\n'));
  console.log(chalk.yellow('This may take a minute or two...'));

  const spinner = ora('Claude is writing your article...').start();

  const prompt = ARTICLE_WRITING_PROMPT(outline, brief, brandVoice);
  const result = await callClaude(prompt, {
    maxTokens: 4000,
    temperature: 0.7,
  });

  spinner.stop();

  if (!result.success) {
    console.log(chalk.red(`\nError: ${result.error}`));
    return null;
  }

  let article;
  try {
    // Remove markdown code blocks if present
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
    }

    // Try to parse the JSON response
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      article = JSON.parse(jsonMatch[0]);
    } else {
      article = JSON.parse(jsonContent);
    }
  } catch (error) {
    console.log(chalk.red('\nError: Could not parse article from Claude\'s response.'));
    console.log(chalk.yellow('Attempting to extract content manually...'));

    // Fallback: try to extract content manually
    article = {
      title: outline.headline,
      content: result.content,
      excerpt: brief.topic.substring(0, 155),
      seoKeywords: [],
      categories: [],
      tags: [],
      imagePlacements: [],
    };
  }

  // Extract image placements from content if not already provided
  if (!article.imagePlacements || article.imagePlacements.length === 0) {
    article.imagePlacements = extractImagePlacementsFromContent(article.content);
  } else {
    // If AI provided imagePlacements but without placeholders, we need to insert markers
    // Find H2 tags to insert image markers after them
    const h2Regex = /<h2[^>]*>.*?<\/h2>/gi;
    const h2Matches = article.content.match(h2Regex) || [];

    let inlineImageIndex = 0;
    for (let i = 0; i < article.imagePlacements.length; i++) {
      const placement = article.imagePlacements[i];

      // Skip featured image (no placeholder needed in content)
      if (placement.position === 'featured') {
        placement.placeholder = null;
        continue;
      }

      // Create placeholder for inline images
      if (!placement.placeholder && inlineImageIndex < h2Matches.length) {
        const placeholder = `[IMAGE: ${placement.searchQuery || placement.altText}]`;
        const h2Tag = h2Matches[inlineImageIndex];

        // Insert placeholder after the H2 tag
        article.content = article.content.replace(
          h2Tag,
          `${h2Tag}\n${placeholder}\n`
        );

        placement.placeholder = placeholder;
        inlineImageIndex++;
      }
    }
  }

  // Ensure minimum 4 images (1 featured + 3 inline)
  const minImages = parseInt(process.env.MIN_IMAGES_PER_POST) || 4;

  if (article.imagePlacements.length < minImages) {
    console.log(chalk.yellow(`\n⚠️  Only ${article.imagePlacements.length} images found. Adding more to meet minimum of ${minImages}...`));

    // Add featured image if missing
    if (!article.imagePlacements.find(img => img.position === 'featured')) {
      article.imagePlacements.unshift({
        position: 'featured',
        searchQuery: `${brief.topic} business professional`,
        altText: `${brief.topic} - professional business setting`,
        placeholder: null,
      });
    }

    // Add additional inline images to meet minimum
    // Insert them into the content at strategic points (after H2 tags)
    const additionalImagesNeeded = minImages - article.imagePlacements.length;
    const imageTopics = [
      `${brief.audience} using technology`,
      `small business customer service`,
      `professional ${brief.topic.split(' ')[0]} solution`,
      `AI assistant helping business owner`,
      `happy customer interaction`,
    ];

    // Find H2 tags in content to insert images after them
    const h2Regex = /<h2[^>]*>.*?<\/h2>/gi;
    const h2Matches = article.content.match(h2Regex) || [];

    for (let i = 0; i < additionalImagesNeeded && i < h2Matches.length; i++) {
      const h2Tag = h2Matches[i];
      const searchQuery = imageTopics[i % imageTopics.length];
      const placeholder = `[IMAGE: ${searchQuery}]`;

      // Insert placeholder after the H2 tag
      article.content = article.content.replace(
        h2Tag,
        `${h2Tag}\n${placeholder}\n`
      );

      article.imagePlacements.push({
        position: `inline-${article.imagePlacements.length}`,
        searchQuery: searchQuery,
        altText: searchQuery,
        placeholder: placeholder,
      });
    }

    // If still need more images and no more H2s, add to end of content
    const stillNeeded = minImages - article.imagePlacements.length;
    if (stillNeeded > 0) {
      for (let i = 0; i < stillNeeded; i++) {
        const searchQuery = imageTopics[(additionalImagesNeeded - stillNeeded + i) % imageTopics.length];
        const placeholder = `[IMAGE: ${searchQuery}]`;

        // Add before conclusion or at end
        if (article.content.includes('<h2>Conclusion</h2>') || article.content.includes('<h2>conclusion</h2>')) {
          article.content = article.content.replace(
            /<h2>(?:C|c)onclusion<\/h2>/,
            `${placeholder}\n<h2>Conclusion</h2>`
          );
        } else {
          article.content = article.content.replace(
            /<\/article>|$/,
            `\n${placeholder}\n</article>`
          );
        }

        article.imagePlacements.push({
          position: `inline-${article.imagePlacements.length}`,
          searchQuery: searchQuery,
          altText: searchQuery,
          placeholder: placeholder,
        });
      }
    }

    console.log(chalk.green(`✓ Added ${additionalImagesNeeded} additional images. Total: ${article.imagePlacements.length}`));
  }

  // Validate SEO requirements
  validateSEO(article, brief);

  // Display summary
  console.log(chalk.green('\n✓ Article written successfully!\n'));
  console.log(chalk.bold('Article Summary:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.white(`Title: ${article.title}`));
  console.log(chalk.white(`Title Length: ${article.title.length} chars ${article.title.length <= 60 ? '✓' : '⚠️'}`));
  console.log(chalk.white(`Word Count: ~${countWords(article.content)} words`));
  console.log(chalk.white(`Excerpt: ${article.excerpt}`));
  console.log(chalk.white(`Excerpt Length: ${article.excerpt.length} chars ${article.excerpt.length >= 140 && article.excerpt.length <= 155 ? '✓' : '⚠️'}`));

  if (article.seoKeywords && article.seoKeywords.length > 0) {
    console.log(chalk.white(`SEO Keywords: ${article.seoKeywords.join(', ')}`));
  }

  if (article.categories && article.categories.length > 0) {
    console.log(chalk.white(`Categories: ${article.categories.join(', ')}`));
  }

  if (article.tags && article.tags.length > 0) {
    console.log(chalk.white(`Tags: ${article.tags.join(', ')}`));
  }

  console.log(chalk.white(`Image Placements: ${article.imagePlacements.length}`));
  console.log(chalk.gray('─'.repeat(60)));

  // Show preview of content
  console.log(chalk.cyan('\nContent Preview (first 400 chars):'));
  const preview = stripHtml(article.content).substring(0, 400);
  console.log(chalk.white(preview + '...\n'));

  console.log(chalk.gray('[ArticleWriter] Debug: Final article.imagePlacements:', JSON.stringify(article.imagePlacements, null, 2)));

  return article;
}

// Count words in HTML content
function countWords(html) {
  const text = stripHtml(html);
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Strip HTML tags from content
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Save article to JSON file for backup/review
export function saveArticleToFile(article, brief) {
  const outputDir = path.join(process.cwd(), 'output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `article-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  const data = {
    article,
    brief,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  console.log(chalk.gray(`\n💾 Article saved to: ${filepath}`));

  return filepath;
}
