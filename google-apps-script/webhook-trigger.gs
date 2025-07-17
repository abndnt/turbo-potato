/**
 * Facebook Marketplace Automation - Google Apps Script Webhook Trigger
 * 
 * This script should be added to your Google Sheets as a bound script.
 * It will automatically trigger webhooks when data is added or modified.
 * 
 * Setup Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Update the WEBHOOK_URL constant with your server URL
 * 5. Save and authorize the script
 * 6. Set up triggers using the setupTriggers() function
 */

// Configuration
const WEBHOOK_URL = 'https://your-server-domain.com/webhook/google-sheets'; // Update this URL
const SHEET_NAME = 'Listings'; // Name of the sheet containing listing data
const STATUS_COLUMN = 'H'; // Column where status updates will be written
const PROCESSED_COLUMN = 'I'; // Column to track processed items

/**
 * Set up automatic triggers for the spreadsheet
 * Run this function once to install the triggers
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Create new triggers
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Trigger on edit (when data is modified)
  ScriptApp.newTrigger('onEdit')
    .timeBased()
    .everyMinutes(5) // Check every 5 minutes for new/updated rows
    .create();
  
  // Trigger on form submit (if using Google Forms)
  ScriptApp.newTrigger('onFormSubmit')
    .timeBased()
    .everyMinutes(1) // Check every minute for form submissions
    .create();
  
  Logger.log('Triggers set up successfully');
}

/**
 * Main function that runs periodically to check for new/updated listings
 */
function checkForUpdates() {
  try {
    const sheet = getListingsSheet();
    if (!sheet) {
      Logger.log('Listings sheet not found');
      return;
    }
    
    const data = getSheetData(sheet);
    const newItems = findUnprocessedItems(data);
    
    if (newItems.length > 0) {
      Logger.log(`Found ${newItems.length} new items to process`);
      sendWebhook(newItems);
      markItemsAsProcessed(sheet, newItems);
    } else {
      Logger.log('No new items found');
    }
    
  } catch (error) {
    Logger.log('Error in checkForUpdates: ' + error.toString());
    sendErrorNotification(error);
  }
}

/**
 * Get the listings sheet
 */
function getListingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME);
}

/**
 * Get all data from the sheet
 */
function getSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // No data rows
  
  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  return values.map((row, index) => {
    const item = {};
    headers.forEach((header, colIndex) => {
      item[header.toLowerCase().replace(/\s+/g, '_')] = row[colIndex];
    });
    item.rowIndex = index + 2; // +2 because arrays are 0-indexed and we skip header
    return item;
  });
}

/**
 * Find items that haven't been processed yet
 */
function findUnprocessedItems(data) {
  return data.filter(item => {
    // Check if item has required fields and hasn't been processed
    return item.title && 
           item.price && 
           item.description && 
           (!item.processed || item.processed !== 'YES') &&
           (!item.status || item.status === '' || item.status === 'Pending');
  });
}

/**
 * Send webhook to the automation server
 */
function sendWebhook(items) {
  const payload = {
    source: 'google_sheets',
    timestamp: new Date().toISOString(),
    sheet_id: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheet_name: SHEET_NAME,
    items: items.map(item => ({
      row_index: item.rowIndex,
      title: item.title || '',
      price: parseFloat(item.price) || 0,
      description: item.description || '',
      category: item.category || '',
      condition: item.condition || 'Used',
      location: item.location || '',
      images: item.images || '',
      contact_info: item.contact_info || '',
      additional_details: item.additional_details || ''
    }))
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getWebhookToken() // Optional: Add authentication
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Webhook sent successfully');
      return true;
    } else {
      Logger.log(`Webhook failed with status: ${responseCode}`);
      Logger.log(`Response: ${response.getContentText()}`);
      return false;
    }
  } catch (error) {
    Logger.log('Error sending webhook: ' + error.toString());
    return false;
  }
}

/**
 * Mark items as processed in the sheet
 */
function markItemsAsProcessed(sheet, items) {
  items.forEach(item => {
    // Mark as processed
    const processedCell = sheet.getRange(item.rowIndex, getColumnIndex(PROCESSED_COLUMN));
    processedCell.setValue('YES');
    
    // Set initial status
    const statusCell = sheet.getRange(item.rowIndex, getColumnIndex(STATUS_COLUMN));
    if (!statusCell.getValue()) {
      statusCell.setValue('Processing');
    }
    
    // Add timestamp
    const timestampCell = sheet.getRange(item.rowIndex, getColumnIndex('J')); // Assuming column J for timestamp
    timestampCell.setValue(new Date());
  });
}

/**
 * Update status for a specific item
 * This function can be called by the automation server via webhook
 */
function updateItemStatus(rowIndex, status, message = '') {
  try {
    const sheet = getListingsSheet();
    if (!sheet) return false;
    
    // Update status
    const statusCell = sheet.getRange(rowIndex, getColumnIndex(STATUS_COLUMN));
    statusCell.setValue(status);
    
    // Update message if provided
    if (message) {
      const messageCell = sheet.getRange(rowIndex, getColumnIndex('K')); // Assuming column K for messages
      messageCell.setValue(message);
    }
    
    // Update timestamp
    const timestampCell = sheet.getRange(rowIndex, getColumnIndex('L')); // Assuming column L for last update
    timestampCell.setValue(new Date());
    
    Logger.log(`Updated row ${rowIndex} with status: ${status}`);
    return true;
    
  } catch (error) {
    Logger.log('Error updating status: ' + error.toString());
    return false;
  }
}

/**
 * Webhook endpoint for receiving status updates from the automation server
 * This function should be deployed as a web app
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'update_status') {
      const success = updateItemStatus(data.row_index, data.status, data.message);
      
      return ContentService
        .createTextOutput(JSON.stringify({ success: success }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Manual trigger function for testing
 */
function manualTrigger() {
  Logger.log('Manual trigger started');
  checkForUpdates();
  Logger.log('Manual trigger completed');
}

/**
 * Validate sheet structure
 */
function validateSheetStructure() {
  const sheet = getListingsSheet();
  if (!sheet) {
    Logger.log('ERROR: Sheet "' + SHEET_NAME + '" not found');
    return false;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ['Title', 'Price', 'Description', 'Category', 'Condition', 'Location', 'Images'];
  
  const missingHeaders = requiredHeaders.filter(header => 
    !headers.some(h => h.toLowerCase() === header.toLowerCase())
  );
  
  if (missingHeaders.length > 0) {
    Logger.log('ERROR: Missing required headers: ' + missingHeaders.join(', '));
    return false;
  }
  
  Logger.log('Sheet structure validation passed');
  return true;
}

/**
 * Get column index from letter (A=1, B=2, etc.)
 */
function getColumnIndex(letter) {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result;
}

/**
 * Get webhook authentication token (implement your own logic)
 */
function getWebhookToken() {
  // You can store this in Script Properties for security
  // PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  return 'your-webhook-token-here'; // Replace with actual token
}

/**
 * Send error notification (optional)
 */
function sendErrorNotification(error) {
  // Implement error notification logic (email, Slack, etc.)
  Logger.log('Error notification: ' + error.toString());
}

/**
 * Initialize the script (run this once after setup)
 */
function initialize() {
  Logger.log('Initializing Facebook Marketplace Automation Script...');
  
  // Validate sheet structure
  if (!validateSheetStructure()) {
    Logger.log('Sheet validation failed. Please check your sheet structure.');
    return;
  }
  
  // Set up triggers
  setupTriggers();
  
  // Test webhook connection
  const testPayload = {
    source: 'google_sheets',
    timestamp: new Date().toISOString(),
    test: true,
    message: 'Connection test from Google Apps Script'
  };
  
  Logger.log('Initialization completed successfully');
}

/**
 * Clean up old triggers (utility function)
 */
function cleanupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log(`Deleted ${triggers.length} triggers`);
}

/**
 * Get script information for debugging
 */
function getScriptInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const info = {
    spreadsheet_id: ss.getId(),
    spreadsheet_name: ss.getName(),
    sheet_name: SHEET_NAME,
    webhook_url: WEBHOOK_URL,
    triggers_count: ScriptApp.getProjectTriggers().length,
    last_run: new Date().toISOString()
  };
  
  Logger.log('Script Info: ' + JSON.stringify(info, null, 2));
  return info;
}