const { Browserbase } = require('@browserbasehq/sdk');
const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const path = require('path');

class BrowserbaseService {
    constructor() {
        this.browserbase = new Browserbase({
            apiKey: process.env.BROWSERBASE_API_KEY
        });
        this.browser = null;
        this.page = null;
        this.sessionId = null;
        this.logDir = path.join(__dirname, '../../logs');
    }

    /**
     * Create a new Browserbase session with enhanced capabilities
     */
    async createSession() {
        try {
            console.log('Creating Browserbase session...');
            
            const sessionResponse = await fetch('https://www.browserbase.com/v1/sessions', {
                method: 'POST',
                headers: {
                    'x-bb-api-key': process.env.BROWSERBASE_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectId: process.env.BROWSERBASE_PROJECT_ID
                })
            });

            if (!sessionResponse.ok) {
                const errorText = await sessionResponse.text();
                throw new Error(`Failed to create session: ${sessionResponse.status} ${errorText}`);
            }

            const session = await sessionResponse.json();
            this.sessionId = session.id;
            
            if (!this.sessionId) {
                console.error('Session response:', session);
                throw new Error('Session ID not found in response');
            }
            
            console.log(`Browserbase session created: ${this.sessionId}`);
            return session;
        } catch (error) {
            console.error('Failed to create Browserbase session:', error);
            throw error;
        }
    }

    /**
     * Connect Puppeteer to Browserbase session
     */
    async connectBrowser() {
        try {
            if (!this.sessionId) {
                await this.createSession();
            }

            if (!this.sessionId) {
                throw new Error('No session ID available for browser connection');
            }

            const browserWSEndpoint = `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${this.sessionId}&enableProxy=true`;
            
            console.log('Connecting to Browserbase browser...');
            this.browser = await puppeteer.connect({
                browserWSEndpoint
            });

            const pages = await this.browser.pages();
            this.page = pages[0] || await this.browser.newPage();

            console.log('Successfully connected to Browserbase browser');
            return { browser: this.browser, page: this.page };
        } catch (error) {
            console.error('Failed to connect to Browserbase browser:', error);
            throw error;
        }
    }

    /**
     * Get debug connection URL for live session viewing
     */
    async getDebugUrl() {
        try {
            if (!this.sessionId) {
                throw new Error('No active session');
            }

            const response = await fetch(`https://www.browserbase.com/v1/sessions/${this.sessionId}/debug`, {
                method: 'GET',
                headers: {
                    'x-bb-api-key': process.env.BROWSERBASE_API_KEY
                }
            });

            const debugInfo = await response.json();
            console.log(`Debug URL: ${debugInfo.debuggerFullscreenUrl}`);
            return debugInfo.debuggerFullscreenUrl;
        } catch (error) {
            console.error('Failed to get debug URL:', error);
            throw error;
        }
    }

    /**
     * Take screenshot with enhanced error context
     */
    async takeScreenshot(filename = 'browserbase-screenshot') {
        try {
            if (!this.page) {
                throw new Error('No active page');
            }

            await fs.mkdir(this.logDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(this.logDir, `${filename}-${timestamp}.png`);
            
            await this.page.screenshot({ 
                path: screenshotPath, 
                fullPage: true 
            });
            
            console.log(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            throw error;
        }
    }

    /**
     * Intelligent login handler using LLM reasoning
     */
    async handleIntelligentLogin(email, password) {
        try {
            console.log('Starting intelligent Facebook login...');
            
            // Navigate to Facebook login
            await this.page.goto('https://www.facebook.com/login', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await this.takeScreenshot('login-page-loaded');

            // Use multiple selector strategies for email input
            const emailSelectors = [
                '#email',
                'input[name="email"]',
                'input[type="email"]',
                'input[placeholder*="email" i]',
                'input[aria-label*="email" i]'
            ];

            let emailInput = null;
            for (const selector of emailSelectors) {
                try {
                    emailInput = await this.page.$(selector);
                    if (emailInput) {
                        console.log(`Found email input with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!emailInput) {
                throw new Error('Could not find email input field');
            }

            // Clear and type email
            await emailInput.click({ clickCount: 3 });
            await emailInput.type(email, { delay: 100 });

            // Use multiple selector strategies for password input
            const passwordSelectors = [
                '#pass',
                'input[name="pass"]',
                'input[type="password"]',
                'input[placeholder*="password" i]',
                'input[aria-label*="password" i]'
            ];

            let passwordInput = null;
            for (const selector of passwordSelectors) {
                try {
                    passwordInput = await this.page.$(selector);
                    if (passwordInput) {
                        console.log(`Found password input with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!passwordInput) {
                throw new Error('Could not find password input field');
            }

            // Clear and type password
            await passwordInput.click({ clickCount: 3 });
            await passwordInput.type(password, { delay: 100 });

            await this.takeScreenshot('credentials-entered');

            // Find and click login button
            const loginSelectors = [
                'button[name="login"]',
                'button[type="submit"]',
                'input[type="submit"]',
                'button[data-testid="royal_login_button"]',
                'button:has-text("Log in")',
                'button:has-text("Log In")'
            ];

            let loginButton = null;
            for (const selector of loginSelectors) {
                try {
                    loginButton = await this.page.$(selector);
                    if (loginButton) {
                        console.log(`Found login button with selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!loginButton) {
                throw new Error('Could not find login button');
            }

            // Click login button
            await loginButton.click();
            console.log('Login button clicked');

            // Wait for navigation or additional screens
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot('after-login-click');

            // Handle potential additional login screens with intelligent detection
            return await this.handlePostLoginChallenges();

        } catch (error) {
            console.error('Intelligent login failed:', error);
            await this.takeScreenshot('login-error');
            throw error;
        }
    }

    /**
     * Handle post-login challenges using visual analysis
     */
    async handlePostLoginChallenges(maxAttempts = 5) {
        try {
            console.log('Checking for post-login challenges...');
            
            // Wait for page to stabilize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const currentUrl = this.page.url();
            console.log(`Current URL after login: ${currentUrl}`);

            // Check for various post-login scenarios
            const challengeIndicators = [
                // Security check screens
                'div[role="dialog"]',
                '[data-testid="checkpoint_title"]',
                'div:has-text("Security Check")',
                'div:has-text("Help us confirm")',
                'div:has-text("Please re-enter")',
                
                // Two-factor authentication
                'input[name="approvals_code"]',
                'div:has-text("Two-Factor")',
                'div:has-text("Enter the 6-digit code")',
                
                // Additional login prompts
                'input[type="password"]:not([name="pass"])',
                'button:has-text("Continue")',
                'button:has-text("Skip")',
                'button:has-text("Not Now")',
                
                // Success indicators
                '[data-testid="facebook_logo"]',
                'div[role="navigation"]',
                'a[href*="/marketplace"]'
            ];

            let challengeFound = false;
            let challengeType = 'unknown';

            for (const selector of challengeIndicators) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        challengeFound = true;
                        challengeType = selector;
                        console.log(`Found challenge indicator: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            await this.takeScreenshot('post-login-analysis');

            if (challengeFound) {
                console.log(`Handling post-login challenge: ${challengeType}`);
                
                // Prevent infinite loops
                if (maxAttempts <= 0) {
                    console.log('Max attempts reached for post-login challenges');
                    return await this.verifyLoginSuccess();
                }
                
                const result = await this.handleSpecificChallenge(challengeType);
                if (result && result.success) {
                    return result;
                }
                
                // Recursive call with decremented attempts
                return await this.handlePostLoginChallenges(maxAttempts - 1);
            }

            // Check if we're successfully logged in
            return await this.verifyLoginSuccess();

        } catch (error) {
            console.error('Failed to handle post-login challenges:', error);
            await this.takeScreenshot('post-login-error');
            throw error;
        }
    }

    /**
     * Handle specific login challenges
     */
    async handleSpecificChallenge(challengeType) {
        try {
            console.log(`Handling specific challenge: ${challengeType}`);
            let actionTaken = false;

            // Handle "Continue" or "Skip" buttons
            if (challengeType.includes('Continue') || challengeType.includes('Skip') || challengeType.includes('Not Now')) {
                const buttons = await this.page.$$('button');
                for (const button of buttons) {
                    const text = await button.evaluate(el => el.textContent?.trim().toLowerCase());
                    if (text && (text.includes('continue') || text.includes('skip') || text.includes('not now'))) {
                        console.log(`Clicking button: ${text}`);
                        await button.click();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await this.takeScreenshot('after-challenge-button');
                        actionTaken = true;
                        break;
                    }
                }
            }

            // Handle dialog boxes with more aggressive selectors
            if (challengeType.includes('dialog')) {
                const closeSelectors = [
                    'button[aria-label="Close"]',
                    'button[aria-label*="close" i]',
                    'div[role="dialog"] button:contains("Skip")',
                    'div[role="dialog"] button:contains("Not Now")',
                    'div[role="dialog"] button:contains("Maybe Later")',
                    'div[role="dialog"] button:contains("Cancel")',
                    'div[role="dialog"] [data-testid*="close"]',
                    'div[role="dialog"] svg[aria-label="Close"]',
                    // Try clicking outside the dialog
                    'div[role="dialog"]'
                ];

                for (const selector of closeSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element) {
                            console.log(`Found dialog element with selector: ${selector}`);
                            
                            if (selector === 'div[role="dialog"]') {
                                // Click outside the dialog to close it
                                const box = await element.boundingBox();
                                if (box) {
                                    await this.page.click(box.x - 10, box.y - 10);
                                    console.log('Clicked outside dialog to close');
                                }
                            } else {
                                await element.click();
                                console.log(`Clicked element: ${selector}`);
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            await this.takeScreenshot('after-dialog-close');
                            actionTaken = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                // If no specific close button found, try pressing Escape
                if (!actionTaken) {
                    console.log('Trying to close dialog with Escape key');
                    await this.page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    actionTaken = true;
                }
            }

            return { success: actionTaken };

        } catch (error) {
            console.error('Failed to handle specific challenge:', error);
            return { success: false };
        }
    }

    /**
     * Verify login success with multiple indicators
     */
    async verifyLoginSuccess() {
        try {
            console.log('Verifying login success...');

            const successIndicators = [
                // Facebook navigation elements
                '[data-testid="facebook_logo"]',
                'div[role="navigation"]',
                'a[href*="/marketplace"]',
                'a[href*="/profile"]',
                
                // User-specific elements
                'div[aria-label*="Account"]',
                'img[alt*="profile"]',
                
                // Main content areas
                'div[role="main"]',
                'div[data-testid="newsfeed"]'
            ];

            let loginSuccess = false;
            for (const selector of successIndicators) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        console.log(`Login success confirmed with: ${selector}`);
                        loginSuccess = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            await this.takeScreenshot('login-verification');

            if (loginSuccess) {
                console.log('Facebook login successful!');
                return { success: true, message: 'Login completed successfully' };
            } else {
                console.log('Login verification failed - may need manual intervention');
                const debugUrl = await this.getDebugUrl();
                return { 
                    success: false, 
                    message: 'Login verification failed',
                    debugUrl: debugUrl,
                    requiresManualIntervention: true
                };
            }

        } catch (error) {
            console.error('Login verification failed:', error);
            throw error;
        }
    }

    /**
     * Navigate to Facebook Marketplace with intelligent error handling
     */
    async navigateToMarketplace() {
        try {
            console.log('Navigating to Facebook Marketplace...');

            // Multiple strategies to reach marketplace
            const marketplaceStrategies = [
                // Direct URL navigation
                async () => {
                    await this.page.goto('https://www.facebook.com/marketplace', {
                        waitUntil: 'networkidle2',
                        timeout: 30000
                    });
                },
                
                // Click marketplace link
                async () => {
                    const marketplaceSelectors = [
                        'a[href*="/marketplace"]',
                        'a[aria-label*="Marketplace"]',
                        'div[data-testid*="marketplace"]'
                    ];

                    for (const selector of marketplaceSelectors) {
                        try {
                            const link = await this.page.$(selector);
                            if (link) {
                                await link.click();
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                return;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                    throw new Error('No marketplace link found');
                }
            ];

            let navigationSuccess = false;
            for (const strategy of marketplaceStrategies) {
                try {
                    await strategy();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verify we're on marketplace
                    const currentUrl = this.page.url();
                    if (currentUrl.includes('marketplace')) {
                        navigationSuccess = true;
                        console.log('Successfully navigated to Marketplace');
                        break;
                    }
                } catch (error) {
                    console.log(`Navigation strategy failed: ${error.message}`);
                    continue;
                }
            }

            await this.takeScreenshot('marketplace-navigation');

            if (!navigationSuccess) {
                throw new Error('Failed to navigate to Marketplace with all strategies');
            }

            return { success: true, url: this.page.url() };

        } catch (error) {
            console.error('Marketplace navigation failed:', error);
            await this.takeScreenshot('marketplace-error');
            throw error;
        }
    }

    /**
     * Close browser and clean up session
     */
    async close() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
            console.log('Browserbase session closed');
        } catch (error) {
            console.error('Error closing Browserbase session:', error);
        }
    }

    /**
     * Get session information
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            hasActiveBrowser: !!this.browser,
            hasActivePage: !!this.page
        };
    }
}

module.exports = BrowserbaseService;