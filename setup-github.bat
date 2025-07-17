@echo off
echo ========================================
echo Facebook Marketplace Automation
echo GitHub Setup Script
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH
    echo.
    echo Please install Git first:
    echo 1. Download from: https://git-scm.com/download/win
    echo 2. Or run: winget install --id Git.Git -e --source winget
    echo 3. Restart command prompt after installation
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ Git is installed
git --version
echo.

REM Check if already a git repository
if exist ".git" (
    echo ⚠️  Git repository already exists
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" (
        echo Cancelled.
        pause
        exit /b 0
    )
) else (
    echo Initializing Git repository...
    git init
    if %errorlevel% neq 0 (
        echo ERROR: Failed to initialize Git repository
        pause
        exit /b 1
    )
    echo ✅ Git repository initialized
)

echo.
echo Checking Git configuration...
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Git user configuration not found.
    set /p username="Enter your name: "
    set /p email="Enter your email: "
    git config --global user.name "%username%"
    git config --global user.email "%email%"
    echo ✅ Git configuration set
)

echo.
echo Current Git configuration:
git config user.name
git config user.email
echo.

echo Adding files to Git...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo ✅ Files added to staging

echo.
echo Creating initial commit...
git commit -m "Initial commit: Facebook Marketplace Automation System

- Complete Node.js/Express backend with Socket.IO
- Google Sheets API integration with webhook triggers  
- Facebook automation using Puppeteer
- Image processing with Sharp
- Real-time web dashboard
- Comprehensive logging and error handling
- Google Apps Script for webhook automation
- Professional UI with responsive design"

if %errorlevel% neq 0 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)
echo ✅ Initial commit created

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Create a new repository on GitHub:
echo    - Go to https://github.com
echo    - Click "New repository"
echo    - Name: facebook-marketplace-automation
echo    - Description: Automated Facebook Marketplace posting system
echo    - Choose Public or Private
echo    - DO NOT initialize with README
echo    - Click "Create repository"
echo.
echo 2. Copy the repository URL (should look like):
echo    https://github.com/YOUR_USERNAME/facebook-marketplace-automation.git
echo.

set /p repo_url="Paste your GitHub repository URL here: "

if "%repo_url%"=="" (
    echo No URL provided. You can add the remote manually later:
    echo git remote add origin YOUR_REPO_URL
    echo git branch -M main
    echo git push -u origin main
    pause
    exit /b 0
)

echo.
echo Adding GitHub remote...
git remote add origin "%repo_url%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to add remote. Check the URL and try again.
    pause
    exit /b 1
)

echo ✅ Remote added
echo.

echo Setting main branch...
git branch -M main
echo ✅ Main branch set

echo.
echo Pushing to GitHub...
echo (You may be prompted for GitHub credentials)
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 SUCCESS!
    echo ========================================
    echo.
    echo Your code has been pushed to GitHub!
    echo Repository URL: %repo_url%
    echo.
    echo You can now:
    echo - View your code on GitHub
    echo - Share the repository with others
    echo - Clone it on other machines
    echo - Set up GitHub Actions for CI/CD
    echo.
) else (
    echo.
    echo ========================================
    echo ⚠️  PUSH FAILED
    echo ========================================
    echo.
    echo This might be due to:
    echo - Authentication issues
    echo - Repository doesn't exist
    echo - Network problems
    echo.
    echo Try pushing manually:
    echo git push -u origin main
    echo.
)

echo.
echo Press any key to exit...
pause >nul