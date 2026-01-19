import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PEXELS_API_URL = 'https://api.pexels.com/v1';

// Search for photos on Pexels
export async function searchPhotos(query, options = {}) {
  const {
    perPage = 10,
    orientation = 'landscape',
    page = 1,
  } = options;

  if (!process.env.PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY not found in environment variables');
  }

  try {
    const response = await axios.get(`${PEXELS_API_URL}/search`, {
      params: {
        query,
        per_page: perPage,
        orientation,
        page,
      },
      headers: {
        'Authorization': process.env.PEXELS_API_KEY,
      },
    });

    // Transform Pexels response to match Unsplash format for consistency
    const transformedResults = response.data.photos.map(photo => ({
      id: photo.id.toString(),
      urls: {
        regular: photo.src.large,
        thumb: photo.src.medium,
        full: photo.src.original,
      },
      alt_description: photo.alt || query,
      description: photo.alt || query,
      user: {
        name: photo.photographer,
        links: {
          html: photo.photographer_url,
        },
      },
      links: {
        html: photo.url,
      },
      // Store original Pexels data for attribution
      pexels: {
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        src: photo.src,
      },
    }));

    return {
      success: true,
      results: transformedResults,
      total: response.data.total_results,
      source: 'pexels',
    };
  } catch (error) {
    console.error('Pexels API Error:', error.message);

    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Invalid Pexels API key. Please check your PEXELS_API_KEY in .env file.',
      };
    }

    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Pexels API rate limit reached. Please try again later.',
      };
    }

    return {
      success: false,
      error: `Pexels API Error: ${error.message}`,
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

// Get photo details by ID
export async function getPhotoById(photoId) {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY not found in environment variables');
  }

  try {
    const response = await axios.get(`${PEXELS_API_URL}/photos/${photoId}`, {
      headers: {
        'Authorization': process.env.PEXELS_API_KEY,
      },
    });

    // Transform to match Unsplash format
    const photo = response.data;
    const transformed = {
      id: photo.id.toString(),
      urls: {
        regular: photo.src.large,
        thumb: photo.src.medium,
        full: photo.src.original,
      },
      alt_description: photo.alt || '',
      description: photo.alt || '',
      user: {
        name: photo.photographer,
        links: {
          html: photo.photographer_url,
        },
      },
      links: {
        html: photo.url,
      },
      pexels: {
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        src: photo.src,
      },
    };

    return {
      success: true,
      photo: transformed,
      source: 'pexels',
    };
  } catch (error) {
    console.error('Pexels API Error:', error.message);
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
