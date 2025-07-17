const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class ImageProcessor {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.processedDir = path.join(this.uploadDir, 'processed');
    this.maxWidth = 1200;
    this.maxHeight = 1200;
    this.quality = 85;
  }

  async initialize() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.processedDir, { recursive: true });
      logger.info('Image processor initialized');
    } catch (error) {
      logger.error('Failed to initialize image processor:', error);
      throw error;
    }
  }

  async processImages(imagePaths) {
    try {
      if (!imagePaths || imagePaths.length === 0) {
        return [];
      }

      await this.initialize();
      const processedPaths = [];

      for (const imagePath of imagePaths) {
        try {
          const processedPath = await this.processImage(imagePath);
          if (processedPath) {
            processedPaths.push(processedPath);
          }
        } catch (error) {
          logger.error(`Failed to process image ${imagePath}:`, error);
          // Continue with other images
        }
      }

      logger.info(`Processed ${processedPaths.length} out of ${imagePaths.length} images`);
      return processedPaths;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  async processImage(imagePath) {
    try {
      // Handle different path formats
      let fullPath = imagePath;
      
      // If it's just a filename, look in uploads directory
      if (!path.isAbsolute(imagePath) && !imagePath.includes('/') && !imagePath.includes('\\')) {
        fullPath = path.join(this.uploadDir, imagePath);
      }

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch (error) {
        logger.error(`Image file not found: ${fullPath}`);
        return null;
      }

      // Generate output filename
      const filename = path.basename(fullPath);
      const nameWithoutExt = path.parse(filename).name;
      const outputPath = path.join(this.processedDir, `${nameWithoutExt}_processed.jpg`);

      // Process image with Sharp
      await sharp(fullPath)
        .resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: this.quality,
          progressive: true
        })
        .toFile(outputPath);

      // Get file stats
      const stats = await fs.stat(outputPath);
      logger.info(`Processed image: ${filename}`, {
        originalPath: fullPath,
        processedPath: outputPath,
        size: stats.size
      });

      return outputPath;
    } catch (error) {
      logger.error(`Failed to process image ${imagePath}:`, error);
      return null;
    }
  }

  async validateImage(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      
      // Check file size (max 10MB)
      const stats = await fs.stat(imagePath);
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
      
      if (stats.size > maxSize) {
        throw new Error(`Image too large: ${stats.size} bytes (max: ${maxSize})`);
      }

      // Check dimensions
      if (metadata.width < 200 || metadata.height < 200) {
        throw new Error(`Image too small: ${metadata.width}x${metadata.height} (min: 200x200)`);
      }

      // Check format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!supportedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported format: ${metadata.format}`);
      }

      return {
        valid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: stats.size
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async optimizeForFacebook(imagePath) {
    try {
      // Facebook Marketplace optimal specs:
      // - Aspect ratio: 1:1 (square) preferred
      // - Min size: 400x400px
      // - Max size: 2048x2048px
      // - Format: JPEG preferred
      
      const outputPath = path.join(
        this.processedDir, 
        `fb_${path.basename(imagePath, path.extname(imagePath))}.jpg`
      );

      await sharp(imagePath)
        .resize(1200, 1200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 90,
          progressive: true
        })
        .toFile(outputPath);

      logger.info(`Optimized image for Facebook: ${imagePath}`);
      return outputPath;
    } catch (error) {
      logger.error(`Failed to optimize image for Facebook: ${imagePath}`, error);
      throw error;
    }
  }

  async createThumbnail(imagePath, size = 300) {
    try {
      const outputPath = path.join(
        this.processedDir,
        `thumb_${path.basename(imagePath, path.extname(imagePath))}.jpg`
      );

      await sharp(imagePath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 80
        })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error(`Failed to create thumbnail: ${imagePath}`, error);
      throw error;
    }
  }

  async cleanupProcessedImages(olderThanHours = 24) {
    try {
      const files = await fs.readdir(this.processedDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.processedDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} processed images older than ${olderThanHours} hours`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup processed images:', error);
      throw error;
    }
  }

  async getImageInfo(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);
      
      return {
        path: imagePath,
        filename: path.basename(imagePath),
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      logger.error(`Failed to get image info: ${imagePath}`, error);
      throw error;
    }
  }
}

// Singleton instance
const imageProcessor = new ImageProcessor();

// Export functions
async function processImages(imagePaths) {
  return await imageProcessor.processImages(imagePaths);
}

async function validateImage(imagePath) {
  return await imageProcessor.validateImage(imagePath);
}

async function optimizeForFacebook(imagePath) {
  return await imageProcessor.optimizeForFacebook(imagePath);
}

async function createThumbnail(imagePath, size) {
  return await imageProcessor.createThumbnail(imagePath, size);
}

async function cleanupProcessedImages(olderThanHours) {
  return await imageProcessor.cleanupProcessedImages(olderThanHours);
}

async function getImageInfo(imagePath) {
  return await imageProcessor.getImageInfo(imagePath);
}

module.exports = {
  ImageProcessor,
  processImages,
  validateImage,
  optimizeForFacebook,
  createThumbnail,
  cleanupProcessedImages,
  getImageInfo
};