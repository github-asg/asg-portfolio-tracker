# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 8+
- Git

### Initial Setup
1. Clone the repository
2. Run the setup script: `npm run setup`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure
5. Start development: `npm run dev`

## Development Workflow

### Daily Development
1. Start the development server: `npm run dev`
2. Make your changes in the `src/` directory
3. The app will hot-reload automatically
4. Test your changes in the Electron window

### Code Quality
- Run linting: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Format code: `npm run format`
- Run tests: `npm test`

### Testing
- Unit tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage report: `npm run test:coverage`

### Building
- Development build: `npm run react-build`
- Production build: `npm run build`
- Create installers: `npm run dist`

## Project Structure

```
src/
├── main/                   # Electron main process
│   ├── main.js            # Entry point
│   ├── preload.js         # IPC bridge
│   ├── database/          # SQLite operations
│   └── api/               # ICICI Breeze integration
├── components/            # React components
│   ├── Auth/              # Authentication
│   ├── Dashboard/         # Portfolio dashboard
│   ├── Layout/            # App layout
│   └── Common/            # Shared components
├── utils/                 # Utility functions
│   ├── calculations/      # FIFO calculations
│   ├── formatting/        # Indian formatting
│   └── constants/         # App constants
└── styles/                # CSS files
```

## Coding Standards

### JavaScript/React
- Use functional components with hooks
- Follow ESLint configuration
- Use Prettier for formatting
- Write tests for new components
- Use descriptive variable names
- Add JSDoc comments for complex functions

### File Naming
- Components: `PascalCase.js` (e.g., `Dashboard.js`)
- Utilities: `camelCase.js` (e.g., `calculateFIFO.js`)
- Tests: `ComponentName.test.js`
- CSS: `kebab-case.css`

### Git Workflow
1. Create feature branch: `git checkout -b feature/feature-name`
2. Make commits with descriptive messages
3. Run tests before committing
4. Push and create pull request

## Indian Market Specifics

### Number Formatting
```javascript
// Currency
formatCurrency(123456.78) // ₹1,23,456.78

// Large numbers
formatNumber(1500000) // 15.00 L
formatNumber(25000000) // 2.50 Cr

// Percentages
formatPercent(15.5) // +15.50%
formatPercent(-5.2) // -5.20%
```

### Date Formatting
```javascript
// Indian format
formatDate(new Date()) // 15-Jan-2024
```

### Financial Year
```javascript
// FY calculation
getFinancialYear(new Date('2024-05-15')) // FY 2024-25
getFinancialYear(new Date('2024-02-15')) // FY 2023-24
```

## Database Schema

### Key Tables
- `users` - Authentication data
- `stocks` - Stock master data
- `transactions` - Buy/sell records
- `realized_gains` - FIFO calculation results
- `price_cache` - API price data

### FIFO Calculations
The FIFO (First In First Out) engine is critical for tax compliance:
1. Sort buy transactions by date (oldest first)
2. Match sell quantity against oldest buys
3. Calculate holding period for STCG/LTCG classification
4. Store detailed gain/loss records

## API Integration

### ICICI Breeze Setup
1. Get API credentials from ICICI Breeze
2. Configure in Settings → API Configuration
3. Test connection before saving
4. Prices refresh automatically during market hours

### Error Handling
- Network failures: Use cached prices
- Rate limiting: Implement exponential backoff
- Invalid credentials: Prompt user to reconfigure
- Market closed: Reduce refresh frequency

## Security Considerations

### Data Protection
- All data stored locally (SQLite)
- Passwords hashed with bcrypt
- API credentials encrypted with AES-256
- No cloud sync or external data transmission

### Session Management
- Auto-logout after 30 minutes inactivity
- Secure session tokens
- Failed login attempt limiting

## Performance Guidelines

### Target Metrics
- Login: < 1 second
- Dashboard load: < 2 seconds
- Add transaction: < 500ms
- Generate report: < 5 seconds
- Memory usage: < 200MB

### Optimization Tips
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Cache API responses appropriately
- Optimize database queries with indexes

## Debugging

### Development Tools
- Electron DevTools: F12 in development
- React Developer Tools: Browser extension
- Console logging: Use appropriate log levels
- Database inspection: SQLite browser tools

### Common Issues
- IPC communication errors: Check preload.js
- Database locked: Ensure proper connection handling
- API failures: Check network and credentials
- Build failures: Clear cache with `npm run clean`

## Deployment

### Building Installers
```bash
# Windows MSI
npm run dist

# macOS DMG
npm run dist

# Both platforms
npm run dist
```

### Distribution
- Windows: MSI installer in `dist/win/`
- macOS: DMG file in `dist/mac/`
- Code signing: Configure in electron-builder.json

## Troubleshooting

### Common Problems
1. **App won't start**: Check Node.js version, run `npm install`
2. **Build fails**: Clear cache with `npm run clean`
3. **Tests fail**: Check mock setup in setupTests.js
4. **Linting errors**: Run `npm run lint:fix`

### Getting Help
1. Check this documentation
2. Review error messages carefully
3. Check the issue tracker
4. Ask for help with detailed error information

## Contributing

### Before Submitting
1. Run all tests: `npm test`
2. Check linting: `npm run lint`
3. Test on both Windows and macOS if possible
4. Update documentation if needed
5. Add tests for new features

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Performance impact considered
- [ ] Security implications reviewed