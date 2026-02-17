# Technology Stack & Build System

## Tech Stack

### Desktop Framework
- **Electron** - Cross-platform desktop application (Windows & Mac)
- **Node.js** - Backend runtime
- **React** - Frontend UI framework
- **SQLite** - Local database for storing all portfolio data

### Key Libraries
- **bcrypt** - Password hashing
- **electron-store** - App configuration storage
- **axios** - ICICI Breeze API integration
- **date-fns** - Financial year calculations
- **recharts** or **chart.js** - Portfolio visualization
- **electron-builder** - Packaging Windows and Mac installers

## Common Commands

```bash
# Development
npm run dev            # Start development server
npm run electron-dev   # Start Electron in development mode

# Building
npm run build          # Build React app
npm run electron-pack  # Package Electron app
npm run dist           # Create installers for Windows/Mac

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode

# Linting
npm run lint           # Check code style
npm run lint:fix       # Auto-fix style issues

# Type Checking (TypeScript)
npm run type-check     # Verify type safety
```

## Code Style Conventions

- **Language**: JavaScript/TypeScript
- **Indentation**: 2 spaces
- **Line length**: 100 characters
- **Naming**: 
  - camelCase for variables/functions
  - PascalCase for React components/classes
  - kebab-case for file names
- **Imports**: Organize alphabetically, group external/internal
- **Currency**: Always use ₹ symbol and Indian numbering format

## Indian-Specific Formatting

```javascript
// Number formatting
const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Date formatting: DD-MMM-YYYY
const formatDate = (date) => {
  return format(date, 'dd-MMM-yyyy');
};

// Financial Year calculation
const getFinancialYear = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 3 ? `FY ${year}-${year + 1}` : `FY ${year - 1}-${year}`;
};
```

## Security Requirements

- **Password Hashing**: bcrypt with cost factor 10
- **API Credentials**: AES-256 encryption
- **Local Storage**: SQLite database in user's AppData folder
- **No Cloud Sync**: All data remains local
- **Session Management**: Auto-logout after inactivity

## Performance Targets

- Login: < 1 second
- Dashboard load: < 2 seconds
- Add transaction: < 500ms
- Generate report: < 5 seconds for 1 year data
- API price refresh: < 3 seconds for up to 50 stocks
- RAM usage: < 200 MB during normal operation

## Development Environment

- **Node.js**: v18+ (LTS)
- **npm**: v8+
- **Electron**: Latest stable
- **React**: v18+
- **SQLite**: v3+
