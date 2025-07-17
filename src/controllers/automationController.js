const logger = require('../utils/logger');
const { processListing } = require('../services/automation');
const { googleSheetsService } = require('../services/googleSheets');
const HybridAutomation = require('../services/hybridAutomation');

// Global state for automation
const automationState = {
  isRunning: false,
  isPaused: false,
  currentItem: null,
  queue: [],
  processedCount: 0,
  failedCount: 0,
  startTime: null,
  lastProcessedTime: null
};

// Start automation process
async function startAutomation(req, res) {
  try {
    if (automationState.isRunning) {
      return res.json({
        success: true,
        message: 'Automation is already running',
        state: getStateForClient()
      });
    }

    const { spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    // Reset state
    automationState.isRunning = true;
    automationState.isPaused = false;
    automationState.startTime = new Date();
    automationState.processedCount = 0;
    automationState.failedCount = 0;
    automationState.queue = [];
    
    // Notify clients via Socket.IO
    if (req.io) {
      req.io.emit('automation:started', {
        timestamp: new Date().toISOString(),
        spreadsheetId
      });
    }

    // Start processing in background
    processQueue(spreadsheetId, req.io);
    
    logger.info('Automation started', { spreadsheetId });
    
    res.json({
      success: true,
      message: 'Automation started successfully',
      state: getStateForClient()
    });
  } catch (error) {
    logger.error('Automation start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start automation',
      error: error.message
    });
  }
}

// Pause automation process
async function pauseAutomation(req, res) {
  try {
    if (!automationState.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Automation is not running'
      });
    }

    automationState.isPaused = true;
    
    // Notify clients via Socket.IO
    if (req.io) {
      req.io.emit('automation:paused', {
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info('Automation paused');
    
    res.json({
      success: true,
      message: 'Automation paused successfully',
      state: getStateForClient()
    });
  } catch (error) {
    logger.error('Automation pause error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause automation',
      error: error.message
    });
  }
}

// Resume automation process
async function resumeAutomation(req, res) {
  try {
    if (!automationState.isRunning || !automationState.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'Automation is not paused'
      });
    }

    automationState.isPaused = false;
    
    // Notify clients via Socket.IO
    if (req.io) {
      req.io.emit('automation:resumed', {
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info('Automation resumed');
    
    res.json({
      success: true,
      message: 'Automation resumed successfully',
      state: getStateForClient()
    });
  } catch (error) {
    logger.error('Automation resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume automation',
      error: error.message
    });
  }
}

// Stop automation process
async function stopAutomation(req, res) {
  try {
    if (!automationState.isRunning) {
      return res.status(400).json({
        success: false,
        message: 'Automation is not running'
      });
    }

    // Reset state
    automationState.isRunning = false;
    automationState.isPaused = false;
    automationState.currentItem = null;
    automationState.queue = [];
    
    // Notify clients via Socket.IO
    if (req.io) {
      req.io.emit('automation:stopped', {
        timestamp: new Date().toISOString(),
        stats: {
          processedCount: automationState.processedCount,
          failedCount: automationState.failedCount,
          duration: new Date() - automationState.startTime
        }
      });
    }
    
    logger.info('Automation stopped');
    
    res.json({
      success: true,
      message: 'Automation stopped successfully',
      state: getStateForClient()
    });
  } catch (error) {
    logger.error('Automation stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop automation',
      error: error.message
    });
  }
}

// Get automation status
async function getAutomationStatus(req, res) {
  try {
    res.json({
      success: true,
      state: getStateForClient()
    });
  } catch (error) {
    logger.error('Failed to get automation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get automation status',
      error: error.message
    });
  }
}

// Process sheet (one-time processing)
async function processSheet(req, res) {
  try {
    const { spreadsheetId } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required'
      });
    }

    // Get pending rows
    const pendingRows = await googleSheetsService.getPendingRows(spreadsheetId);
    
    if (pendingRows.length === 0) {
      return res.json({
        success: true,
        message: 'No pending items found to process',
        data: { pendingCount: 0 }
      });
    }

    // Start processing in background
    if (!automationState.isRunning) {
      automationState.isRunning = true;
      automationState.isPaused = false;
      automationState.startTime = new Date();
      automationState.processedCount = 0;
      automationState.failedCount = 0;
      automationState.queue = [];
      
      // Notify clients via Socket.IO
      if (req.io) {
        req.io.emit('automation:started', {
          timestamp: new Date().toISOString(),
          spreadsheetId
        });
      }
      
      // Start processing in background
      processQueue(spreadsheetId, req.io);
    }
    
    logger.info('Sheet processing started', { 
      spreadsheetId,
      pendingCount: pendingRows.length
    });
    
    res.json({
      success: true,
      message: `Processing ${pendingRows.length} pending items`,
      data: {
        pendingCount: pendingRows.length,
        state: getStateForClient()
      }
    });
  } catch (error) {
    logger.error('Sheet processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process sheet',
      error: error.message
    });
  }
}

// Background processing function
async function processQueue(spreadsheetId, io) {
  try {
    while (automationState.isRunning) {
      // Check if paused
      if (automationState.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      // Get pending rows
      const pendingRows = await googleSheetsService.getPendingRows(spreadsheetId);
      
      if (pendingRows.length === 0) {
        logger.info('No more items to process, stopping automation');
        
        // Reset state
        automationState.isRunning = false;
        automationState.isPaused = false;
        automationState.currentItem = null;
        
        // Notify clients
        if (io) {
          io.emit('automation:completed', {
            timestamp: new Date().toISOString(),
            stats: {
              processedCount: automationState.processedCount,
              failedCount: automationState.failedCount,
              duration: new Date() - automationState.startTime
            }
          });
        }
        
        break;
      }
      
      // Process first pending item
      const item = pendingRows[0];
      automationState.currentItem = item;
      
      // Update status to Processing
      // More robust row number extraction with detailed logging
      const rowNumber = item.rowNumber || item.rowIndex || (item.index ? item.index + 1 : null);
      
      if (!rowNumber || isNaN(parseInt(rowNumber))) {
        logger.error('Invalid or missing row number for item:', {
          item: JSON.stringify(item, null, 2),
          rowNumber,
          hasRowNumber: !!item.rowNumber,
          hasRowIndex: !!item.rowIndex,
          hasIndex: !!item.index,
          itemKeys: Object.keys(item)
        });
        continue; // Skip this item and move to the next one
      }
      
      logger.info(`Processing item from row ${rowNumber}:`, {
        title: item.title || item.itemName,
        rowNumber: rowNumber
      });
      
      await googleSheetsService.updateRowStatus(
        spreadsheetId,
        rowNumber,
        'Processing',
        'Starting automation process'
      );
      
      // Notify clients
      if (io) {
        io.emit('automation:processing', {
          timestamp: new Date().toISOString(),
          item: {
            rowNumber: rowNumber, // Use the standardized rowNumber
            title: item.title || item.itemName
          }
        });
      }
      
      try {
        // Process the listing
        // Handle photos properly whether it's a string or already an array
        let photosList = [];
        if (item.photos) {
          if (Array.isArray(item.photos)) {
            photosList = item.photos;
          } else if (typeof item.photos === 'string' && item.photos.trim() !== '') {
            photosList = item.photos.split(',').map(p => p.trim()).filter(p => p !== '');
          } else {
            logger.warning('Photos field exists but is not a string or array:', {
              photos: item.photos,
              type: typeof item.photos
            });
          }
        }
        
        logger.info('Processing photos:', {
          originalPhotos: item.photos,
          processedPhotos: photosList,
          photosCount: photosList.length
        });
        
        // Use hybrid automation for enhanced reliability
        const hybridAutomation = new HybridAutomation();
        
        try {
          // Initialize hybrid automation
          await hybridAutomation.initialize();
          
          // Perform login with LLM assistance
          const loginResult = await hybridAutomation.login(
            process.env.FACEBOOK_EMAIL,
            process.env.FACEBOOK_PASSWORD
          );
          
          if (!loginResult.success) {
            throw new Error(`Login failed: ${loginResult.message}`);
          }
          
          // Navigate to marketplace
          await hybridAutomation.navigateToMarketplace();
          
          // Create listing with intelligent form filling
          const hybridResult = await hybridAutomation.createListing({
            title: item.title || item.itemName,
            price: item.price,
            description: item.description,
            category: item.category,
            condition: item.condition,
            images: photosList,
            location: item.location
          });
          
          // Close hybrid automation
          await hybridAutomation.close();
          
          // Return result in expected format
          var result = {
            success: hybridResult.success,
            listingUrl: hybridResult.url,
            error: hybridResult.success ? null : hybridResult.message
          };
        } catch (hybridError) {
          logger.error('Hybrid automation failed, falling back to traditional method:', hybridError);
          
          // Close hybrid automation on error
          try {
            await hybridAutomation.close();
          } catch (closeError) {
            logger.error('Error closing hybrid automation:', closeError);
          }
          
          // Fallback to traditional automation
          result = await processListing({
            itemName: item.title || item.itemName,
            price: item.price,
            description: item.description,
            category: item.category,
            condition: item.condition,
            photos: photosList,
            location: item.location
          });
        }
        
        if (result.success) {
          // Update status to Completed
          // Use the same rowNumber variable we defined earlier
          await googleSheetsService.updateRowStatus(
            spreadsheetId,
            rowNumber,
            'Completed',
            'Successfully posted to Facebook Marketplace',
            result.listingUrl
          );
          
          automationState.processedCount++;
          
          // Notify clients
          if (io) {
            io.emit('automation:item-completed', {
              timestamp: new Date().toISOString(),
              item: {
                rowNumber: rowNumber,
                title: item.title || item.itemName,
                listingUrl: result.listingUrl
              }
            });
          }
        } else {
          // Update status to Failed
          // Use the same rowNumber variable we defined earlier
          await googleSheetsService.updateRowStatus(
            spreadsheetId,
            rowNumber,
            'Failed',
            result.error || 'Unknown error occurred'
          );
          
          automationState.failedCount++;
          
          // Notify clients
          if (io) {
            io.emit('automation:item-failed', {
              timestamp: new Date().toISOString(),
              item: {
                rowNumber: rowNumber,
                title: item.title || item.itemName,
                error: result.error
              }
            });
          }
        }
      } catch (error) {
        logger.error('Error processing item:', error);
        
        // Update status to Failed
        // Use the same rowNumber variable we defined earlier
        await googleSheetsService.updateRowStatus(
          spreadsheetId,
          rowNumber,
          'Failed',
          error.message || 'Unknown error occurred'
        );
        
        automationState.failedCount++;
        
        // Notify clients
        if (io) {
          io.emit('automation:item-failed', {
            timestamp: new Date().toISOString(),
            item: {
              rowNumber: rowNumber,
              title: item.title || item.itemName,
              error: error.message
            }
          });
        }
      }
      
      automationState.lastProcessedTime = new Date();
      
      // Add delay between processing items
      const delayMin = parseInt(process.env.AUTOMATION_DELAY_MIN) || 30000;
      const delayMax = parseInt(process.env.AUTOMATION_DELAY_MAX) || 60000;
      const delay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
      
      logger.info(`Waiting ${delay}ms before processing next item`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  } catch (error) {
    logger.error('Queue processing error:', error);
    
    // Reset state on error
    automationState.isRunning = false;
    automationState.isPaused = false;
    automationState.currentItem = null;
    
    // Notify clients
    if (io) {
      io.emit('automation:error', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

// Helper function to get state for client
function getStateForClient() {
  return {
    isRunning: automationState.isRunning,
    isPaused: automationState.isPaused,
    currentItem: automationState.currentItem,
    processedCount: automationState.processedCount,
    failedCount: automationState.failedCount,
    startTime: automationState.startTime,
    lastProcessedTime: automationState.lastProcessedTime,
    runningTime: automationState.startTime ? new Date() - automationState.startTime : 0
  };
}

module.exports = {
  startAutomation,
  pauseAutomation,
  resumeAutomation,
  stopAutomation,
  getAutomationStatus,
  processSheet
};