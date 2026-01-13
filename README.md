# Blog Manager App

**Web-based multi-blog content management system** - Create AI-powered blog posts for multiple WordPress sites from one dashboard.

## Features

- **Multi-Blog Support** - Manage unlimited WordPress blogs from one interface
- **AI-Powered Content** - Generate 850+ word SEO-optimized articles with OpenAI GPT-4
- **Auto Image Selection** - 4+ professionally selected images per post from Unsplash
- **WordPress Integration** - Publish directly to WordPress as drafts or live posts
- **Password Protected** - Secure web interface with session-based authentication
- **Admin Panel** - Add, edit, and delete blogs easily
- **Responsive Design** - Works on desktop, tablet, and mobile
- **5-Step Workflow** - Brainstorm → Outline → Article → Images → Publish

## Quick Start

### Prerequisites

- Node.js v18 or higher
- WordPress site(s) with REST API enabled
- OpenAI API key
- Unsplash API key (free tier available)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/blog-manager-app.git
   cd blog-manager-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   APP_PASSWORD=YourSecurePassword123
   SESSION_SECRET=random_secret_key_here
   OPENAI_API_KEY=your_openai_api_key
   UNSPLASH_ACCESS_KEY=your_unsplash_access_key
   PORT=12800
   MIN_IMAGES_PER_POST=4
   MIN_WORD_COUNT=850
   ```

4. **Set up blog configuration:**
   ```bash
   cp blogs.json.example blogs.json
   ```

   Edit `blogs.json` with your WordPress sites (or use the admin panel after starting)

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Open in browser:**
   ```
   http://localhost:12800
   ```

## First Time Setup

### 1. Login

Use the password you set in `.env` (`APP_PASSWORD`)

### 2. Add Your First Blog

1. Click **"⚙️ Manage Blogs"** in the navigation
2. Click **"+ Add New Blog"**
3. Fill in the details:
   - **Blog Name**: Your blog name
   - **WordPress URL**: https://yourblog.com (no trailing slash)
   - **Username**: Your WordPress username
   - **Application Password**: From WordPress (see below)
   - **Description**: Brief description
   - **Categories**: Comma-separated categories
   - **Tone**: Blog tone/voice
   - **Keywords**: SEO keywords
   - **CTA**: Call-to-action text

### Getting WordPress Application Password

1. Log into your WordPress admin panel
2. Go to **Users** → **Profile**
3. Scroll to **"Application Passwords"**
4. Enter name: "Blog Manager App"
5. Click **"Add New Application Password"**
6. **Copy the password** (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste it in the "Add Blog" form

## Using the App

### Creating a Blog Post

1. **Select Blog** - Click on a blog card from the dashboard
2. **Brainstorm** - Enter:
   - Topic (e.g., "10 Ways to Grow Your Business")
   - Angle (How-to, Listicle, Case Study, etc.)
   - Audience (Who is this for?)
   - Tone (Professional, Friendly, Casual, etc.)
3. **Review Outline** - AI generates article structure
4. **Generate Article** - Full 850+ word article created with SEO optimization
5. **Select Images** - AI picks 4+ relevant images from Unsplash
6. **Publish** - Creates WordPress draft (or publish immediately)

### Managing Blogs

- **Add Blog**: Click "⚙️ Manage Blogs" → "+ Add New Blog"
- **Edit Blog**: Click "✏️ Edit" next to any blog
- **Delete Blog**: Click "🗑️ Delete" next to any blog

## Configuration

### Environment Variables (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PASSWORD` | Master password for the app | Required |
| `SESSION_SECRET` | Secret for session encryption | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key | Required |
| `PORT` | Server port | 12800 |
| `MIN_IMAGES_PER_POST` | Minimum images per article | 4 |
| `MIN_WORD_COUNT` | Minimum article word count | 850 |

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
blog-manager-app/
├── server.js                  # Express server
├── package.json               # Dependencies
├── .env                       # Configuration (not in git)
├── blogs.json                 # Blog list (not in git)
├── .gitignore                # Git ignore rules
├── config/
│   └── brand-voice.json      # Default brand voice
├── public/
│   ├── index.html            # Dashboard
│   ├── create.html           # Blog creation interface
│   ├── admin.html            # Blog management
│   ├── style.css             # Styling
│   └── app.js                # Frontend JavaScript
└── src/
    ├── outlineGenerator.js   # Article outline creation
    ├── articleWriter.js      # Full article generation
    ├── imageSelector.js      # AI image selection
    ├── wordpressPublisher.js # WordPress integration
    └── utils/
        ├── anthropic.js      # OpenAI API wrapper
        ├── unsplash.js       # Unsplash API wrapper
        └── prompts.js        # AI prompt templates
```

## API Endpoints

- `POST /api/login` - Authenticate user
- `GET /api/blogs` - List all blogs
- `POST /api/blogs` - Add new blog
- `PUT /api/blogs/:id` - Update blog
- `DELETE /api/blogs/:id` - Delete blog
- `POST /api/outline` - Generate article outline
- `POST /api/article` - Generate full article
- `POST /api/images` - Select images
- `POST /api/publish` - Publish to WordPress

## Troubleshooting

### Can't Access the App

- Verify server is running: `npm start`
- Check the URL: `http://localhost:12800`
- Try a different browser or incognito mode

### Login Not Working

- Verify `APP_PASSWORD` in `.env`
- Clear browser cookies
- Try incognito/private window

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

- Check OpenAI API key is valid and has credits
- Verify `config/brand-voice.json` exists
- Check server console for detailed errors

## Security Notes

- **Never commit `.env`** - Contains API keys and passwords
- **Never commit `blogs.json`** - Contains WordPress credentials
- Change default `APP_PASSWORD` immediately
- Use strong WordPress Application Passwords
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

## Tech Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4
- **Images**: Unsplash API
- **CMS**: WordPress REST API
- **Frontend**: Vanilla JavaScript, CSS
- **Session**: express-session

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
