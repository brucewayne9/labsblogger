# Blog Manager App - Setup Guide

## Step 1: Set Your Password

1. Open `.env` file
2. Change this line:
   ```env
   APP_PASSWORD=your_secure_app_password_here
   ```
   To something secure like:
   ```env
   APP_PASSWORD=MySecurePass2026!
   ```

## Step 2: Start the Server

```bash
cd "/Users/brucewayne/Alfred _Projects/Blog Manager App"
npm start
```

You'll see:
```
🚀 Blog Manager App running on http://localhost:12800
```

## Step 3: Open in Browser

Go to: **http://localhost:12800**

## Step 4: Login

Enter the password you set in `.env`

## Step 5: Use the App!

### Your Pre-Configured Blogs:

✅ **Lumabot** (AI & Customer Service)
- URL: https://lumabot.ai
- Ready to use!

✅ **Loovacast** (Radio Streaming)
- URL: https://lovacast.com
- Ready to use!

### Create Your First Post:

1. Click on a blog card
2. Enter topic (e.g., "10 Ways to Get More Listeners")
3. Choose angle (how-to, listicle, etc.)
4. Enter audience (radio station owners)
5. Click "Generate Outline"
6. Review and click "Generate Article"
7. AI selects 4+ images
8. Publish to WordPress!

## Adding More Blogs

1. Click **"⚙️ Manage Blogs"**
2. Click **"+ Add New Blog"**
3. Fill in:
   - Name: "My Blog Name"
   - URL: https://myblog.com
   - Username: your_wp_username
   - App Password: (from WordPress)
4. Save!

### Getting WordPress Application Password:

1. Login to WordPress admin
2. Users → Profile
3. Scroll to "Application Passwords"
4. Create one called "Blog Manager"
5. Copy the password
6. Paste in "Add Blog" form

## Access from Phone/Tablet

### Find Your Computer's IP:

```bash
ipconfig getifaddr en0
```

Example output: `192.168.1.100`

### On Phone/Tablet:

Open browser to: `http://192.168.1.100:12800`

(Replace with your actual IP)

## Troubleshooting

**"Cannot GET /"**
- Server not running, run: `npm start`

**"Unauthorized"**
- Wrong password
- Check `.env` file
- Clear browser cache

**"WordPress publishing failed"**
- Check Application Password
- Verify URL format: `https://example.com` (no trailing slash)
- Test: `https://yoursite.com/wp-json/wp/v2/posts` should show JSON

## Features You Can Use

### For Each Blog:

✓ Create 850+ word SEO articles
✓ Auto-select 4+ images
✓ Publish as drafts or live
✓ Multiple topics/niches
✓ Custom brand voice
✓ Keyword optimization

### In Admin Panel:

✓ Add unlimited blogs
✓ Edit blog settings
✓ Delete old blogs
✓ Manage credentials
✓ Set brand voice
✓ Configure keywords

## Tips

1. **Start with drafts** - Review in WordPress before publishing
2. **Use strong passwords** - Both app password and WP passwords
3. **Organize by niche** - Clear blog names help
4. **Test topics** - Try different angles to see what works
5. **Review articles** - AI is good but always review

## What's Next?

1. Create your first post
2. Add more blogs as you get clients
3. Access from anywhere on your network
4. Create consistent content for all your blogs

---

**You're ready to go! Start creating amazing content! 🚀**
