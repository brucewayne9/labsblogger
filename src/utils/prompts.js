// Prompt templates for Claude API interactions

export const OUTLINE_PROMPT = (brief, brandVoice) => `You are a blog content strategist for Lumabot, a 24/7 digital AI agent service for small businesses.

Create a detailed outline for a blog post with these parameters:
- Topic: ${brief.topic}
- Angle: ${brief.angle}
- Target Audience: ${brief.audience}
- Tone: ${brief.tone}
- Key Points to Cover: ${brief.keyPoints.join(', ')}

Brand Voice Guidelines:
- Empowering small businesses to compete with larger competitors
- Positioning Lumabot as the "Employee of the Year" - always available
- Focus on practical, actionable advice
- Use "David vs Goliath" positioning where relevant
- Avoid overly technical jargon

Values to emphasize: ${brandVoice.values.join(', ')}
Things to avoid: ${brandVoice.avoid.join(', ')}

SEO Requirements for Outline:
- Headline must include primary keyword and be under 60 characters
- Alternative headlines should test different keyword variations
- Section headings (H2) should include relevant keywords naturally
- Structure should support featured snippets (use lists, clear definitions)
- Introduction should hook readers with a problem statement

Generate:
1. A compelling, SEO-friendly headline (60 chars or less)
2. Three alternative headlines
3. An engaging introduction hook (2-3 sentences)
4. 5-7 main section headings with 2-4 bullet points each
5. A conclusion approach that ties back to Lumabot's value
6. A suggested call-to-action

Format your response as valid JSON with this structure:
{
  "headline": "Main headline",
  "alternativeHeadlines": ["Alt 1", "Alt 2", "Alt 3"],
  "introHook": "Introduction hook text",
  "sections": [
    {
      "heading": "Section heading",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "conclusion": "Conclusion approach description",
  "cta": "Suggested call-to-action"
}`;

export const ARTICLE_WRITING_PROMPT = (outline, brief, brandVoice) => `You are a professional blog writer for Lumabot, a 24/7 digital AI agent service for small businesses.

Write a complete, engaging blog post based on this outline:

HEADLINE: ${outline.headline}

INTRODUCTION HOOK: ${outline.introHook}

SECTIONS:
${outline.sections.map((s, i) => `${i + 1}. ${s.heading}\n   - ${s.points.join('\n   - ')}`).join('\n\n')}

CONCLUSION: ${outline.conclusion}

CALL-TO-ACTION: ${outline.cta}

Article Parameters:
- Topic: ${brief.topic}
- Target Audience: ${brief.audience}
- Tone: ${brief.tone}
- Word Count: MINIMUM 850 words (aim for 1000-1500 words)

Brand Voice:
- Values: ${brandVoice.values.join(', ')}
- Keywords to naturally incorporate: ${brandVoice.keywords.join(', ')}
- Tone: ${brandVoice.tone}

SEO REQUIREMENTS (CRITICAL):
- Include focus keyword in title, first paragraph, and at least 2 H2 headings
- Meta description must be compelling and 140-155 characters
- Use LSI (Latent Semantic Indexing) keywords naturally throughout
- Internal linking opportunities (mention "Lumabot features", "customer service solutions")
- Target keyword density: 1-2% (natural, not stuffed)
- Include long-tail keywords related to the topic
- Use schema-friendly semantic HTML markup
- Alt text for all images (keyword-rich but natural)

Writing Guidelines:
- Use proper HTML formatting with semantic tags
- Short paragraphs (2-4 sentences for readability)
- Include H2 for main sections (with keywords), H3 for subsections
- Front-load important information (inverted pyramid style)
- Engaging, conversational style with active voice
- Include 2-3 compelling pull quotes in <blockquote> tags
- Strong transitions between sections using transition words
- Clear, actionable advice with bullet points or numbered lists
- End with the provided CTA
- Aim for Flesch Reading Ease score of 60+ (8th grade level)

Image Placement Instructions (MINIMUM 4 IMAGES REQUIRED):
- CRITICAL: Mark where images should go with: [IMAGE: description for search]
- Place [IMAGE: ...] markers at the BEGINNING of major sections (after H2 headings)
- Include: 1 featured/hero image marker at the very start before intro (REQUIRED)
- Include: AT LEAST 3-4 [IMAGE: ...] markers throughout the body (REQUIRED)
- Distribution: One image marker at the start of each major section
- Example structure:
  [IMAGE: hero image description]
  <intro paragraphs>
  <h2>Section 1</h2>
  [IMAGE: section 1 relevant image]
  <section 1 content>
  <h2>Section 2</h2>
  [IMAGE: section 2 relevant image]
  <section 2 content>
- Each image description should be keyword-relevant and specific

CRITICAL IMAGE PLACEMENT:
- YOU MUST include [IMAGE: description] markers directly in the HTML content
- Place them INSIDE the content field, not just in imagePlacements array
- Example: "<h2>Section Title</h2>\n[IMAGE: relevant image description]\n<p>Paragraph text...</p>"

Format your response as valid JSON:
{
  "title": "Article headline",
  "content": "Full HTML content with [IMAGE: ...] placeholders embedded in the HTML at the beginning of each major section",
  "excerpt": "Meta description (155 chars max)",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "categories": ["Category1", "Category2"],
  "tags": ["tag1", "tag2", "tag3"],
  "imagePlacements": [
    {
      "position": "featured",
      "searchQuery": "description for unsplash search",
      "altText": "alt text for image"
    },
    {
      "position": "inline-1",
      "searchQuery": "section 1 image description",
      "altText": "alt text"
    }
  ]
}

REMEMBER: The content field must contain the actual [IMAGE: ...] text markers where you want images to appear!`;

export const CLARIFICATION_PROMPT = (brief) => `You are a blog planning assistant for Lumabot, a 24/7 digital AI agent for small businesses.

The user wants to write a blog post about:
- Topic: ${brief.topic}
- Angle: ${brief.angle}
- Audience: ${brief.audience}
- Tone: ${brief.tone}

Ask 2-3 thoughtful follow-up questions to refine the direction and make the article more specific and valuable.

Focus on:
- Specific pain points or challenges to highlight
- Whether to focus more on problems or solutions
- Any particular features or benefits to emphasize
- Real-world scenarios or examples to include

Format your response as a simple array of questions:
["Question 1?", "Question 2?", "Question 3?"]`;

export const IMAGE_SELECTION_PROMPT = (images, context, topic) => `You are selecting the best image for a blog post about "${topic}".

Available images (from Unsplash search):
${images.map((img, i) => `${i + 1}. ${img.description || img.alt_description || 'No description'}
   ID: ${img.id}`).join('\n\n')}

Context from article: ${context.substring(0, 300)}...

Pick the BEST image number (1-${images.length}) based on:
1. Relevance to the content
2. Professional quality
3. Appropriate for small business audience
4. Diverse representation when possible
5. Not overly stock-photo looking

Respond with ONLY valid JSON:
{
  "imageNumber": 3,
  "reason": "Brief reason for selection"
}`;

export const SECTION_EDIT_PROMPT = (sectionHeading, sectionPoints, userFeedback) => `You are editing a section of a blog post outline for Lumabot.

Current section:
Heading: ${sectionHeading}
Points:
${sectionPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

User feedback: ${userFeedback}

Generate an improved version of this section based on the feedback.

Respond with valid JSON:
{
  "heading": "Updated heading if needed",
  "points": ["Point 1", "Point 2", "Point 3"]
}`;
