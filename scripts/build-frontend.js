#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'src', 'frontend');
const targetDir = path.join(__dirname, '..', 'public');

/**
 * Recursively copy files from source to target directory
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectory(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read all files and directories in source
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied: ${entry.name}`);
    }
  }
}

/**
 * Main build function
 */
function buildFrontend() {
  console.log('🔨 Building frontend assets...');
  console.log(`📁 Source: ${sourceDir}`);
  console.log(`📁 Target: ${targetDir}`);
  console.log('');

  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Error: Frontend source directory not found!');
    console.error(`   Expected: ${sourceDir}`);
    process.exit(1);
  }

  try {
    // Copy all files from src/frontend to public
    copyDirectory(sourceDir, targetDir);
    
    console.log('');
    console.log('✅ Frontend build completed successfully!');
    console.log(`📦 Files copied to: ${targetDir}`);
  } catch (error) {
    console.error('❌ Error building frontend:', error.message);
    process.exit(1);
  }
}

// Run the build if this script is executed directly
if (require.main === module) {
  buildFrontend();
}

module.exports = { buildFrontend };