# Project Structure

## Directory Organization

```
portfolio-manager/
├── .kiro/                    # Kiro configuration and specs
│   ├── steering/            # Guidance documents
│   └── specs/               # Feature specifications
├── src/                     # Source code
│   ├── main/               # Electron main process
│   │   ├── main.js         # Main Electron entry point
│   │   ├── database/       # SQLite database setup
│   │   └── api/            # ICICI Breeze API integration
│   ├── renderer/           # React frontend
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS/styling files
│   └── shared/             # Code shared between main/renderer
│       ├── types/          # TypeScript type definitions
│       ├── constants/      # Application constants
│       └── calculations/   # FIFO and financial calculations
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data
├── build/                   # Build output
├── dist/                    # Distribution packages
├── docs/                    # Documentation
└── package.json            # Project configuration
```

## Feature-Based Organization

### Core Features Structure

```
src/renderer/
├── pages/
│   ├── Dashboard/          # Portfolio summary
│   ├── Transactions/       # Add/edit transactions
│   ├── Reports/            # Capital gains reports
│   ├── Settings/           # App configuration
│   └── Auth/               # Login/setup
├── components/
│   ├── Portfolio/          # Portfolio-related components
│   ├── Transaction/        # Transaction forms/lists
│   ├── Reports/            # Report generation components
│   └── Common/             # Shared UI components
└── utils/
    ├── calculations/       # FIFO, gains calculations
    ├── formatting/         # Indian number/date formatting
    ├── api/                # API client utilities
    └── database/           # Database query helpers
```

## Database Structure

### SQLite Schema Organization

```
src/main/database/
├── schema/
│   ├── users.sql           # User authentication
│   ├── stocks.sql          # Stock master data
│   ├── transactions.sql    # Buy/sell transactions
│   ├── realized_gains.sql  # FIFO calculation results
│   ├── price_cache.sql     # API price cache
│   └── settings.sql        # App configuration
├── migrations/             # Database version migrations
├── seeds/                  # Sample data for testing
└── index.js                # Database initialization
```

## File Naming Conventions

### Source Files
- **React Components**: `PascalCase.jsx` (e.g., `Dashboard.jsx`)
- **Utility Functions**: `camelCase.js` (e.g., `calculateFIFO.js`)
- **Database Files**: `lowercase.sql` (e.g., `transactions.sql`)
- **Test Files**: `{name}.test.js` or `{name}.spec.js`
- **Configuration**: `lowercase-with-dashes.config.js`

### Directories
- **Feature Directories**: `PascalCase/` (e.g., `Dashboard/`)
- **Utility Directories**: `lowercase/` (e.g., `utils/`)
- **Component Directories**: `PascalCase/` (e.g., `Portfolio/`)

## Import Organization

```javascript
// 1. Node modules
import React from 'react';
import { ipcRenderer } from 'electron';
import axios from 'axios';

// 2. Internal utilities (alphabetical)
import { calculateFIFO } from '../utils/calculations';
import { formatINR } from '../utils/formatting';

// 3. Components (alphabetical)
import Dashboard from './Dashboard';
import TransactionForm from './TransactionForm';

// 4. Relative imports last
import './styles.css';
```

## Component Structure

### React Component Template

```javascript
// components/Portfolio/PortfolioSummary.jsx
import React, { useState, useEffect } from 'react';
import { formatINR, formatPercent } from '../../utils/formatting';
import './PortfolioSummary.css';

const PortfolioSummary = ({ portfolioData }) => {
  // Component logic here
  
  return (
    <div className="portfolio-summary">
      {/* JSX here */}
    </div>
  );
};

export default PortfolioSummary;
```

## Testing Structure

### Test Organization

```
tests/
├── unit/
│   ├── calculations/       # Test FIFO calculations
│   ├── formatting/         # Test number/date formatting
│   ├── components/         # Test React components
│   └── utils/              # Test utility functions
├── integration/
│   ├── database/           # Test database operations
│   ├── api/                # Test API integration
│   └── workflows/          # Test complete user workflows
└── fixtures/
    ├── sample-data.json    # Test portfolio data
    ├── mock-api.json       # Mock API responses
    └── test-database.sql   # Test database setup
```

## Configuration Files

### Root Level Configuration

```
├── package.json            # Dependencies and scripts
├── electron-builder.json   # Electron packaging config
├── .eslintrc.js           # Code linting rules
├── .prettierrc            # Code formatting rules
├── jest.config.js         # Testing configuration
└── tsconfig.json          # TypeScript configuration (if used)
```

## Build and Distribution

### Build Process

1. **Development**: `npm run dev` - Hot reload for React + Electron
2. **Testing**: `npm test` - Run all unit and integration tests
3. **Building**: `npm run build` - Create production React build
4. **Packaging**: `npm run electron-pack` - Package Electron app
5. **Distribution**: `npm run dist` - Create Windows MSI and macOS DMG

### Output Structure

```
dist/
├── win/
│   ├── StockPortfolioManager-1.0.0.msi
│   └── StockPortfolioManager-1.0.0.exe
├── mac/
│   ├── StockPortfolioManager-1.0.0.dmg
│   └── StockPortfolioManager.app/
└── linux/ (future)
```

## Indian Market Conventions

### Financial Calculations

```javascript
// src/shared/calculations/
├── fifo.js                 # FIFO calculation engine
├── capitalGains.js         # STCG/LTCG calculations
├── financialYear.js        # FY 2024-25 calculations
├── averageCost.js          # Weighted average calculations
└── taxCalculations.js      # Indian tax rate calculations
```

### Data Formatting

```javascript
// src/shared/formatting/
├── currency.js             # ₹1,23,456.78 formatting
├── dates.js                # DD-MMM-YYYY formatting
├── numbers.js              # Lakhs/crores formatting
└── percentages.js          # Gain/loss percentage formatting
```

## Security Considerations

### Sensitive Data Handling

```
src/main/security/
├── encryption.js           # API credential encryption
├── authentication.js       # Password hashing
└── session.js              # Session management
```

- **No sensitive data in logs**
- **API credentials encrypted at rest**
- **Database stored in user's private folder**
- **No network calls except to ICICI Breeze API**

## Development Workflow

1. **Create Feature Spec**: Add to `.kiro/specs/{feature-name}/`
2. **Implement Backend**: Database schema + main process logic
3. **Implement Frontend**: React components + UI
4. **Add Tests**: Unit tests for calculations, integration tests for workflows
5. **Manual Testing**: Test on Windows and macOS
6. **Build Installers**: Create distribution packages

This structure ensures clear separation of concerns, maintainable code, and follows Electron + React best practices while accommodating Indian market requirements.
