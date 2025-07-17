const { google } = require('googleapis');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { processImages } = require('./imageProcessor');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class FacebookAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.config = {
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      slowMo: parseInt(process.env.PUPPETEER_SLOW_MO || '0'),
      defaultTimeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000')
    };
  }

  async initialize() {
    try {
      logger.facebook('Initializing Facebook automation');
      
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: this.config.headless ? 'new' : false,
        slowMo: this.config.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,720'
        ],
        defaultViewport: {
          width: 1280,
          height: 720
        }
      });

      // Create new page
      this.page = await this.browser.newPage();
      
      // Set default timeout
      this.page.setDefaultTimeout(this.config.defaultTimeout);
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Enable request interception
      await this.page.setRequestInterception(true);
      
      // Handle request interception
      this.page.on('request', (request) => {
        // Block unnecessary resources
        const resourceType = request.resourceType();
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      logger.facebook('Facebook automation initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Facebook automation:', error);
      throw error;
    }
  }

  async login() {
    try {
      logger.facebook('Starting Facebook login process');
      
      // Navigate to Facebook login page
      logger.facebook('Navigating to Facebook login page');
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Take screenshot for debugging
      await this.page.screenshot({
        path: `./logs/login-start-${Date.now()}.png`,
        fullPage: true
      });
      
      // Check if cookies file exists
      const cookiesPath = path.join(process.cwd(), 'facebook-cookies.json');
      if (fs.existsSync(cookiesPath)) {
        logger.facebook('Found existing cookies, attempting cookie login');
        try {
          // Load cookies
          const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
          await this.page.setCookie(...cookies);
          
          // Navigate to Facebook homepage
          await this.page.goto('https://www.facebook.com', {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Take screenshot after cookie login attempt
          await this.page.screenshot({
            path: `./logs/cookie-login-${Date.now()}.png`,
            fullPage: true
          });
          
          // Check if login was successful
          const isLoggedIn = await this.checkLoginStatus();
          if (isLoggedIn) {
            logger.facebook('Successfully logged in using cookies');
            this.isLoggedIn = true;
            return true;
          } else {
            logger.facebook('Cookie login failed, proceeding with manual login');
          }
        } catch (cookieError) {
          logger.warning('Cookie login failed:', cookieError.message);
        }
      }
      
      // If cookies didn't work, perform manual login
      logger.facebook('Performing manual login');
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for login form to be visible
      logger.facebook('Waiting for login form elements');
      await this.page.waitForSelector('#email', { timeout: 15000 });
      await this.page.waitForSelector('#pass', { timeout: 15000 });
      await this.page.waitForSelector('#loginbutton', { timeout: 15000 });
      
      // Clear any existing text and fill in login form
      logger.facebook('Filling login form');
      
      // Ensure credentials are strings and not undefined
      const email = String(process.env.FACEBOOK_EMAIL || '');
      const password = String(process.env.FACEBOOK_PASSWORD || '');
      
      if (!email || !password) {
        throw new Error('Facebook credentials are missing from environment variables');
      }
      
      logger.facebook(`Using email: ${email.substring(0, 3)}***`);
      
      await this.page.click('#email', { clickCount: 3 });
      await this.page.type('#email', email);
      
      await this.page.click('#pass', { clickCount: 3 });
      await this.page.type('#pass', password);
      
      // Take screenshot before clicking login
      await this.page.screenshot({
        path: `./logs/before-login-click-${Date.now()}.png`,
        fullPage: true
      });
      
      // Click login button
      logger.facebook('Clicking login button');
      await this.page.click('#loginbutton');
      
      // Wait for navigation to complete with longer timeout
      logger.facebook('Waiting for navigation after login');
      try {
        await this.page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 45000
        });
      } catch (navError) {
        logger.warning('Navigation timeout, but continuing to check login status');
      }
      
      // Take screenshot after login attempt
      await this.page.screenshot({
        path: `./logs/after-login-${Date.now()}.png`,
        fullPage: true
      });
      
      // Check for common login errors first
      const errorSelectors = [
        '[data-testid="royal_login_error"]',
        '.login_error_box',
        '[role="alert"]',
        'div[id*="error"]',
        'div[data-testid="login_error"]'
      ];
      
      let errorMessage = null;
      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.$(selector);
          if (errorElement) {
            const errorText = await this.page.evaluate(el => el.textContent, errorElement);
            errorMessage = `Login error detected: ${errorText}`;
            logger.error(errorMessage);
            break;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }
      
      // Check if we're on a checkpoint page (2FA, security check, etc.)
      const currentUrl = this.page.url();
      if (currentUrl.includes('/checkpoint/')) {
        errorMessage = 'Facebook requires additional verification (checkpoint). Please complete verification manually and try again.';
        logger.error(errorMessage);
      }
      
      // Check if login was successful
      logger.facebook('Checking login status after manual login');
      const isLoggedIn = await this.checkLoginStatus();
      
      if (isLoggedIn) {
        logger.facebook('Successfully logged in manually');
        this.isLoggedIn = true;
        
        // Save cookies for future use
        try {
          const cookies = await this.page.cookies();
          fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
          logger.facebook('Cookies saved for future use');
        } catch (cookieSaveError) {
          logger.warning('Failed to save cookies:', cookieSaveError.message);
        }
        
        return true;
      } else {
        const finalError = errorMessage || 'Login failed - unable to detect successful login';
        logger.error(finalError);
        throw new Error(finalError);
      }
    } catch (error) {
      logger.error('Failed to login to Facebook:', error);
      
      // Take screenshot for debugging
      try {
        await this.page.screenshot({
          path: `./logs/login-error-${Date.now()}.png`,
          fullPage: true
        });
        logger.facebook('Error screenshot saved');
      } catch (screenshotError) {
        logger.error('Failed to take login error screenshot:', screenshotError);
      }
      
      throw error;
    }
  }

  async navigateToMarketplace() {
    try {
      logger.facebook('Navigating to Facebook Marketplace');
      
      // First try to navigate directly to the create listing page
      await this.page.goto('https://www.facebook.com/marketplace/create', {
        waitUntil: 'networkidle2',
        timeout: 45000 // Increased timeout
      });

      // Try to wait for the create listing page to load with increased timeout
      try {
        await this.page.waitForSelector('[data-testid="marketplace-create-listing"]', {
          timeout: 30000 // Increased timeout
        });
        
        logger.facebook('Successfully navigated to Marketplace create page');
        return true;
      } catch (selectorError) {
        // If direct navigation fails, try an alternative approach
        logger.facebook('Direct navigation to create listing failed, trying alternative approach');
        
        // Navigate to the main marketplace page first
        await this.page.goto('https://www.facebook.com/marketplace', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait for the marketplace page to load
        await this.page.waitForSelector('[data-testid="marketplace_home_feed"]', {
          timeout: 30000
        });
        
        // Look for the "Create New Listing" or "Sell" button
        const sellButton = await this.page.$('a[href*="/marketplace/create"]');
        if (sellButton) {
          await sellButton.click();
          
          // Wait for navigation to complete
          await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
          
          // Wait for the create listing page to load
          await this.page.waitForSelector('[data-testid="marketplace-create-listing"]', {
            timeout: 30000
          });
          
          logger.facebook('Successfully navigated to Marketplace create page via alternative route');
          return true;
        } else {
          // Try to find the button using a different selector
          const sellButton = await this.page.$('a[aria-label*="Sell" i]');
          if (sellButton) {
            await sellButton.click();
            
            // Wait for navigation to complete
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            // Wait for the create listing page to load
            await this.page.waitForSelector('[data-testid="marketplace-create-listing"]', {
              timeout: 30000
            });
            
            logger.facebook('Successfully navigated to Marketplace create page via "Sell" button');
            return true;
          } else {
            throw new Error('Could not find any "Create New Listing" or "Sell" button on the Marketplace page');
          }
        }
      }
    } catch (error) {
      logger.error('Failed to navigate to Marketplace:', error);
      
      // Take a screenshot of the current page to help debug
      try {
        const screenshotPath = `./logs/marketplace-navigation-error-${Date.now()}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        logger.facebook(`Saved error screenshot to ${screenshotPath}`);
      } catch (screenshotError) {
        logger.error('Failed to take error screenshot:', screenshotError);
      }
      
      throw error;
    }
  }

  async createListing(listingData) {
    try {
      logger.facebook('Creating marketplace listing', { 
        itemName: listingData.itemName 
      });

      // Ensure we're logged in and on the right page
      if (!this.isLoggedIn) {
        await this.login();
      }
      
      await this.navigateToMarketplace();

      // Process and upload images
      const processedImages = await processImages(listingData.photos);
      if (processedImages.length > 0) {
        await this.uploadImages(processedImages);
      }

      // Fill in listing details
      await this.fillListingForm(listingData);

      // Submit the listing
      const listingUrl = await this.submitListing();

      logger.facebook('Successfully created marketplace listing', {
        itemName: listingData.itemName,
        listingUrl
      });

      return {
        success: true,
        listingUrl
      };
    } catch (error) {
      logger.error('Failed to create marketplace listing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async uploadImages(images) {
    try {
      logger.facebook(`Uploading ${images.length} images`);
      
      // Find the file input
      const fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('File input not found');
      }
      
      // Upload images
      await fileInput.uploadFile(...images);
      
      // Wait for images to upload
      await this.page.waitForSelector('[data-testid="marketplace-media-preview"]', {
        timeout: 30000
      });
      
      logger.facebook('Images uploaded successfully');
      return true;
    } catch (error) {
      logger.error('Failed to upload images:', error);
      throw error;
    }
  }

  async fillListingForm(listingData) {
    try {
      logger.facebook('Filling listing form');
      
      // Fill in title
      await this.page.type('input[name="title"]', listingData.itemName);
      
      // Fill in price
      await this.page.type('input[name="price"]', listingData.price.toString());
      
      // Select category
      if (listingData.category) {
        await this.selectCategory(listingData.category);
      }
      
      // Select condition
      if (listingData.condition) {
        await this.selectCondition(listingData.condition);
      }
      
      // Fill in description
      await this.page.type('textarea[name="description"]', listingData.description);
      
      // Set location
      if (listingData.location) {
        await this.setLocation(listingData.location);
      }
      
      logger.facebook('Listing form filled successfully');
      return true;
    } catch (error) {
      logger.error('Failed to fill listing form:', error);
      throw error;
    }
  }

  async selectCategory(category) {
    try {
      // Click category dropdown
      await this.page.click('[data-testid="marketplace-category-selector"]');
      
      // Wait for dropdown to open
      await this.page.waitForSelector('[role="menu"]');
      
      // Find and click the category
      const categoryElements = await this.page.$$('[role="menuitemradio"]');
      let categoryFound = false;
      
      for (const element of categoryElements) {
        const text = await this.page.evaluate(el => el.textContent, element);
        if (text.toLowerCase().includes(category.toLowerCase())) {
          await element.click();
          categoryFound = true;
          break;
        }
      }
      
      if (!categoryFound) {
        logger.warning(`Category "${category}" not found, using default`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to select category:', error);
      return false; // Continue with default category
    }
  }

  async selectCondition(condition) {
    try {
      // Click condition dropdown
      await this.page.click('[data-testid="marketplace-condition-selector"]');
      
      // Wait for dropdown to open
      await this.page.waitForSelector('[role="menu"]');
      
      // Find and click the condition
      const conditionElements = await this.page.$$('[role="menuitemradio"]');
      let conditionFound = false;
      
      for (const element of conditionElements) {
        const text = await this.page.evaluate(el => el.textContent, element);
        if (text.toLowerCase().includes(condition.toLowerCase())) {
          await element.click();
          conditionFound = true;
          break;
        }
      }
      
      if (!conditionFound) {
        logger.warning(`Condition "${condition}" not found, using default`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to select condition:', error);
      return false; // Continue with default condition
    }
  }

  async setLocation(location) {
    try {
      // Click location field
      await this.page.click('[data-testid="marketplace-location-selector"]');
      
      // Clear existing location
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('A');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      
      // Type new location
      await this.page.type('[data-testid="marketplace-location-selector"]', location);
      
      // Wait for location suggestions
      await this.page.waitForSelector('[role="option"]');
      
      // Click first suggestion
      await this.page.click('[role="option"]');
      
      return true;
    } catch (error) {
      logger.error('Failed to set location:', error);
      return false; // Continue with default location
    }
  }

  async submitListing() {
    try {
      logger.facebook('Submitting listing');
      
      // Click publish button
      await this.page.click('[data-testid="marketplace-publish-button"]');
      
      // Wait for confirmation
      await this.page.waitForSelector('[data-testid="marketplace-success-dialog"]', {
        timeout: 60000
      });
      
      // Extract listing URL
      const listingUrl = await this.page.evaluate(() => {
        const viewButton = document.querySelector('[data-testid="marketplace-success-dialog"] a');
        return viewButton ? viewButton.href : null;
      });
      
      logger.facebook('Listing submitted successfully', { listingUrl });
      return listingUrl || 'https://www.facebook.com/marketplace';
    } catch (error) {
      logger.error('Failed to submit listing:', error);
      throw error;
    }
  }

  async checkLoginStatus() {
    try {
      logger.facebook('Checking login status...');
      
      // Multiple selectors to check for logged-in state
      const selectors = [
        '[data-testid="user-menu-button"]',
        '[aria-label*="Account"]',
        '[aria-label*="Profile"]',
        'div[role="button"][aria-label*="Account"]',
        'a[href*="/me"]',
        '[data-testid="blue_bar_profile_link"]',
        '[data-testid="nav-user-menu"]',
        'div[data-click="profile_icon"]',
        'a[href*="facebook.com/profile.php"]',
        'div[aria-label*="Your profile"]'
      ];
      
      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            logger.facebook(`Login detected using selector: ${selector}`);
            return true;
          }
        } catch (selectorError) {
          // Continue to next selector
          continue;
        }
      }
      
      // Check URL as additional verification
      const currentUrl = this.page.url();
      logger.facebook(`Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('facebook.com') && !currentUrl.includes('/login') && !currentUrl.includes('/checkpoint')) {
        // Check if we're not on an error page
        const errorSelectors = [
          '[data-testid="royal_login_error"]',
          '.login_error_box',
          '[role="alert"]',
          'div[id*="error"]'
        ];
        
        let hasError = false;
        for (const errorSelector of errorSelectors) {
          const errorElement = await this.page.$(errorSelector);
          if (errorElement) {
            hasError = true;
            break;
          }
        }
        
        if (!hasError) {
          logger.facebook('Login detected via URL check (no login/checkpoint in URL and no errors)');
          return true;
        }
      }
      
      logger.facebook('No login indicators found');
      return false;
    } catch (error) {
      logger.error('Error checking login status:', error);
      return false;
    }
  }

  async takeScreenshot(filename = 'screenshot') {
    try {
      if (!this.page) {
        throw new Error('No active page for screenshot');
      }

      const logDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(logDir, `${filename}-${timestamp}.png`);
      
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      logger.facebook(`Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      logger.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      logger.facebook('Browser closed');
    }
  }
}

// Singleton instance
const facebookAutomation = new FacebookAutomation();

// Process a listing
async function processListing(listingData) {
  try {
    logger.automation('Processing listing', { itemName: listingData.itemName });
    
    // Initialize automation if not already initialized
    if (!facebookAutomation.browser) {
      await facebookAutomation.initialize();
    }
    
    // Create listing
    const result = await facebookAutomation.createListing(listingData);
    
    return result;
  } catch (error) {
    logger.error('Failed to process listing:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processListing,
  facebookAutomation
};