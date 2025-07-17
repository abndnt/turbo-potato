# GitHub Setup Guide

This guide will help you push your Facebook Marketplace Automation code to GitHub.

## Step 1: Install Git

### Option A: Download Git for Windows
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download and install Git for Windows
3. During installation, choose "Git from the command line and also from 3rd-party software"
4. Restart your command prompt/PowerShell after installation

### Option B: Install via Chocolatey (if you have it)
```powershell
choco install git
```

### Option C: Install via Winget
```powershell
winget install --id Git.Git -e --source winget
```

## Step 2: Verify Git Installation

Open a new command prompt/PowerShell and run:
```bash
git --version
```

You should see something like: `git version 2.x.x.windows.x`

## Step 3: Configure Git (First Time Setup)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 4: Initialize Repository and Push to GitHub

### Navigate to your project directory:
```bash
cd "C:\Users\caoda\Documents\facebook-marketplace-automation"
```

### Initialize Git repository:
```bash
git init
```

### Add all files to staging:
```bash
git add .
```

### Create initial commit:
```bash
git commit -m "Initial commit: Facebook Marketplace Automation System

- Complete Node.js/Express backend with Socket.IO
- Google Sheets API integration with webhook triggers
- Facebook automation using Puppeteer
- Image processing with Sharp
- Real-time web dashboard
- Comprehensive logging and error handling
- Google Apps Script for webhook automation
- Professional UI with responsive design"
```

### Create GitHub repository:
1. Go to [https://github.com](https://github.com)
2. Click "New repository" (green button)
3. Repository name: `facebook-marketplace-automation`
4. Description: `Automated Facebook Marketplace posting system with Google Sheets integration`
5. Choose Public or Private
6. **DO NOT** initialize with README (we already have one)
7. Click "Create repository"

### Connect local repository to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/facebook-marketplace-automation.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Push to GitHub:
```bash
git branch -M main
git push -u origin main
```

## Step 5: Verify Upload

1. Go to your GitHub repository
2. Verify all files are uploaded
3. Check that `.env` file is NOT uploaded (should be in .gitignore)

## Alternative: GitHub Desktop

If you prefer a GUI:

1. Download [GitHub Desktop](https://desktop.github.com/)
2. Install and sign in to your GitHub account
3. Click "Add an Existing Repository from your Hard Drive"
4. Select your project folder
5. Click "Publish repository" to push to GitHub

## Repository Structure

Your GitHub repository will contain:

```
facebook-marketplace-automation/
├── src/                          # Backend source code
├── public/                       # Frontend dashboard
├── google-apps-script/           # Google Apps Script files
├── logs/                         # Log directory (empty)
├── package.json                  # Dependencies
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── README.md                     # Main documentation
├── QUICK_START.md               # Quick setup guide
├── GITHUB_SETUP.md              # This file
└── test-setup.js                # Setup validation
```

## Security Notes

✅ **Safe files included:**
- All source code
- Documentation
- Configuration templates
- Package definitions

❌ **Sensitive files excluded:**
- `.env` (contains credentials)
- `node_modules/` (dependencies)
- `logs/` (log files)
- Upload directories

## Updating Repository

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

## Cloning Repository

Others can clone your repository:

```bash
git clone https://github.com/YOUR_USERNAME/facebook-marketplace-automation.git
cd facebook-marketplace-automation
npm install
cp .env.example .env
# Edit .env with their credentials
npm start
```

## Troubleshooting

### Git not recognized
- Restart command prompt after installing Git
- Check if Git is in your PATH environment variable

### Permission denied (publickey)
- Set up SSH keys or use HTTPS authentication
- Use GitHub Personal Access Token for HTTPS

### Repository already exists
- Use a different repository name
- Or delete the existing repository and recreate

## Next Steps

1. Install Git using one of the methods above
2. Follow the commands in Step 4
3. Your code will be safely stored on GitHub
4. Share the repository URL with others
5. Set up GitHub Actions for CI/CD (optional)

---

**Need help?** Create an issue in your repository or check GitHub's documentation.