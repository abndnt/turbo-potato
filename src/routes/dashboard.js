const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');
const { googleSheetsService } = require('../services/googleSheets');
const { validateImage, getImageInfo } = require('../services/imageProcessor');
const { validateListingData } = require('../services/contentProcessor');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// Get dashboard status
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        googleSheets: 'connected',
        automation: 'ready',
        imageProcessor: 'ready'
      }
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Service status check failed'
    });
  }
});

// Validate Google Sheets
router.post('/validate-sheet', async (req, res) => {
  try {
    const { spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    // Test access to the sheet
    const isValid = await googleSheetsService.validateSheetStructure(spreadsheetId);
    
    if (isValid) {
      // Get sample data
      const sampleData = await googleSheetsService.getSheetData(spreadsheetId, 'A1:J5');
      
      res.json({
        success: true,
        message: 'Sheet validation successful',
        data: {
          isValid: true,
          sampleData: sampleData.slice(0, 5), // First 5 rows
          rowCount: sampleData.length
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Sheet structure is invalid. Please use the provided template.',
        data: {
          isValid: false,
          expectedHeaders: [
            'Item Name', 'Description', 'Price', 'Category', 
            'Condition', 'Photos', 'Location', 'Status', 
            'Listing URL', 'Error Log'
          ]
        }
      });
    }
  } catch (error) {
    logger.error('Sheet validation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate sheet',
      error: error.message
    });
  }
});

// Get pending listings from sheet
router.post('/pending-listings', async (req, res) => {
  try {
    const { spreadsheetId } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    const pendingRows = await googleSheetsService.getPendingRows(spreadsheetId);
    
    res.json({
      success: true,
      data: {
        pendingCount: pendingRows.length,
        listings: pendingRows
      }
    });
  } catch (error) {
    logger.error('Failed to get pending listings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending listings',
      error: error.message
    });
  }
});

// Upload images
router.post('/upload-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadedImages = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Validate image
        const validation = await validateImage(file.path);
        
        if (validation.valid) {
          const imageInfo = await getImageInfo(file.path);
          uploadedImages.push({
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            size: file.size,
            info: imageInfo
          });
        } else {
          errors.push({
            filename: file.originalname,
            error: validation.error
          });
        }
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        uploaded: uploadedImages,
        errors: errors,
        totalUploaded: uploadedImages.length,
        totalErrors: errors.length
      }
    });
  } catch (error) {
    logger.error('Image upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: error.message
    });
  }
});

// Validate listing data
router.post('/validate-listing', async (req, res) => {
  try {
    const listingData = req.body;
    const validation = validateListingData(listingData);
    
    res.json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings || []
      }
    });
  } catch (error) {
    logger.error('Listing validation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Listing validation failed',
      error: error.message
    });
  }
});

// Get processing history
router.post('/processing-history', async (req, res) => {
  try {
    const { spreadsheetId, limit = 50 } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    const allRows = await googleSheetsService.getSheetData(spreadsheetId);
    
    // Filter processed rows and get recent ones
    const processedRows = allRows
      .slice(1) // Skip header
      .map((row, index) => googleSheetsService.parseRowData(row, index + 2))
      .filter(row => row.status && row.status !== 'Pending' && row.status !== 'Ready')
      .slice(-limit)
      .reverse(); // Most recent first

    res.json({
      success: true,
      data: {
        history: processedRows,
        total: processedRows.length
      }
    });
  } catch (error) {
    logger.error('Failed to get processing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve processing history',
      error: error.message
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    // This would typically come from a database or cache
    // For now, return mock statistics
    const stats = {
      totalProcessed: 0,
      successfulListings: 0,
      failedListings: 0,
      averageProcessingTime: '2.5 minutes',
      uptime: process.uptime(),
      lastProcessed: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

// Process Google Sheet
router.post('/process-sheet', async (req, res) => {
  try {
    const { spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    // Forward the request to the automation controller
    const automationController = require('../controllers/automationController');
    return automationController.processSheet(req, res);
  } catch (error) {
    logger.error('Sheet processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sheet',
      error: error.message
    });
  }
});

// Test automation (dry run)
router.post('/test-automation', async (req, res) => {
  try {
    const { listingData } = req.body;

    if (!listingData) {
      return res.status(400).json({
        success: false,
        message: 'Listing data is required'
      });
    }

    // Validate the listing data
    const validation = validateListingData(listingData);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing data',
        errors: validation.errors
      });
    }

    // Simulate automation process
    const testResult = {
      success: true,
      message: 'Test completed successfully',
      data: {
        listingData: listingData,
        validation: validation,
        estimatedProcessingTime: '2-3 minutes',
        steps: [
          'Image processing and optimization',
          'Content generation and enhancement',
          'Facebook authentication',
          'Form filling and submission',
          'Status update in Google Sheets'
        ]
      }
    };

    res.json(testResult);
  } catch (error) {
    logger.error('Automation test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Automation test failed',
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.'
      });
    }
  }

  logger.error('Dashboard API error:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

module.exports = router;