# Quick Start Guide

Get your Facebook Marketplace automation system up and running in 15 minutes!

## 🚀 Quick Setup (15 minutes)

### Step 1: Install Dependencies (2 minutes)
```bash
npm install
```

### Step 2: Basic Configuration (5 minutes)
1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with minimum required settings:
```env
PORT=3000
FACEBOOK_EMAIL=your-email@example.com
FACEBOOK_PASSWORD=your-password
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-project-id
```

### Step 3: Google Sheets Setup (5 minutes)
1. Create a new Google Sheet
2. Add these column headers in row 1:
   ```
   Item Name | Description | Price | Category | Condition | Photos | Location | Status | Listing URL | Error Log
   ```
3. Share the sheet with your service account email (Editor permissions)

📋 **For detailed sheet configuration, see [SHEET_CONFIGURATION_GUIDE.md](SHEET_CONFIGURATION_GUIDE.md)**

### Step 4: Test Run (3 minutes)
```bash
npm start
```

Visit `http://localhost:3000` to see your dashboard!

## 🧪 Test with Sample Data

Add this sample row to your Google Sheet:

| Item Name | Description | Price | Category | Condition | Photos | Location | Status |
|-----------|-------------|-------|----------|-----------|---------|----------|---------|
| Test Item | This is a test listing for the automation system | 25 | Electronics | Used | | New York, NY | Ready |

Then use the dashboard to validate and process your sheet.

## ⚡ Quick Commands

```bash
# Start the server
npm start

# Start in development mode with auto-restart
npm run dev

# Run tests
npm test

# Check logs
tail -f logs/combined.log
```

## 🔧 Minimal Google Cloud Setup

1. **Create Project**: Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable API**: Enable "Google Sheets API"
3. **Service Account**: Create service account, download JSON key
4. **Extract Credentials**: Get `client_email`, `private_key`, `project_id` from JSON

## 📱 Dashboard Features

- **Sheet Validation**: Test your Google Sheets connection
- **Manual Processing**: Process items on-demand
- **Real-time Monitoring**: Live status updates
- **Activity Logs**: See what's happening in real-time

## 🚨 First-Time Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Google Sheets API enabled
- [ ] Service account created and configured
- [ ] Google Sheet created with correct headers
- [ ] Sheet shared with service account
- [ ] Facebook credentials added
- [ ] Server starts without errors (`npm start`)
- [ ] Dashboard accessible at `http://localhost:3000`
- [ ] Sheet validation passes
- [ ] Test item processes successfully

## 🆘 Quick Troubleshooting

**Server won't start?**
- Check `.env` file syntax
- Verify all required environment variables are set

**Google Sheets validation fails?**
- Ensure sheet is shared with service account email
- Check column headers match exactly
- Verify Google Sheets API is enabled

**Facebook login issues?**
- Double-check email/password in `.env`
- Try logging in manually to verify credentials
- Check for account restrictions

**Need help?** Check the full README.md for detailed troubleshooting.

---

🎉 **You're ready to automate!** Start by adding items to your Google Sheet and watch them get processed automatically.