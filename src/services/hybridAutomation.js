const BrowserbaseService = require('./browserbaseService');
const { facebookAutomation } = require('./automation');
const fs = require('fs').promises;
const path = require('path');

class HybridAutomation {
    constructor() {
        this.browserbaseService = new BrowserbaseService();
        this.fallbackAutomation = facebookAutomation;
        this.logDir = path.join(__dirname, '../../logs');
        this.useHybridMode = true;
    }

    /**
     * Initialize the hybrid automation system
     */
    async initialize() {
        try {
            console.log('Initializing Hybrid Automation System...');
            
            if (this.useHybridMode) {
                // Initialize Browserbase for LLM-powered automation
                await this.browserbaseService.connectBrowser();
                console.log('Browserbase LLM automation initialized');
            } else {
                // Fallback to traditional Puppeteer
                await this.fallbackAutomation.initialize();
                console.log('Fallback Puppeteer automation initialized');
            }

            return { success: true, mode: this.useHybridMode ? 'hybrid' : 'fallback' };
        } catch (error) {
            console.error('Failed to initialize hybrid automation:', error);
            
            // Try fallback if Browserbase fails
            if (this.useHybridMode) {
                console.log('Attempting fallback to traditional automation...');
                this.useHybridMode = false;
                return await this.initialize();
            }
            
            throw error;
        }
    }

    /**
     * Enhanced login with LLM reasoning and fallback
     */
    async login(email, password) {
        try {
            console.log('Starting hybrid login process...');
            
            if (this.useHybridMode) {
                return await this.performLLMLogin(email, password);
            } else {
                return await this.performFallbackLogin(email, password);
            }
        } catch (error) {
            console.error('Hybrid login failed:', error);
            
            // Try fallback if LLM login fails
            if (this.useHybridMode) {
                console.log('LLM login failed, attempting fallback...');
                this.useHybridMode = false;
                await this.switchToFallback();
                return await this.performFallbackLogin(email, password);
            }
            
            throw error;
        }
    }

    /**
     * Perform LLM-powered login using Browserbase
     */
    async performLLMLogin(email, password) {
        try {
            console.log('Performing LLM-powered login...');
            
            const result = await this.browserbaseService.handleIntelligentLogin(email, password);
            
            if (result.success) {
                console.log('LLM login successful');
                return {
                    success: true,
                    method: 'llm',
                    message: 'Login completed with LLM assistance',
                    sessionInfo: this.browserbaseService.getSessionInfo()
                };
            } else if (result.requiresManualIntervention) {
                console.log('LLM login requires manual intervention');
                return {
                    success: false,
                    method: 'llm',
                    message: 'Manual intervention required',
                    debugUrl: result.debugUrl,
                    requiresManualIntervention: true
                };
            } else {
                throw new Error(result.message || 'LLM login failed');
            }
        } catch (error) {
            console.error('LLM login error:', error);
            await this.browserbaseService.takeScreenshot('llm-login-error');
            throw error;
        }
    }

    /**
     * Perform fallback login using traditional automation
     */
    async performFallbackLogin(email, password) {
        try {
            console.log('Performing fallback login...');
            
            const result = await this.fallbackAutomation.login(email, password);
            
            return {
                success: result.success,
                method: 'fallback',
                message: result.message || 'Login completed with fallback method'
            };
        } catch (error) {
            console.error('Fallback login error:', error);
            throw error;
        }
    }

    /**
     * Switch to fallback automation system
     */
    async switchToFallback() {
        try {
            console.log('Switching to fallback automation...');
            
            // Close Browserbase session
            await this.browserbaseService.close();
            
            // Initialize fallback automation
            await this.fallbackAutomation.initialize();
            
            this.useHybridMode = false;
            console.log('Successfully switched to fallback mode');
        } catch (error) {
            console.error('Failed to switch to fallback:', error);
            throw error;
        }
    }

    /**
     * Navigate to marketplace with hybrid approach
     */
    async navigateToMarketplace() {
        try {
            console.log('Navigating to marketplace with hybrid approach...');
            
            if (this.useHybridMode) {
                return await this.browserbaseService.navigateToMarketplace();
            } else {
                return await this.fallbackAutomation.navigateToMarketplace();
            }
        } catch (error) {
            console.error('Marketplace navigation failed:', error);
            
            // Try fallback if LLM navigation fails
            if (this.useHybridMode) {
                console.log('LLM navigation failed, attempting fallback...');
                await this.switchToFallback();
                return await this.fallbackAutomation.navigateToMarketplace();
            }
            
            throw error;
        }
    }

    /**
     * Create marketplace listing with enhanced error handling
     */
    async createListing(listingData) {
        try {
            console.log('Creating marketplace listing with hybrid approach...');
            
            if (this.useHybridMode) {
                return await this.createListingWithLLM(listingData);
            } else {
                return await this.fallbackAutomation.createListing(listingData);
            }
        } catch (error) {
            console.error('Listing creation failed:', error);
            
            // Try fallback if LLM listing creation fails
            if (this.useHybridMode) {
                console.log('LLM listing creation failed, attempting fallback...');
                await this.switchToFallback();
                return await this.fallbackAutomation.createListing(listingData);
            }
            
            throw error;
        }
    }

    /**
     * Create listing with LLM assistance
     */
    async createListingWithLLM(listingData) {
        try {
            console.log('Creating listing with LLM assistance...');
            
            const page = this.browserbaseService.page;
            if (!page) {
                throw new Error('No active Browserbase page');
            }

            // Navigate to create listing page
            await page.goto('https://www.facebook.com/marketplace/create/item', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await this.browserbaseService.takeScreenshot('create-listing-page');

            // Use intelligent form filling
            await this.fillListingFormIntelligently(listingData);

            // Submit with error handling
            return await this.submitListingIntelligently();

        } catch (error) {
            console.error('LLM listing creation error:', error);
            await this.browserbaseService.takeScreenshot('llm-listing-error');
            throw error;
        }
    }

    /**
     * Intelligently fill listing form using multiple strategies
     */
    async fillListingFormIntelligently(listingData) {
        try {
            const page = this.browserbaseService.page;

            // Title field
            await this.fillFieldIntelligently(page, 'title', listingData.title, [
                'input[placeholder*="title" i]',
                'input[aria-label*="title" i]',
                'input[name*="title"]',
                'textarea[placeholder*="title" i]'
            ]);

            // Price field
            await this.fillFieldIntelligently(page, 'price', listingData.price, [
                'input[placeholder*="price" i]',
                'input[aria-label*="price" i]',
                'input[name*="price"]',
                'input[type="number"]'
            ]);

            // Description field
            await this.fillFieldIntelligently(page, 'description', listingData.description, [
                'textarea[placeholder*="description" i]',
                'textarea[aria-label*="description" i]',
                'textarea[name*="description"]',
                'div[contenteditable="true"]'
            ]);

            // Category selection
            if (listingData.category) {
                await this.selectCategoryIntelligently(page, listingData.category);
            }

            // Location field
            if (listingData.location) {
                await this.fillFieldIntelligently(page, 'location', listingData.location, [
                    'input[placeholder*="location" i]',
                    'input[aria-label*="location" i]',
                    'input[name*="location"]'
                ]);
            }

            // Handle image uploads
            if (listingData.images && listingData.images.length > 0) {
                await this.uploadImagesIntelligently(page, listingData.images);
            }

            await this.browserbaseService.takeScreenshot('form-filled');

        } catch (error) {
            console.error('Form filling error:', error);
            throw error;
        }
    }

    /**
     * Fill a field using multiple selector strategies
     */
    async fillFieldIntelligently(page, fieldName, value, selectors) {
        try {
            console.log(`Filling ${fieldName} field with value: ${value}`);

            let field = null;
            for (const selector of selectors) {
                try {
                    field = await page.$(selector);
                    if (field) {
                        console.log(`Found ${fieldName} field with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!field) {
                throw new Error(`Could not find ${fieldName} field`);
            }

            // Clear and fill field
            await field.click({ clickCount: 3 });
            await field.type(value, { delay: 50 });

            console.log(`Successfully filled ${fieldName} field`);
        } catch (error) {
            console.error(`Failed to fill ${fieldName} field:`, error);
            throw error;
        }
    }

    /**
     * Intelligently select category
     */
    async selectCategoryIntelligently(page, category) {
        try {
            console.log(`Selecting category: ${category}`);

            const categorySelectors = [
                'select[name*="category"]',
                'div[role="combobox"]',
                'button[aria-haspopup="listbox"]',
                'input[placeholder*="category" i]'
            ];

            let categoryField = null;
            for (const selector of categorySelectors) {
                try {
                    categoryField = await page.$(selector);
                    if (categoryField) {
                        console.log(`Found category field with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (categoryField) {
                await categoryField.click();
                await page.waitForTimeout(1000);

                // Try to find and click the category option
                const categoryOptions = await page.$$('div[role="option"], li[role="option"], option');
                for (const option of categoryOptions) {
                    const text = await option.evaluate(el => el.textContent?.trim().toLowerCase());
                    if (text && text.includes(category.toLowerCase())) {
                        await option.click();
                        console.log(`Selected category: ${category}`);
                        return;
                    }
                }
            }

            console.log(`Category selection not found or not required: ${category}`);
        } catch (error) {
            console.error('Category selection error:', error);
            // Don't throw - category might be optional
        }
    }

    /**
     * Upload images intelligently
     */
    async uploadImagesIntelligently(page, images) {
        try {
            console.log(`Uploading ${images.length} images...`);

            const uploadSelectors = [
                'input[type="file"]',
                'input[accept*="image"]',
                'button[aria-label*="photo" i]',
                'div[role="button"]:has-text("Add Photos")'
            ];

            let uploadInput = null;
            for (const selector of uploadSelectors) {
                try {
                    uploadInput = await page.$(selector);
                    if (uploadInput) {
                        console.log(`Found upload input with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (uploadInput) {
                // Upload files
                await uploadInput.setInputFiles(images);
                console.log('Images uploaded successfully');
                
                // Wait for upload to complete
                await page.waitForTimeout(3000);
            } else {
                console.log('Image upload field not found - skipping images');
            }
        } catch (error) {
            console.error('Image upload error:', error);
            // Don't throw - images might be optional
        }
    }

    /**
     * Submit listing with intelligent error handling
     */
    async submitListingIntelligently() {
        try {
            console.log('Submitting listing...');
            
            const page = this.browserbaseService.page;

            const submitSelectors = [
                'button[type="submit"]',
                'button:has-text("Publish")',
                'button:has-text("Post")',
                'button:has-text("Create Listing")',
                'input[type="submit"]'
            ];

            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    submitButton = await page.$(selector);
                    if (submitButton) {
                        console.log(`Found submit button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!submitButton) {
                throw new Error('Could not find submit button');
            }

            await submitButton.click();
            console.log('Submit button clicked');

            // Wait for submission to complete
            await page.waitForTimeout(5000);
            await this.browserbaseService.takeScreenshot('after-submit');

            // Verify submission success
            const currentUrl = page.url();
            if (currentUrl.includes('marketplace') && !currentUrl.includes('create')) {
                console.log('Listing submitted successfully');
                return {
                    success: true,
                    message: 'Listing created successfully',
                    url: currentUrl
                };
            } else {
                throw new Error('Listing submission may have failed');
            }

        } catch (error) {
            console.error('Listing submission error:', error);
            await this.browserbaseService.takeScreenshot('submit-error');
            throw error;
        }
    }

    /**
     * Get debug information for troubleshooting
     */
    async getDebugInfo() {
        try {
            const info = {
                mode: this.useHybridMode ? 'hybrid' : 'fallback',
                timestamp: new Date().toISOString()
            };

            if (this.useHybridMode) {
                info.browserbase = this.browserbaseService.getSessionInfo();
                info.debugUrl = await this.browserbaseService.getDebugUrl();
            }

            return info;
        } catch (error) {
            console.error('Failed to get debug info:', error);
            return { error: error.message };
        }
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(filename) {
        try {
            if (this.useHybridMode) {
                return await this.browserbaseService.takeScreenshot(filename);
            } else {
                return await this.fallbackAutomation.takeScreenshot(filename);
            }
        } catch (error) {
            console.error('Screenshot failed:', error);
            throw error;
        }
    }

    /**
     * Close and cleanup
     */
    async close() {
        try {
            if (this.useHybridMode) {
                await this.browserbaseService.close();
            } else {
                await this.fallbackAutomation.close();
            }
            console.log('Hybrid automation closed');
        } catch (error) {
            console.error('Error closing hybrid automation:', error);
        }
    }
}

module.exports = HybridAutomation;