import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Search for photos on Unsplash
export async function searchPhotos(query, options = {}) {
  const {
    perPage = 10,
    orientation = 'landscape',
    page = 1,
  } = options;

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY not found in environment variables');
  }

  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
      params: {
        query,
        per_page: perPage,
        orientation,
        page,
      },
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    return {
      success: true,
      results: response.data.results,
      total: response.data.total,
    };
  } catch (error) {
    console.error('Unsplash API Error:', error.message);

    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Invalid Unsplash API key. Please check your UNSPLASH_ACCESS_KEY in .env file.',
      };
    }

    if (error.response?.status === 403) {
      return {
        success: false,
        error: 'Unsplash API rate limit reached. Please try again later.',
      };
    }

    return {
      success: false,
      error: `Unsplash API Error: ${error.message}`,
    };
  }
}

// Download image from URL
export async function downloadImage(imageUrl, filename) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, response.data);

    return {
      success: true,
      filepath,
    };
  } catch (error) {
    console.error('Image Download Error:', error.message);
    return {
      success: false,
      error: `Failed to download image: ${error.message}`,
    };
  }
}

// Trigger download tracking (required by Unsplash API terms)
export async function triggerDownload(downloadLocation) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn('Unsplash download tracking skipped: no API key');
    return;
  }

  try {
    await axios.get(downloadLocation, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });
  } catch (error) {
    console.error('Failed to trigger Unsplash download tracking:', error.message);
    // Non-critical, so we don't throw
  }
}

// Get photo details by ID
export async function getPhotoById(photoId) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY not found in environment variables');
  }

  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/photos/${photoId}`, {
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    return {
      success: true,
      photo: response.data,
    };
  } catch (error) {
    console.error('Unsplash API Error:', error.message);
    return {
      success: false,
      error: `Failed to get photo: ${error.message}`,
    };
  }
}

// Clean up temporary images
export function cleanupTempImages() {
  const tempDir = path.join(process.cwd(), 'temp');

  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(tempDir, file));
    });
  }
}
