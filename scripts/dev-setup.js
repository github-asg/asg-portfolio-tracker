#!/usr/bin/env node

/**
 * Development setup script for Stock Portfolio Manager
 * This script helps set up the development environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Stock Portfolio Manager development environment...\n');

// Check Node.js version
const nodeVersion = process.version;
const requiredVersion = 'v18.0.0';
console.log(`📋 Node.js version: ${nodeVersion}`);

if (nodeVersion < requiredVersion) {
  console.error(`❌ Node.js ${requiredVersion} or higher is required`);
  process.exit(1);
}

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Create necessary directories
const directories = [
  'src/main/database',
  'src/main/api',
  'src/utils/calculations',
  'src/utils/formatting',
  'src/utils/constants',
  'tests/unit',
  'tests/integration',
  'tests/fixtures',
  'logs',
  'userData'
];

console.log('📁 Creating project directories...');
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   ✅ Created ${dir}`);
  } else {
    console.log(`   ⏭️  ${dir} already exists`);
  }
});

// Create placeholder files
const placeholders = [
  'src/main/database/index.js',
  'src/main/api/breezeClient.js',
  'src/utils/calculations/fifo.js',
  'src/utils/formatting/indian.js',
  'src/utils/constants/index.js',
  'logs/.gitkeep',
  'userData/.gitkeep'
];

console.log('\n📄 Creating placeholder files...');
placeholders.forEach(file => {
  if (!fs.existsSync(file)) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (file.endsWith('.gitkeep')) {
      fs.writeFileSync(file, '# This file keeps the directory in git\n');
    } else {
      fs.writeFileSync(file, `// ${path.basename(file)} - To be implemented\n\nmodule.exports = {};\n`);
    }
    console.log(`   ✅ Created ${file}`);
  } else {
    console.log(`   ⏭️  ${file} already exists`);
  }
});

// Check if dependencies are installed
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const nodeModulesExists = fs.existsSync('node_modules');
  
  if (!nodeModulesExists) {
    console.log('   ⚠️  Dependencies not installed. Run: npm install');
  } else {
    console.log('   ✅ Dependencies are installed');
  }
} catch (error) {
  console.error('   ❌ Error reading package.json:', error.message);
}

// Create environment template
const envTemplate = `# Stock Portfolio Manager Environment Variables
# Copy this file to .env and fill in your values

# Development settings
ELECTRON_IS_DEV=1
NODE_ENV=development

# Database settings
DB_PATH=./userData/portfolio.db

# API settings (fill these in when you have ICICI Breeze credentials)
# BREEZE_API_KEY=your_api_key_here
# BREEZE_API_SECRET=your_api_secret_here

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
SESSION_TIMEOUT=1800000
PASSWORD_SALT_ROUNDS=10
`;

if (!fs.existsSync('.env.example')) {
  fs.writeFileSync('.env.example', envTemplate);
  console.log('\n📝 Created .env.example file');
  console.log('   💡 Copy this to .env and configure your settings');
}

// Development tips
console.log('\n🎯 Development Setup Complete!');
console.log('\n📚 Next steps:');
console.log('   1. Install dependencies: npm install');
console.log('   2. Copy .env.example to .env and configure');
console.log('   3. Start development: npm run dev');
console.log('   4. Open http://localhost:3000 in your browser');
console.log('\n🔧 Available commands:');
console.log('   npm run dev          - Start development with hot reload');
console.log('   npm run build        - Build for production');
console.log('   npm run dist         - Create distribution packages');
console.log('   npm test             - Run tests');
console.log('   npm run lint         - Check code style');
console.log('   npm run format       - Format code');
console.log('\n📖 Documentation:');
console.log('   README.md            - Project overview and setup');
console.log('   .kiro/specs/         - Feature specifications');
console.log('   .kiro/steering/      - Development guidelines');

console.log('\n✨ Happy coding! 🚀');