// Load environment variables
require('dotenv').config();

const { facebookAutomation } = require('./src/services/automation');
const logger = require('./src/utils/logger');

async function testFacebookLogin() {
  try {
    console.log('Starting Facebook login test...');
    
    // Initialize the automation
    await facebookAutomation.initialize();
    console.log('✓ Facebook automation initialized');
    
    // Attempt login
    const loginResult = await facebookAutomation.login();
    
    if (loginResult) {
      console.log('✓ Facebook login successful!');
      
      // Test navigation to marketplace
      try {
        await facebookAutomation.navigateToMarketplace();
        console.log('✓ Successfully navigated to Facebook Marketplace');
      } catch (navError) {
        console.error('✗ Failed to navigate to marketplace:', navError.message);
      }
    } else {
      console.error('✗ Facebook login failed');
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Close browser
    try {
      await facebookAutomation.close();
      console.log('✓ Browser closed');
    } catch (closeError) {
      console.error('Error closing browser:', closeError.message);
    }
  }
}

// Run the test
testFacebookLogin().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});