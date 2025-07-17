# Development Guide - Multi-Machine Setup

This guide explains how to develop the Facebook Marketplace Automation project across multiple machines (Windows desktop + Mac laptop) while maintaining security best practices.

## 🏗️ **Architecture Overview**

```
Project Structure:
├── src/frontend/          # ✅ Version controlled source files
│   ├── index.html         # Dashboard HTML template
│   ├── styles.css         # Dashboard styling
│   ├── script.js          # Dashboard JavaScript
│   └── README.md          # Frontend documentation
├── scripts/
│   └── build-frontend.js  # ✅ Build script (version controlled)
├── public/                # ❌ Generated files (Git ignored)
│   ├── index.html         # Built from src/frontend/
│   ├── styles.css         # Built from src/frontend/
│   └── script.js          # Built from src/frontend/
└── package.json           # ✅ Updated with build scripts
```

## 🔄 **Multi-Machine Workflow**

### **Initial Setup (Both Machines)**

```bash
# Clone the repository
git clone https://github.com/abndnt/turbo-potato.git
cd turbo-potato

# Install dependencies and build frontend
npm run setup
```

### **Daily Development Workflow**

```bash
# Pull latest changes
git pull origin main

# Rebuild frontend (regenerates public/ from src/frontend/)
npm run build-frontend

# Start development server
npm run dev
```

## 📜 **Available Scripts**

| Script | Command | Description |
|--------|---------|-------------|
| **Setup** | `npm run setup` | Install dependencies + build frontend |
| **Development** | `npm run dev` | Build frontend + start with nodemon |
| **Build Frontend** | `npm run build-frontend` | Copy src/frontend/ → public/ |
| **Clean** | `npm run clean` | Remove all files from public/ |
| **Rebuild** | `npm run rebuild` | Clean + build frontend |
| **Start** | `npm start` | Start production server |

## 🛠️ **Making Frontend Changes**

### **Step-by-Step Process**

1. **Edit source files** in `src/frontend/`:
   ```bash
   # Edit any of these files:
   src/frontend/index.html
   src/frontend/styles.css
   src/frontend/script.js
   ```

2. **Build the frontend**:
   ```bash
   npm run build-frontend
   ```

3. **Test your changes**:
   - Refresh browser at `http://localhost:3000`
   - Check console for errors
   - Verify functionality

4. **Commit your changes**:
   ```bash
   git add src/frontend/
   git commit -m "Update dashboard styling"
   git push origin main
   ```

### **What Gets Committed vs Ignored**

✅ **Committed to Git:**
- `src/frontend/` - Source files
- `scripts/build-frontend.js` - Build script
- `package.json` - Updated scripts
- All documentation files

❌ **Ignored by Git:**
- `public/` - Generated build artifacts
- `.env` - Environment variables
- `node_modules/` - Dependencies

## 🔒 **Security Benefits**

This approach maintains Node.js security conventions:

- **Source Control**: Only source files are version controlled
- **Build Artifacts**: Generated files stay local and ignored
- **Environment Variables**: `.env` remains excluded
- **Sensitive Data**: No accidental exposure of build outputs
- **Clean Repository**: Only essential files in Git history

## 🚀 **Deployment Considerations**

### **Production Deployment**

```bash
# On production server
git clone https://github.com/abndnt/turbo-potato.git
cd turbo-potato
npm run setup  # Installs deps + builds frontend
npm start      # Starts production server
```

### **CI/CD Integration**

```yaml
# Example GitHub Actions workflow
- name: Setup and Build
  run: |
    npm install
    npm run build-frontend
    npm start
```

## 🔧 **Troubleshooting**

### **Common Issues**

**Problem**: `public/` directory is empty
```bash
# Solution: Run the build script
npm run build-frontend
```

**Problem**: Changes not showing in browser
```bash
# Solution: Rebuild and refresh
npm run rebuild
# Then refresh browser (Ctrl+F5 / Cmd+Shift+R)
```

**Problem**: Build script fails
```bash
# Check if source directory exists
ls -la src/frontend/

# Rebuild from scratch
npm run clean
npm run build-frontend
```

**Problem**: Git conflicts with public/ files
```bash
# This shouldn't happen since public/ is ignored
# But if it does, remove from tracking:
git rm -r --cached public/
git commit -m "Remove public/ from tracking"
```

## 📱 **Development Tips**

### **Live Development**

```bash
# Terminal 1: Start server with auto-restart
npm run dev

# Terminal 2: Watch for frontend changes
# (Manual rebuild required after changes)
npm run build-frontend
```

### **Quick Testing**

```bash
# Test build script
npm run build-frontend

# Verify files copied
ls -la public/

# Check server response
curl http://localhost:3000
```

### **Cross-Platform Compatibility**

The build script uses Node.js built-in modules for maximum compatibility:
- ✅ **Windows**: Works with PowerShell, CMD, Git Bash
- ✅ **macOS**: Works with Terminal, iTerm2
- ✅ **Linux**: Works with any shell

## 🎯 **Best Practices**

1. **Always run `npm run build-frontend`** after pulling changes
2. **Test locally** before committing frontend changes
3. **Use `npm run dev`** for development (auto-builds frontend)
4. **Commit frequently** to avoid conflicts
5. **Document changes** in commit messages
6. **Keep `.env` files** synchronized manually between machines

This setup provides a secure, maintainable way to develop across multiple machines while following Node.js conventions and security best practices.