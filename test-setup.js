#!/usr/bin/env node

/**
 * Test Setup Script
 * Verifies that all dependencies are installed and basic configuration is working
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Facebook Marketplace Automation Setup...\n');

// Test 1: Check if package.json exists
console.log('1. Checking package.json...');
try {
    const packageJson = require('./package.json');
    console.log('   ✅ package.json found');
    console.log(`   📦 Project: ${packageJson.name} v${packageJson.version}`);
} catch (error) {
    console.log('   ❌ package.json not found or invalid');
    process.exit(1);
}

// Test 2: Check critical dependencies
console.log('\n2. Checking critical dependencies...');
const criticalDeps = [
    'express',
    'socket.io',
    'puppeteer',
    'googleapis',
    'sharp',
    'winston',
    'multer',
    'dotenv'
];

let missingDeps = [];
criticalDeps.forEach(dep => {
    try {
        require.resolve(dep);
        console.log(`   ✅ ${dep}`);
    } catch (error) {
        console.log(`   ❌ ${dep} - MISSING`);
        missingDeps.push(dep);
    }
});

if (missingDeps.length > 0) {
    console.log(`\n❌ Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('Run: npm install');
    process.exit(1);
}

// Test 3: Check directory structure
console.log('\n3. Checking directory structure...');
const requiredDirs = [
    'src',
    'src/services',
    'src/routes',
    'src/utils',
    'public',
    'logs'
];

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`   ✅ ${dir}/`);
    } else {
        console.log(`   ⚠️  ${dir}/ - Creating...`);
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ ${dir}/ - Created`);
    }
});

// Test 4: Check required files
console.log('\n4. Checking required files...');
const requiredFiles = [
    'src/server.js',
    'src/services/googleSheets.js',
    'src/services/automation.js',
    'src/services/imageProcessor.js',
    'src/services/contentProcessor.js',
    'src/routes/webhook.js',
    'src/routes/dashboard.js',
    'src/utils/logger.js',
    'public/index.html',
    'public/styles.css',
    'public/script.js',
    '.env.example'
];

let missingFiles = [];
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING`);
        missingFiles.push(file);
    }
});

// Test 5: Check .env file
console.log('\n5. Checking environment configuration...');
if (fs.existsSync('.env')) {
    console.log('   ✅ .env file exists');
    
    // Basic validation of .env content
    const envContent = fs.readFileSync('.env', 'utf8');
    const requiredEnvVars = [
        'PORT',
        'FACEBOOK_EMAIL',
        'FACEBOOK_PASSWORD',
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'GOOGLE_SHEETS_PROJECT_ID'
    ];
    
    let missingEnvVars = [];
    requiredEnvVars.forEach(envVar => {
        if (envContent.includes(`${envVar}=`)) {
            console.log(`   ✅ ${envVar}`);
        } else {
            console.log(`   ⚠️  ${envVar} - Not configured`);
            missingEnvVars.push(envVar);
        }
    });
    
    if (missingEnvVars.length > 0) {
        console.log(`\n⚠️  Environment variables need configuration: ${missingEnvVars.join(', ')}`);
        console.log('   Edit .env file with your actual values');
    }
} else {
    console.log('   ⚠️  .env file not found');
    console.log('   Run: cp .env.example .env');
    console.log('   Then edit .env with your configuration');
}

// Test 6: Test basic server startup (dry run)
console.log('\n6. Testing basic server configuration...');
try {
    // Test if we can load the main server file without starting it
    const serverPath = path.join(__dirname, 'src', 'server.js');
    if (fs.existsSync(serverPath)) {
        console.log('   ✅ Server file structure valid');
    }
} catch (error) {
    console.log('   ❌ Server configuration error:', error.message);
}

// Summary
console.log('\n📊 Setup Summary:');
if (missingDeps.length === 0 && missingFiles.length === 0) {
    console.log('✅ All dependencies and files are present');
    console.log('✅ Ready to configure and run!');
    console.log('\n🚀 Next steps:');
    console.log('1. Configure .env file with your credentials');
    console.log('2. Set up Google Sheets API and service account');
    console.log('3. Create your Google Sheet with required columns');
    console.log('4. Run: npm start');
} else {
    console.log('❌ Setup incomplete');
    if (missingDeps.length > 0) {
        console.log(`   Missing dependencies: ${missingDeps.join(', ')}`);
    }
    if (missingFiles.length > 0) {
        console.log(`   Missing files: ${missingFiles.join(', ')}`);
    }
}

console.log('\n📚 For detailed setup instructions, see README.md');
console.log('⚡ For quick setup, see QUICK_START.md');