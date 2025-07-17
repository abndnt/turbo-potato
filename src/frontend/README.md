# Frontend Source Files

This directory contains the source files for the Facebook Marketplace Automation dashboard frontend.

## 📁 Directory Structure

```
src/frontend/
├── index.html      # Main dashboard HTML template
├── styles.css      # Dashboard styling and responsive design
├── script.js       # Dashboard JavaScript functionality
└── README.md       # This file
```

## 🔨 Build Process

The frontend files in this directory are **source files** that get copied to the `public/` directory during the build process.

### Build Commands

```bash
# Build frontend assets
npm run build-frontend

# Clean and rebuild
npm run rebuild

# Development with auto-build
npm run dev
```

### How It Works

1. **Source**: Files in `src/frontend/` are version controlled
2. **Build**: [`scripts/build-frontend.js`](../../scripts/build-frontend.js) copies files to `public/`
3. **Serve**: Express server serves files from `public/` directory
4. **Ignore**: `public/` directory is ignored by Git for security

## 🔄 Multi-Machine Development

This setup enables development across multiple machines (Windows desktop + Mac laptop):

### Initial Setup (any machine)
```bash
git clone https://github.com/abndnt/turbo-potato.git
cd turbo-potato
npm run setup  # Installs dependencies and builds frontend
```

### Daily Development Workflow
```bash
git pull origin main
npm run build-frontend  # Regenerate public/ files
npm start               # Start the server
```

### Making Frontend Changes
1. Edit files in `src/frontend/`
2. Run `npm run build-frontend` to update `public/`
3. Refresh browser to see changes
4. Commit changes to `src/frontend/` (not `public/`)

## 🛡️ Security Benefits

- ✅ **Source code** is version controlled
- ✅ **Build artifacts** are ignored by Git
- ✅ **Sensitive files** stay out of repository
- ✅ **Node.js conventions** are maintained
- ✅ **Multi-machine sync** works seamlessly

## 📝 File Descriptions

### [`index.html`](index.html)
Main dashboard template with:
- Real-time status monitoring
- Google Sheets integration display
- Responsive layout for mobile/desktop
- Socket.io connection for live updates

### [`styles.css`](styles.css)
Dashboard styling including:
- Modern card-based layout
- Responsive grid system
- Status indicators and animations
- Mobile-first design approach

### [`script.js`](script.js)
Dashboard functionality:
- Socket.io real-time communication
- Status updates and notifications
- Google Sheets data display
- Error handling and user feedback