const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      // Initialize Google Auth with service account
      // Try to use JSON file first, fallback to environment variables
      let credentials;
      
      try {
        // Try to load from JSON file
        const fs = require('fs');
        const path = require('path');
        const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
        
        if (fs.existsSync(credentialsPath)) {
          credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          logger.sheets('Using Google credentials from JSON file');
        } else {
          throw new Error('JSON file not found, using environment variables');
        }
      } catch (jsonError) {
        // Fallback to environment variables
        logger.sheets('Using Google credentials from environment variables');
        credentials = {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        };
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      });

      // Get authenticated client
      const authClient = await this.auth.getClient();
      
      // Initialize Sheets API
      this.sheets = google.sheets({ 
        version: 'v4', 
        auth: authClient 
      });

      logger.sheets('Google Sheets service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId, range = 'A:H') {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values || [];
      logger.sheets(`Retrieved ${rows.length} rows from spreadsheet`, { 
        spreadsheetId, 
        range 
      });

      return rows;
    } catch (error) {
      logger.error('Failed to get sheet data:', error);
      throw error;
    }
  }

  async getRowData(spreadsheetId, rowNumber) {
    try {
      const range = `A${rowNumber}:H${rowNumber}`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const row = response.data.values?.[0] || [];
      logger.sheets(`Retrieved row ${rowNumber} data`, { 
        spreadsheetId, 
        rowData: row 
      });

      return this.parseRowData(row, rowNumber);
    } catch (error) {
      logger.error(`Failed to get row ${rowNumber} data:`, error);
      throw error;
    }
  }

  parseRowData(row, rowNumber) {
    return {
      rowNumber,
      itemName: row[0] || '',
      description: row[1] || '',
      price: row[2] || '',
      category: row[3] || '',
      condition: row[4] || '',
      photos: row[5] ? row[5].split(',').map(p => p.trim()) : [],
      location: row[6] || '',
      status: row[7] || 'Pending'
    };
  }

  async updateRowStatus(spreadsheetId, rowNumber, status, listingUrl = '') {
    try {
      // Validate rowNumber is defined and is a valid number
      if (!rowNumber || isNaN(parseInt(rowNumber))) {
        logger.error(`Invalid row number provided: ${rowNumber}`, {
          spreadsheetId,
          status,
          listingUrl
        });
        throw new Error(`Invalid row number: ${rowNumber}`);
      }
      
      const statusRange = `H${rowNumber}`;
      const urlRange = `I${rowNumber}`;

      // Update status
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: statusRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[status]]
        }
      });

      // Update listing URL if provided
      if (listingUrl) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: urlRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[listingUrl]]
          }
        });
      }

      logger.sheets(`Updated row ${rowNumber} status to: ${status}`, {
        spreadsheetId,
        rowNumber,
        status,
        listingUrl
      });

      return true;
    } catch (error) {
      logger.error(`Failed to update row ${rowNumber} status:`, error);
      throw error;
    }
  }

  async updateRowError(spreadsheetId, rowNumber, errorMessage) {
    try {
      const timestamp = new Date().toISOString();
      const status = `Error: ${errorMessage}`;
      
      await this.updateRowStatus(spreadsheetId, rowNumber, status);
      
      // Get current error log content first
      const errorRange = `J${rowNumber}`;
      const currentErrorResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: errorRange
      });
      
      let newErrorLog = `${timestamp}: ${errorMessage}`;
      
      // If there's existing content, append the new error
      if (currentErrorResponse.data.values && currentErrorResponse.data.values[0] && currentErrorResponse.data.values[0][0]) {
        newErrorLog = `${currentErrorResponse.data.values[0][0]}\n${newErrorLog}`;
      }
      
      // Update the error log column (column J)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: errorRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newErrorLog]]
        }
      });

      logger.sheets(`Updated row ${rowNumber} with error`, {
        spreadsheetId,
        rowNumber,
        errorMessage
      });

      return true;
    } catch (error) {
      logger.error(`Failed to update row ${rowNumber} error:`, error);
      throw error;
    }
  }

  async getPendingRows(spreadsheetId) {
    try {
      const rows = await this.getSheetData(spreadsheetId);
      const pendingRows = [];

      // Skip header row (index 0)
      for (let i = 1; i < rows.length; i++) {
        const rowData = this.parseRowData(rows[i], i + 1);
        
        // Check if row is ready for processing
        if (rowData.status === 'Process' || rowData.status === 'Ready') {
          pendingRows.push(rowData);
        }
      }

      logger.sheets(`Found ${pendingRows.length} pending rows`, {
        spreadsheetId,
        pendingCount: pendingRows.length
      });

      return pendingRows;
    } catch (error) {
      logger.error('Failed to get pending rows:', error);
      throw error;
    }
  }

  async validateSheetStructure(spreadsheetId) {
    try {
      const rows = await this.getSheetData(spreadsheetId, 'A1:J1');
      const headers = rows[0] || [];

      const expectedHeaders = [
        'Item Name',
        'Description', 
        'Price',
        'Category',
        'Condition',
        'Photos',
        'Location',
        'Status',
        'Listing URL',
        'Error Log'
      ];

      const isValid = expectedHeaders.every((header, index) => 
        headers[index] && headers[index].toLowerCase().includes(header.toLowerCase())
      );

      if (!isValid) {
        logger.sheets('Sheet structure validation failed', {
          spreadsheetId,
          expectedHeaders,
          actualHeaders: headers
        });
        return false;
      }

      logger.sheets('Sheet structure validation passed', { spreadsheetId });
      return true;
    } catch (error) {
      logger.error('Failed to validate sheet structure:', error);
      return false;
    }
  }
}

// Singleton instance
const googleSheetsService = new GoogleSheetsService();

// Initialize function for server startup
async function initializeGoogleAuth() {
  return await googleSheetsService.initialize();
}

module.exports = {
  googleSheetsService,
  initializeGoogleAuth
};