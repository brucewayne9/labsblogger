import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArticle } from './src/articleWriter.js';
import { generateOutline } from './src/outlineGenerator.js';
import { selectImages } from './src/imageSelector.js';
import { createDraft } from './src/wordpressPublisher.js';
import { callClaude } from './src/utils/anthropic.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 12800;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'blog-manager-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Load blogs configuration
function loadBlogs() {
  const blogsPath = path.join(__dirname, 'blogs.json');
  return JSON.parse(fs.readFileSync(blogsPath, 'utf8'));
}

// Save blogs configuration
function saveBlogs(data) {
  const blogsPath = path.join(__dirname, 'blogs.json');
  fs.writeFileSync(blogsPath, JSON.stringify(data, null, 2));
}

// Routes

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.APP_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth-status', (req, res) => {
  res.json({ authenticated: req.session && req.session.authenticated });
});

// Get all blogs
app.get('/api/blogs', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  // Don't send passwords to frontend
  const safeBlogsList = blogs.blogs.map(blog => ({
    id: blog.id,
    name: blog.name,
    url: blog.url,
    description: blog.description,
    categories: blog.categories
  }));
  res.json(safeBlogsList);
});

// Get specific blog
app.get('/api/blogs/:id', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  const blog = blogs.blogs.find(b => b.id === req.params.id);

  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  res.json(blog);
});

// Add new blog
app.post('/api/blogs', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  const newBlog = {
    id: req.body.name.toLowerCase().replace(/\s+/g, '-'),
    name: req.body.name,
    url: req.body.url,
    username: req.body.username,
    appPassword: req.body.appPassword,
    description: req.body.description || '',
    categories: req.body.categories || [],
    brandVoice: {
      tone: req.body.tone || 'professional',
      keywords: req.body.keywords || [],
      cta: req.body.cta || ''
    }
  };

  blogs.blogs.push(newBlog);
  saveBlogs(blogs);

  res.json({ success: true, blog: newBlog });
});

// Update blog
app.put('/api/blogs/:id', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  const index = blogs.blogs.findIndex(b => b.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  blogs.blogs[index] = {
    ...blogs.blogs[index],
    ...req.body,
    id: blogs.blogs[index].id // Preserve ID
  };

  saveBlogs(blogs);
  res.json({ success: true, blog: blogs.blogs[index] });
});

// Delete blog
app.delete('/api/blogs/:id', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  blogs.blogs = blogs.blogs.filter(b => b.id !== req.params.id);
  saveBlogs(blogs);
  res.json({ success: true });
});

// Generate clarification questions
app.post('/api/brainstorm', requireAuth, async (req, res) => {
  const { topic, angle, audience, tone } = req.body;

  const prompt = `You are a blog planning assistant. The user wants to write about:
- Topic: ${topic}
- Angle: ${angle}
- Audience: ${audience}
- Tone: ${tone}

Ask 2-3 thoughtful follow-up questions to refine the direction.
Format as JSON array: ["Question 1?", "Question 2?"]`;

  const result = await callClaude(prompt, { maxTokens: 500 });

  if (result.success) {
    try {
      let content = result.content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const questions = JSON.parse(content);
      res.json({ questions });
    } catch (error) {
      res.json({ questions: [] });
    }
  } else {
    res.json({ questions: [] });
  }
});

// Generate outline
app.post('/api/outline', requireAuth, async (req, res) => {
  const { blogId, brief } = req.body;

  const blogs = loadBlogs();
  const blog = blogs.blogs.find(b => b.id === blogId);

  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  // Set environment for this blog
  process.env.WORDPRESS_URL = blog.url;
  process.env.WORDPRESS_USERNAME = blog.username;
  process.env.WORDPRESS_APP_PASSWORD = blog.appPassword;

  try {
    const outline = await generateOutlineAPI(brief, blog.brandVoice);
    res.json({ outline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate article
app.post('/api/article', requireAuth, async (req, res) => {
  const { blogId, outline, brief } = req.body;

  const blogs = loadBlogs();
  const blog = blogs.blogs.find(b => b.id === blogId);

  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  try {
    console.log('[API] Generating article...');
    const article = await generateArticle(outline, brief);
    console.log('[API] Article generated successfully');
    res.json({ article });
  } catch (error) {
    console.error('[API] Article generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Select images
app.post('/api/images', requireAuth, async (req, res) => {
  const { article, brief } = req.body;

  try {
    console.log('[API] Selecting images...');
    const images = await selectImages(article, brief);
    console.log('[API] Images selected successfully');
    res.json({ images });
  } catch (error) {
    console.error('[API] Image selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish to WordPress
app.post('/api/publish', requireAuth, async (req, res) => {
  const { blogId, article, images } = req.body;

  const blogs = loadBlogs();
  const blog = blogs.blogs.find(b => b.id === blogId);

  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  // Set environment for this blog
  process.env.WORDPRESS_URL = blog.url;
  process.env.WORDPRESS_USERNAME = blog.username;
  process.env.WORDPRESS_APP_PASSWORD = blog.appPassword;

  try {
    const result = await createDraft(article, images);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate outline (API version)
async function generateOutlineAPI(brief, brandVoice) {
  const prompt = `You are a blog content strategist.

Create a detailed outline for a blog post with these parameters:
- Topic: ${brief.topic}
- Angle: ${brief.angle}
- Target Audience: ${brief.audience}
- Tone: ${brief.tone}
- Key Points: ${brief.keyPoints?.join(', ') || 'N/A'}

Brand Voice: ${brandVoice.tone}
Keywords: ${brandVoice.keywords.join(', ')}

Generate a compelling outline with:
1. SEO-friendly headline (under 60 chars)
2. Three alternative headlines
3. Introduction hook (2-3 sentences)
4. 5-7 main sections with bullet points
5. Conclusion approach
6. Call-to-action: ${brandVoice.cta}

Format as JSON:
{
  "headline": "Main headline",
  "alternativeHeadlines": ["Alt 1", "Alt 2", "Alt 3"],
  "introHook": "Hook text",
  "sections": [{"heading": "Section", "points": ["Point 1", "Point 2"]}],
  "conclusion": "Conclusion approach",
  "cta": "CTA text"
}`;

  const result = await callClaude(prompt, { maxTokens: 2000 });

  if (!result.success) {
    throw new Error(result.error);
  }

  let content = result.content.trim();
  if (content.startsWith('```json')) {
    content = content.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
  }

  return JSON.parse(content);
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Blog Manager App running on http://localhost:${PORT}`);
  console.log(`📝 Manage multiple blogs from one interface`);
  console.log(`🔒 Password protected`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
