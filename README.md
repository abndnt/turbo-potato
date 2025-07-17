# Facebook Marketplace Automation System

A comprehensive automation solution for posting items to Facebook Marketplace using Google Sheets as the data source. This system provides a web-based dashboard for monitoring, real-time status updates, and automated posting with image processing.

## 🚀 Features

- **Google Sheets Integration**: Use Google Sheets as your data source with automatic webhook triggers
- **Automated Facebook Posting**: Puppeteer-based automation for posting to Facebook Marketplace
- **Image Processing**: Automatic image optimization, resizing, and format conversion
- **Real-time Dashboard**: Web interface with live status updates and monitoring
- **Content Processing**: Automatic category mapping and description enhancement
- **Error Handling**: Comprehensive logging and error recovery
- **Rate Limiting**: Built-in delays and anti-detection measures
- **Status Tracking**: Real-time status updates back to Google Sheets

## 📋 Prerequisites

- Node.js 16+ installed
- Google Cloud Platform account with Sheets API enabled
- Facebook account for marketplace posting
- Basic knowledge of Google Apps Script (for webhook setup)

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <repository-url>
cd facebook-marketplace-automation
npm run setup  # Installs dependencies and builds frontend
```

**📋 For multi-machine development setup, see [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)**

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-project-id

# Facebook Credentials
FACEBOOK_EMAIL=your-facebook-email@example.com
FACEBOOK_PASSWORD=your-facebook-password

# Automation Settings
AUTOMATION_DELAY_MIN=30000
AUTOMATION_DELAY_MAX=60000
MAX_CONCURRENT_LISTINGS=1
ENABLE_HEADLESS=true

# File Upload Settings
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-key
```

### 3. Google Cloud Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Download the JSON key file
   - Extract `client_email`, `private_key`, and `project_id` for your `.env` file

4. **Share Your Google Sheet**:
   - Share your Google Sheet with the service account email
   - Give "Editor" permissions

### 4. Google Sheets Setup

Create a Google Sheet with the following columns (in this exact order):

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Item Name | Description | Price | Category | Condition | Photos | Location | Status | Listing URL | Error Log |

**Column Descriptions**:
- **Item Name**: Item title (required)
- **Description**: Item description (required)
- **Price**: Item price in dollars (required)
- **Category**: Facebook Marketplace category
- **Condition**: Item condition (New, Used, etc.)
- **Photos**: Image file names or URLs (comma-separated)
- **Location**: Pickup location
- **Status**: Processing status - use "Process" or "Ready" for items to be processed
- **Listing URL**: Facebook listing URL (auto-filled after posting)
- **Error Log**: Error messages (auto-filled if errors occur)

**📋 For detailed sheet configuration, see [SHEET_CONFIGURATION_GUIDE.md](SHEET_CONFIGURATION_GUIDE.md)**

### 5. Google Apps Script Setup

1. **Open Google Apps Script**:
   - In your Google Sheet, go to "Extensions" > "Apps Script"

2. **Add the Webhook Script**:
   - Replace the default code with the content from `google-apps-script/webhook-trigger.gs`
   - Update the `WEBHOOK_URL` constant with your server URL

3. **Deploy as Web App**:
   - Click "Deploy" > "New Deployment"
   - Choose "Web app" as type
   - Set execute as "Me" and access to "Anyone"
   - Copy the web app URL for status updates

4. **Initialize the Script**:
   - Run the `initialize()` function to set up triggers
   - Authorize the script when prompted

## 🚀 Usage

### Starting the Server

**Development Mode** (with frontend auto-build):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The dashboard will be available at `http://localhost:3000`

### Development Workflow

For frontend changes:
1. Edit files in `src/frontend/`
2. Run `npm run build-frontend` to update `public/`
3. Refresh browser to see changes

**📋 For complete development setup, see [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)**

### Using the Dashboard

1. **Google Sheets Integration**:
   - Enter your Google Sheets URL
   - Click "Validate Sheet" to check structure
   - Click "Process Sheet" to start automation

2. **Manual Control**:
   - Use "Start Automation" to begin processing
   - "Pause" to temporarily stop
   - "Stop" to completely halt automation

3. **Monitoring**:
   - View real-time status updates
   - Monitor processing statistics
   - Check activity logs

### Adding Items to Google Sheets

1. Add new rows to your Google Sheet with item details
2. The Google Apps Script will automatically detect new items
3. Items will be processed according to your automation settings
4. Status updates will appear in real-time on the dashboard

## 📊 API Endpoints

### Dashboard API
- `GET /api/stats` - Get automation statistics
- `GET /api/listings` - Get recent listings
- `POST /api/validate-sheet` - Validate Google Sheet structure
- `POST /api/process-sheet` - Process Google Sheet items

### Automation Control
- `POST /api/automation/start` - Start automation
- `POST /api/automation/stop` - Stop automation
- `POST /api/automation/pause` - Pause automation

### Webhook Endpoints
- `POST /webhook/google-sheets` - Google Sheets webhook
- `POST /webhook/status-update` - Status update webhook

## 🔧 Configuration Options

### Automation Settings

```javascript
// Delay between actions (milliseconds)
AUTOMATION_DELAY_MIN=30000  // 30 seconds minimum
AUTOMATION_DELAY_MAX=60000  // 60 seconds maximum

// Concurrent processing
MAX_CONCURRENT_LISTINGS=1   // Process one item at a time

// Browser settings
ENABLE_HEADLESS=true        // Run browser in headless mode
```

### Image Processing

```javascript
// File upload limits
MAX_FILE_SIZE=10485760      // 10MB max file size
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp

// Image optimization
IMAGE_QUALITY=80            // JPEG quality (1-100)
MAX_IMAGE_WIDTH=1200        // Maximum width in pixels
MAX_IMAGE_HEIGHT=1200       // Maximum height in pixels
```

## 🛡️ Security Considerations

### Important Disclaimers

⚠️ **Legal Compliance**: This tool is for educational purposes. Users are responsible for:
- Complying with Facebook's Terms of Service
- Following local laws and regulations
- Respecting rate limits and platform policies
- Using the tool ethically and responsibly

### Security Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **Webhook Security**: Use strong webhook secrets
3. **Access Control**: Limit Google Sheets access to necessary accounts
4. **Rate Limiting**: Respect Facebook's rate limits to avoid account restrictions
5. **Monitoring**: Regularly monitor logs for unusual activity

## 🐛 Troubleshooting

### Common Issues

1. **Google Sheets API Errors**:
   - Verify service account permissions
   - Check if Sheets API is enabled
   - Ensure sheet is shared with service account

2. **Facebook Login Issues**:
   - Check credentials in `.env` file
   - Verify account isn't locked or restricted
   - Consider using app-specific passwords

3. **Image Upload Problems**:
   - Check file size limits
   - Verify supported image formats
   - Ensure upload directory exists and is writable

4. **Webhook Not Triggering**:
   - Verify Google Apps Script deployment
   - Check webhook URL configuration
   - Review Apps Script execution logs

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=true
```

### Log Files

Logs are stored in:
- `logs/combined.log` - All log entries
- `logs/error.log` - Error logs only
- `logs/automation.log` - Automation-specific logs

## 📈 Monitoring and Analytics

### Dashboard Statistics

- **Total Listings**: Number of items processed
- **Successful Posts**: Successfully posted items
- **Failed Attempts**: Failed posting attempts
- **Processing Queue**: Items waiting to be processed

### Activity Log

Real-time activity log showing:
- Processing status updates
- Error messages and warnings
- System events and notifications
- Automation start/stop events

## 🔄 Updates and Maintenance

### Regular Maintenance

1. **Log Rotation**: Logs are automatically rotated to prevent disk space issues
2. **Image Cleanup**: Processed images are cleaned up automatically
3. **Database Maintenance**: Consider periodic cleanup of old records

### Updating the System

```bash
git pull origin main
npm install
npm restart
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Users are solely responsible for compliance with Facebook's Terms of Service and applicable laws. The developers are not responsible for any account restrictions, legal issues, or damages resulting from the use of this software.

## 🆘 Support

For support and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Create an issue on GitHub with detailed information
4. Include relevant log entries and configuration (without sensitive data)

---

**Remember**: Always test with a small number of items first and monitor the results before scaling up your automation.