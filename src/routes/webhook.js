const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { googleSheetsService } = require('../services/googleSheets');
const { processListing } = require('../services/automation');

// Webhook endpoint for Google Sheets triggers
router.post('/sheets', async (req, res) => {
  try {
    const { spreadsheetId, row, data, secret, items } = req.body;
    
    // Handle data coming from Google Apps Script which uses rowIndex
    if (items && Array.isArray(items)) {
      // Convert rowIndex to rowNumber for consistency
      items.forEach(item => {
        if (item.row_index && !item.rowNumber) {
          item.rowNumber = item.row_index;
        }
      });
    }

    // Verify webhook secret
    if (secret !== process.env.WEBHOOK_SECRET) {
      logger.webhook('Unauthorized webhook request', { 
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    // Validate required fields
    if (!spreadsheetId || !row) {
      logger.webhook('Invalid webhook payload', { body: req.body });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: spreadsheetId, row'
      });
    }

    logger.webhook('Received sheets webhook', {
      spreadsheetId,
      row,
      hasData: !!data
    });

    // Get row data if not provided
    let rowData;
    if (data && Array.isArray(data)) {
      rowData = googleSheetsService.parseRowData(data, row);
    } else {
      rowData = await googleSheetsService.getRowData(spreadsheetId, row);
    }

    // Validate row data
    if (!rowData.itemName || !rowData.price) {
      await googleSheetsService.updateRowError(
        spreadsheetId, 
        row, 
        'Missing required fields: Item Name and Price'
      );
      return res.status(400).json({
        success: false,
        message: 'Invalid row data: missing required fields'
      });
    }

    // Update status to processing
    await googleSheetsService.updateRowStatus(spreadsheetId, row, 'Processing');

    // Emit real-time update
    req.io.emit('listing-status', {
      spreadsheetId,
      row,
      status: 'Processing',
      itemName: rowData.itemName
    });

    // Process the listing asynchronously
    processListingAsync(spreadsheetId, row, rowData, req.io);

    res.json({
      success: true,
      message: 'Listing queued for processing',
      data: {
        spreadsheetId,
        row,
        itemName: rowData.itemName
      }
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Manual trigger endpoint
router.post('/trigger', async (req, res) => {
  try {
    const { spreadsheetId, rows } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Missing spreadsheetId'
      });
    }

    // Validate sheet structure
    const isValidStructure = await googleSheetsService.validateSheetStructure(spreadsheetId);
    if (!isValidStructure) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sheet structure. Please use the provided template.'
      });
    }

    let rowsToProcess;
    if (rows && Array.isArray(rows)) {
      // Process specific rows
      rowsToProcess = [];
      for (const rowNum of rows) {
        const rowData = await googleSheetsService.getRowData(spreadsheetId, rowNum);
        if (rowData.status === 'Process' || rowData.status === 'Ready') {
          rowsToProcess.push(rowData);
        }
      }
    } else {
      // Process all pending rows
      rowsToProcess = await googleSheetsService.getPendingRows(spreadsheetId);
    }

    if (rowsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No rows ready for processing',
        processed: 0
      });
    }

    logger.webhook(`Manual trigger: processing ${rowsToProcess.length} rows`, {
      spreadsheetId,
      rowCount: rowsToProcess.length
    });

    // Process each row
    for (const rowData of rowsToProcess) {
      // Ensure we're using rowNumber consistently
      const rowNumber = rowData.rowNumber || rowData.rowIndex;
      if (!rowNumber) {
        logger.error('Missing row number for item:', rowData);
        continue; // Skip this item
      }
      
      await googleSheetsService.updateRowStatus(spreadsheetId, rowNumber, 'Processing');
      
      req.io.emit('listing-status', {
        spreadsheetId,
        row: rowNumber,
        status: 'Processing',
        itemName: rowData.itemName
      });

      processListingAsync(spreadsheetId, rowNumber, rowData, req.io);
    }

    res.json({
      success: true,
      message: `${rowsToProcess.length} listings queued for processing`,
      processed: rowsToProcess.length
    });

  } catch (error) {
    logger.error('Manual trigger error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Async function to process listing without blocking response
async function processListingAsync(spreadsheetId, row, rowData, io) {
  try {
    logger.automation(`Starting listing process for row ${row}`, {
      spreadsheetId,
      itemName: rowData.itemName
    });

    const result = await processListing(rowData);

    if (result.success) {
      await googleSheetsService.updateRowStatus(
        spreadsheetId, 
        row, 
        'Success', 
        result.listingUrl
      );

      io.emit('listing-status', {
        spreadsheetId,
        row,
        status: 'Success',
        itemName: rowData.itemName,
        listingUrl: result.listingUrl
      });

      logger.automation(`Successfully processed listing for row ${row}`, {
        spreadsheetId,
        itemName: rowData.itemName,
        listingUrl: result.listingUrl
      });
    } else {
      await googleSheetsService.updateRowError(
        spreadsheetId, 
        row, 
        result.error || 'Unknown error occurred'
      );

      io.emit('listing-status', {
        spreadsheetId,
        row,
        status: 'Failed',
        itemName: rowData.itemName,
        error: result.error
      });

      logger.automation(`Failed to process listing for row ${row}`, {
        spreadsheetId,
        itemName: rowData.itemName,
        error: result.error
      });
    }
  } catch (error) {
    logger.error(`Error processing listing for row ${row}:`, error);
    
    await googleSheetsService.updateRowError(
      spreadsheetId, 
      row, 
      error.message || 'Processing error'
    );

    io.emit('listing-status', {
      spreadsheetId,
      row,
      status: 'Failed',
      itemName: rowData.itemName,
      error: error.message
    });
  }
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;