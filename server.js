import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { generateArticle } from './src/articleWriter.js';
import { generateOutline } from './src/outlineGenerator.js';
import { selectImages, getFeaturedImageCandidates } from './src/imageSelector.js';
import { createDraft } from './src/wordpressPublisher.js';
import { callClaude } from './src/utils/anthropic.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 12800;

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

// Load users configuration
function loadUsers() {
  const usersPath = path.join(__dirname, 'users.json');
  return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
}

// Save users configuration
function saveUsers(data) {
  const usersPath = path.join(__dirname, 'users.json');
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));
}

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Super admin middleware
const requireSuperAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'super_admin') {
    return next();
  }
  res.status(403).json({ error: 'Forbidden: Super admin access required' });
};

// Admin or super admin middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && (req.session.user.role === 'super_admin' || req.session.user.role === 'admin')) {
    return next();
  }
  res.status(403).json({ error: 'Forbidden: Admin access required' });
};

// Check if user has access to a specific blog
function canAccessBlog(user, blogId) {
  // Super admin has access to all blogs
  if (user.role === 'super_admin') {
    return true;
  }

  // Admin has access to all blogs
  if (user.role === 'admin') {
    return true;
  }

  // Regular users can only access assigned blogs
  return user.assignedBlogs && user.assignedBlogs.includes(blogId);
}

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
  const { username, password } = req.body;

  const users = loadUsers();
  const user = users.users.find(u => u.username === username && u.password === password);

  if (user) {
    // Don't store password in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      assignedBlogs: user.assignedBlogs || []
    };
    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
app.get('/api/auth-status', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.user.username,
        role: req.session.user.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get all blogs (filtered by user permissions)
app.get('/api/blogs', requireAuth, (req, res) => {
  const blogs = loadBlogs();
  const user = req.session.user;

  // Filter blogs based on user permissions
  let userBlogs = blogs.blogs;
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    userBlogs = blogs.blogs.filter(blog => canAccessBlog(user, blog.id));
  }

  // Don't send passwords to frontend
  const safeBlogsList = userBlogs.map(blog => ({
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

// Add new blog (admin or super_admin only)
app.post('/api/blogs', requireAdmin, (req, res) => {
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

// Update blog (admin or super_admin only)
app.put('/api/blogs/:id', requireAdmin, (req, res) => {
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

// Delete blog (admin or super_admin only)
app.delete('/api/blogs/:id', requireAdmin, (req, res) => {
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

  console.log('[API] Debug: Received outline:', outline ? 'exists' : 'NULL');
  console.log('[API] Debug: Received brief:', brief ? 'exists' : 'NULL');
  if (outline) {
    console.log('[API] Debug: outline.headline:', outline.headline);
  }

  const blogs = loadBlogs();
  const blog = blogs.blogs.find(b => b.id === blogId);

  if (!blog) {
    return res.status(404).json({ error: 'Blog not found' });
  }

  if (!outline) {
    return res.status(400).json({ error: 'Outline is required. Please generate an outline first.' });
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

// Get featured image candidates
app.post('/api/featured-candidates', requireAuth, async (req, res) => {
  const { article, brief } = req.body;

  try {
    console.log('[API] Getting featured image candidates...');
    const result = await getFeaturedImageCandidates(article, brief);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    console.log('[API] Featured image candidates retrieved successfully');
    res.json({ candidates: result.candidates });
  } catch (error) {
    console.error('[API] Featured image candidates error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload user images
app.post('/api/upload-images', requireAuth, upload.fields([
  { name: 'featuredImage', maxCount: 1 },
  { name: 'inlineImages', maxCount: 10 }
]), (req, res) => {
  try {
    console.log('[API] Processing uploaded images...');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const allImages = [];
    let featuredImage = null;
    const inlineImages = [];

    // Process featured image
    if (req.files.featuredImage && req.files.featuredImage[0]) {
      const file = req.files.featuredImage[0];
      featuredImage = {
        position: 'featured',
        url: `${baseUrl}/uploads/${file.filename}`,
        altText: file.originalname.replace(/\.[^/.]+$/, ""),
        credit: 'Uploaded by user',
        creditLink: '',
        photographerName: 'User',
        localPath: file.path
      };
      allImages.push(featuredImage);
    }

    // Process inline images
    if (req.files.inlineImages) {
      req.files.inlineImages.forEach((file, index) => {
        const imageData = {
          position: `inline-${index + 1}`,
          url: `${baseUrl}/uploads/${file.filename}`,
          altText: file.originalname.replace(/\.[^/.]+$/, ""),
          credit: 'Uploaded by user',
          creditLink: '',
          photographerName: 'User',
          localPath: file.path,
          placeholder: `[IMAGE:inline-${index + 1}]`
        };
        inlineImages.push(imageData);
        allImages.push(imageData);
      });
    }

    console.log('[API] Images uploaded successfully');

    res.json({
      images: {
        featuredImage,
        inlineImages,
        allImages
      }
    });
  } catch (error) {
    console.error('[API] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Select images
app.post('/api/images', requireAuth, async (req, res) => {
  const { article, brief, selectedFeaturedId } = req.body;

  try {
    console.log('[API] Selecting images...');
    const images = await selectImages(article, brief, selectedFeaturedId);
    console.log('[API] Images selected successfully');
    res.json({ images });
  } catch (error) {
    console.error('[API] Image selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish to WordPress
app.post('/api/publish', requireAuth, async (req, res) => {
  const { blogId, article, images, publishStatus = 'draft', scheduleDate = null } = req.body;

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
    const result = await createDraft(article, images, { publishStatus, scheduleDate });
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

// ========== USER MANAGEMENT ROUTES (Super Admin Only) ==========

// Get all users
app.get('/api/users', requireSuperAdmin, (req, res) => {
  const users = loadUsers();
  // Don't send passwords to frontend
  const safeUsersList = users.users.map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    assignedBlogs: user.assignedBlogs || [],
    createdAt: user.createdAt
  }));
  res.json(safeUsersList);
});

// Add new user
app.post('/api/users', requireSuperAdmin, (req, res) => {
  const users = loadUsers();
  const newUser = {
    id: `user_${Date.now()}`,
    username: req.body.username,
    password: req.body.password,
    role: req.body.role || 'user',
    assignedBlogs: req.body.assignedBlogs || [],
    createdAt: new Date().toISOString()
  };

  // Check if username already exists
  if (users.users.find(u => u.username === newUser.username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  users.users.push(newUser);
  saveUsers(users);

  res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      assignedBlogs: newUser.assignedBlogs
    }
  });
});

// Update user
app.put('/api/users/:id', requireSuperAdmin, (req, res) => {
  const users = loadUsers();
  const index = users.users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Don't allow changing super admin role
  if (users.users[index].role === 'super_admin' && req.body.role !== 'super_admin') {
    return res.status(403).json({ error: 'Cannot demote super admin' });
  }

  users.users[index] = {
    ...users.users[index],
    username: req.body.username || users.users[index].username,
    password: req.body.password || users.users[index].password,
    role: req.body.role || users.users[index].role,
    assignedBlogs: req.body.assignedBlogs !== undefined ? req.body.assignedBlogs : users.users[index].assignedBlogs
  };

  saveUsers(users);
  res.json({ success: true, user: {
    id: users.users[index].id,
    username: users.users[index].username,
    role: users.users[index].role,
    assignedBlogs: users.users[index].assignedBlogs
  }});
});

// Delete user
app.delete('/api/users/:id', requireSuperAdmin, (req, res) => {
  const users = loadUsers();
  const user = users.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Don't allow deleting super admin
  if (user.role === 'super_admin') {
    return res.status(403).json({ error: 'Cannot delete super admin' });
  }

  users.users = users.users.filter(u => u.id !== req.params.id);
  saveUsers(users);
  res.json({ success: true });
});

// Check if blog management is allowed (admin or super_admin)
app.get('/api/can-manage-blogs', requireAuth, (req, res) => {
  const user = req.session.user;
  res.json({
    canManage: user.role === 'super_admin' || user.role === 'admin'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✍️  The Blogger running on http://localhost:${PORT}`);
  console.log(`📝 Multi-blog content management with style`);
  console.log(`🔒 Secure user authentication`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
