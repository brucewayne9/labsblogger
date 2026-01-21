# The Blogger - AI Blog Manager App

**Multi-user AI blog management system** - Create and publish AI-powered blog posts to WordPress with team collaboration and role-based access.

## Features

- **Multi-User System** - Support for multiple users with role-based access control
  - Super Admin - Full system access
  - Admin - Manage assigned blogs and users
  - Editor - Create and publish blog posts
- **Multi-Blog Support** - Manage unlimited WordPress blogs from one dashboard
- **AI-Powered Content** - Generate 1200+ word SEO-optimized articles with Claude Sonnet 4.5
- **Triple Image Source Options** - Choose AI-selected images from Unsplash OR Pexels, or upload your own custom images
- **5-Step Creation Flow** - Each step on its own dedicated page
  1. Brainstorm (topic, angle, audience, tone)
  2. Review outline
  3. Review generated article
  4. Select/upload images
  5. Publish (draft/immediate/scheduled)
- **WordPress Integration** - Publish directly with scheduling support
- **Session-Based Auth** - Secure authentication with encrypted sessions
- **Responsive Design** - Clean, modern UI with circular progress indicators

## Quick Start

### Prerequisites

- Node.js v18 or higher
- WordPress site(s) with REST API enabled
- Anthropic Claude API key ([Get it here](https://console.anthropic.com/))
- Unsplash API key - Free tier available ([Get it here](https://unsplash.com/developers))
- Pexels API key - Free unlimited requests ([Get it here](https://www.pexels.com/api/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/blog-manager-app.git
   cd "Blog Manager App"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
   PEXELS_API_KEY=your_pexels_api_key_here
   SESSION_SECRET=random_session_secret_here
   PORT=3000
   ```

4. **Create initial data files:**
   ```bash
   echo "[]" > blogs.json
   echo "[]" > users.json
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open in browser:**
   ```
   http://localhost:3000
   ```

## First Time Setup

### 1. Create Super Admin Account

On first launch, you'll be prompted to create the initial super admin user:
- Choose a username
- Set a strong password
- This user has full system access

### 2. Add WordPress Blogs

1. Log in as super admin
2. Click **"⚙️ Manage Blogs"** in the navigation
3. Click **"+ Add New Blog"**
4. Fill in the details:
   - **Blog Name**: Your blog name
   - **WordPress URL**: https://yourblog.com (no trailing slash)
   - **Username**: Your WordPress username
   - **Application Password**: From WordPress (see below)
   - **Description**: Brief description
   - **Categories**: Comma-separated categories
   - **Tone**: Blog tone/voice
   - **Keywords**: SEO keywords
   - **CTA**: Call-to-action text

### 3. Create Additional Users (Optional)

1. Click **"👥 Manage Users"** (super admin only)
2. Click **"+ Add New User"**
3. Set username, password, and role
4. Assign blogs to the user

### Getting WordPress Application Password

1. Log into your WordPress admin panel
2. Go to **Users** → **Profile**
3. Scroll to **"Application Passwords"**
4. Enter name: "The Blogger"
5. Click **"Add New Application Password"**
6. **Copy the password** (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste it in the "Add Blog" form

## Using the App

### Creating a Blog Post

The 5-step workflow takes you through dedicated pages:

1. **Brainstorm** (create-brainstorm.html)
   - Select a blog from the dashboard
   - Enter topic, angle, audience, and tone
   - Brief is saved to proceed to next step

2. **Review Outline** (create-outline.html)
   - AI generates structured article outline
   - Headline, introduction, sections, and CTA
   - Can regenerate if needed

3. **Review Article** (create-article.html)
   - Full 1200+ word article generated
   - View word count and preview
   - SEO-optimized with proper heading structure

4. **Select Images** (create-images.html)
   - **Option A**: AI-selected images from Unsplash (6 candidates)
   - **Option B**: Upload your own (featured + inline images)
   - Preview all images before proceeding

5. **Publish** (create-publish.html)
   - **Save as Draft** - Review in WordPress first
   - **Publish Immediately** - Goes live right away
   - **Schedule for Later** - Pick date/time to publish
   - Clear success message with WordPress links

### Managing Blogs

- **Add Blog**: Click "⚙️ Manage Blogs" → "+ Add New Blog"
- **Edit Blog**: Click "✏️ Edit" next to any blog
- **Delete Blog**: Click "🗑️ Delete" next to any blog

## Configuration

### Environment Variables (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Required |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key | Required |
| `SESSION_SECRET` | Secret for session encryption | Required |
| `PORT` | Server port | 3000 |

### Blog Configuration (`blogs.json`)

Each blog entry includes:
- WordPress credentials
- Brand voice settings
- Categories and keywords
- Call-to-action preferences

**Note:** This file is automatically managed by the admin panel and should not be committed to git (already in `.gitignore`).

## Access from Other Devices

### On Same Network

From any device on your network:

1. Find your computer's IP address:
   ```bash
   ipconfig getifaddr en0  # Mac/Linux
   ```

2. Access from other device:
   ```
   http://YOUR_IP_ADDRESS:12800
   ```

### From Internet (Advanced)

Use ngrok or similar:
```bash
npx ngrok http 12800
```

## Project Structure

```
Blog Manager App/
├── server.js                    # Express server & API endpoints
├── package.json                 # Dependencies
├── .env                         # Configuration (not in git)
├── .gitignore                  # Git ignore rules
├── blogs.json                  # Blog configurations (not in git)
├── users.json                  # User database (not in git)
├── uploads/                    # User-uploaded images (not in git)
├── config/
│   └── brand-voice.json        # Default brand voice
├── public/
│   ├── index.html              # Login & Dashboard
│   ├── admin.html              # Blog management
│   ├── users.html              # User management
│   ├── create-brainstorm.html  # Step 1: Brainstorming
│   ├── create-outline.html     # Step 2: Outline review
│   ├── create-article.html     # Step 3: Article generation
│   ├── create-images.html      # Step 4: Image selection/upload
│   ├── create-publish.html     # Step 5: Publishing options
│   ├── style.css               # Main styles
│   ├── style-improvements.css  # UI enhancements
│   └── logo.png                # App logo
└── src/
    ├── outlineGenerator.js     # Article outline creation
    ├── articleWriter.js        # Full article generation
    ├── imageSelector.js        # AI image selection
    ├── wordpressPublisher.js   # WordPress integration
    └── utils/
        ├── anthropic.js        # Claude API wrapper
        ├── unsplash.js         # Unsplash API wrapper
        └── prompts.js          # AI prompt templates
```

## API Endpoints

### Authentication
- `POST /api/login` - Authenticate user
- `POST /api/logout` - End user session
- `GET /api/auth-status` - Check authentication status
- `GET /api/can-manage-blogs` - Check blog management permission

### User Management
- `GET /api/users` - List all users (super admin only)
- `POST /api/users` - Create new user (super admin only)
- `PUT /api/users/:id` - Update user (super admin only)
- `DELETE /api/users/:id` - Delete user (super admin only)

### Blog Management
- `GET /api/blogs` - List accessible blogs
- `POST /api/blogs` - Add new blog (admin/super admin)
- `PUT /api/blogs/:id` - Update blog (admin/super admin)
- `DELETE /api/blogs/:id` - Delete blog (admin/super admin)

### Content Creation
- `POST /api/outline` - Generate article outline
- `POST /api/article` - Generate full article
- `POST /api/featured-candidates` - Get AI-selected image options
- `POST /api/images` - Process selected images
- `POST /api/upload-images` - Upload custom images
- `POST /api/publish` - Publish to WordPress

## Troubleshooting

### Can't Access the App

- Verify server is running: `npm start`
- Check the URL: `http://localhost:12800`
- Try a different browser or incognito mode

### Login Not Working

- Verify username and password are correct
- Clear browser cookies and sessions
- Try incognito/private window
- Check `users.json` exists and contains user data

### WordPress Publishing Fails

- Check Application Password is correct
- Verify WordPress URL format: `https://example.com` (no trailing slash)
- Test WordPress REST API: `https://yoursite.com/wp-json/wp/v2/posts`
- Check WordPress has REST API enabled

### Images Not Uploading

- Verify Unsplash API key in `.env`
- Check WordPress media uploads are enabled
- Verify file size limits in WordPress

### Article Generation Errors

- Check Anthropic API key is valid and has credits
- Verify `config/brand-voice.json` exists
- Check server console for detailed errors
- Ensure blog configuration has proper brand voice settings

## Security Notes

- **Never commit `.env`** - Contains API keys
- **Never commit `blogs.json`** - Contains WordPress credentials
- **Never commit `users.json`** - Contains user password hashes
- **Never commit `uploads/`** - Contains user-uploaded images
- Use strong passwords for all user accounts
- Use strong WordPress Application Passwords
- User passwords are hashed with bcrypt before storage
- For production: Use HTTPS and set `secure: true` in session config
- Keep dependencies updated: `npm audit fix`

## SEO Features

- **Title Optimization** - 60 characters or less
- **Meta Descriptions** - 140-155 characters
- **Keyword Placement** - Focus keywords in title, headers, first paragraph
- **Proper Heading Structure** - H2/H3 hierarchy
- **Image Alt Text** - SEO-optimized descriptions
- **Word Count** - Minimum 850 words (configurable)
- **Image Distribution** - 4+ images placed throughout article

## Tips for Best Results

1. **Be Specific** - Detailed topics generate better articles
2. **Know Your Audience** - Define target readers clearly
3. **Start with Drafts** - Review in WordPress before publishing
4. **Test Topics** - Try different angles to see what works
5. **Review Articles** - AI is good but always review before publishing
6. **Use Keywords** - Add relevant SEO keywords to blog settings
7. **Consistent Voice** - Set appropriate tone for each blog

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **super_admin** | Full system access, manage all users and blogs, create admins |
| **admin** | Manage assigned blogs, create/edit editors, create blog posts |
| **editor** | Create and publish blog posts for assigned blogs only |

## Tech Stack

- **Backend**: Node.js, Express.js
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Images**: Unsplash API + Pexels API
- **CMS**: WordPress REST API
- **File Uploads**: Multer
- **Auth**: express-session + bcrypt
- **Frontend**: Vanilla JavaScript, CSS
- **Security**: bcrypt password hashing, session encryption

## Detailed Feature Breakdown

### Multi-User System
The app supports complete team collaboration with three role levels:
- **Super Admins** can create other admins, manage all blogs, and have unrestricted access
- **Admins** can manage specific blogs they're assigned to and create editors for those blogs
- **Editors** can only create and publish content for blogs they have access to

Each user has a secure login with bcrypt-hashed passwords and session-based authentication.

### AI Content Generation
Powered by **Claude Sonnet 4.5**, the most advanced AI model from Anthropic:
- Generates SEO-optimized articles (1200-1800 words)
- Creates structured outlines before full article generation
- Maintains consistent brand voice across all content
- Intelligently places images within article flow
- Follows best practices for heading hierarchy (H2, H3)

### Image Management
Three flexible options for sourcing images:
1. **Unsplash API** - Professional photography, 50+ images/hour free
2. **Pexels API** - High-quality stock photos, unlimited requests free
3. **Custom Uploads** - Upload your own images (featured + inline)

AI automatically analyzes articles and selects the most relevant images. Users can toggle between Unsplash and Pexels with a single click.

### WordPress Integration
Direct integration with WordPress REST API:
- Create drafts for review before publishing
- Publish immediately to go live instantly
- Schedule posts for future publication
- Automatic image upload to WordPress media library
- Proper attribution for stock photos in captions

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Login &    │  │  Blog Create │  │    Admin     │      │
│  │  Dashboard   │  │   Workflow   │  │    Panels    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/JSON
┌───────────────────────────┴─────────────────────────────────┐
│                    Express.js Server (Node.js)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authentication Middleware (express-session + bcrypt)  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   User   │  │   Blog   │  │ Content  │  │  Image   │   │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────┬──────────┬──────────┬──────────┬────────────────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Local   │ │ Claude   │ │WordPress │ │ Unsplash │
│   JSON   │ │   API    │ │   REST   │ │  Pexels  │
│  Storage │ │ (Sonnet) │ │   API    │ │   APIs   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Data Flow

1. **User Authentication** → Session stored in memory, user data in `users.json`
2. **Blog Creation Workflow**:
   - Step 1: User inputs topic/angle/audience → Stored in sessionStorage
   - Step 2: Claude generates outline → Displayed for review
   - Step 3: Claude generates full article → Preview shown
   - Step 4: Images selected from Unsplash/Pexels or uploaded
   - Step 5: Article + images published to WordPress
3. **WordPress Publishing**:
   - Images uploaded to WordPress media library
   - Article content with embedded images created
   - Post status set (draft/publish/scheduled)

## API Integration Details

### Anthropic Claude API
- **Model**: claude-sonnet-4-5-20250514
- **Purpose**: Content generation (outlines, articles, image selection)
- **Rate Limits**: Varies by plan (check Anthropic console)
- **Cost**: Pay-per-token (see Anthropic pricing)

### Unsplash API
- **Free Tier**: 50 requests/hour
- **Purpose**: Stock photography search and download
- **Attribution**: Required (automatically added to captions)
- **Image Quality**: High-resolution professional photos

### Pexels API
- **Free Tier**: Unlimited requests (with proper attribution)
- **Purpose**: Stock photography search and download
- **Attribution**: Optional but recommended
- **Image Quality**: High-resolution professional photos

### WordPress REST API
- **Authentication**: Application Password (recommended) or Basic Auth
- **Endpoints Used**:
  - `POST /wp-json/wp/v2/posts` - Create/update posts
  - `POST /wp-json/wp/v2/media` - Upload images
  - `GET /wp-json/wp/v2/categories` - Fetch categories
  - `GET /wp-json/wp/v2/tags` - Fetch tags

## Deployment Guide

### Development
```bash
npm start
```
Runs on `http://localhost:3000` (or your configured PORT)

### Production Deployment

#### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)
```bash
# Install Node.js v18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/brucewayne9/labsblogger.git
cd labsblogger
npm install --production

# Set up environment
cp .env.example .env
nano .env  # Add your API keys

# Initialize data files
echo "[]" > blogs.json
echo "[]" > users.json

# Use PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name "blog-manager"
pm2 startup
pm2 save

# Setup nginx reverse proxy (optional but recommended)
sudo apt install nginx
# Configure nginx to proxy port 3000
```

#### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t blog-manager .
docker run -p 3000:3000 --env-file .env -v $(pwd)/blogs.json:/app/blogs.json -v $(pwd)/users.json:/app/users.json blog-manager
```

#### Option 3: Heroku
```bash
# Create Heroku app
heroku create your-blog-manager

# Set environment variables
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set UNSPLASH_ACCESS_KEY=your_key
heroku config:set PEXELS_API_KEY=your_key
heroku config:set SESSION_SECRET=random_secret

# Deploy
git push heroku main
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=long_random_secure_string_here
ANTHROPIC_API_KEY=your_key
UNSPLASH_ACCESS_KEY=your_key
PEXELS_API_KEY=your_key
```

## Performance & Scaling

### Performance Optimization Tips
1. **Session Store**: In production, use Redis for session storage instead of in-memory
   ```javascript
   const RedisStore = require('connect-redis')(session);
   app.use(session({
     store: new RedisStore({ client: redisClient }),
     // ...
   }));
   ```

2. **Image Caching**: Cache image search results to reduce API calls
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Database Migration**: Consider migrating from JSON files to MongoDB/PostgreSQL for better performance at scale

### Scaling Considerations
- **Current**: Single-server architecture, suitable for small teams (1-20 users)
- **Medium Scale (20-100 users)**: Add load balancer, use Redis for sessions, separate database server
- **Large Scale (100+ users)**: Containerize with Kubernetes, use managed databases, implement caching layer

## Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt
- Session-based authentication
- Environment variables for secrets
- .gitignore prevents committing sensitive data
- WordPress Application Passwords (more secure than passwords)

⚠️ **Recommended for Production:**
- Enable HTTPS (use Let's Encrypt for free SSL)
- Set secure session cookies: `cookie: { secure: true, httpOnly: true }`
- Implement rate limiting to prevent brute force attacks
- Regular dependency updates: `npm audit fix`
- Use strong SESSION_SECRET (32+ random characters)
- Restrict file upload types and sizes
- Implement CSRF protection

## Backup & Maintenance

### What to Backup
- `blogs.json` - Blog configurations and WordPress credentials
- `users.json` - User accounts and permissions
- `uploads/` - User-uploaded images
- `.env` - Environment configuration (keep secure!)

### Backup Script Example
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

tar -czf "$BACKUP_DIR/blog-manager-$DATE.tar.gz" \
  blogs.json \
  users.json \
  uploads/ \
  .env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "blog-manager-*.tar.gz" -mtime +7 -delete
```

### Maintenance Checklist
- [ ] Weekly: Check logs for errors
- [ ] Monthly: Update npm dependencies
- [ ] Monthly: Review user access and remove inactive accounts
- [ ] Quarterly: Backup configuration files
- [ ] Quarterly: Review API usage and costs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## License

MIT License - Feel free to use for personal or commercial projects

## Support

For issues or questions:
- Check the Troubleshooting section above
- Review server console logs for errors
- Verify API keys and credentials are correct
- Check WordPress REST API is accessible

---

**Built for content creators managing multiple WordPress blogs** 🚀

Start creating amazing AI-powered content today!
