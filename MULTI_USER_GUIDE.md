# Multi-User Support Guide

## Overview

Yes, the Stock Portfolio Manager **fully supports multiple users** on a single installation. Each user has their own isolated portfolio data, transactions, and settings.

## How It Works

### Database Architecture
- Single SQLite database file located at: `%APPDATA%\stock-portfolio-manager\portfolio.db`
- All users share the same database file but data is isolated by `user_id`
- Each user's data is completely separate and secure

### User Isolation
Every user-specific table includes a `user_id` foreign key:
- `transactions` - Each transaction belongs to a specific user
- `realized_gains` - Capital gains calculations per user
- `api_settings` - API credentials encrypted per user
- All portfolio calculations filter by `user_id`

### Authentication System
- Each user creates their own username and password
- Passwords are hashed using bcrypt (cost factor 10)
- Session-based authentication with automatic timeout
- No user can access another user's data

## Usage Scenarios

### Scenario 1: Family Members
Multiple family members can use the same computer:
- Dad logs in with his account → sees only his portfolio
- Mom logs in with her account → sees only her portfolio
- Each maintains separate transactions and reports

### Scenario 2: Shared Computer
Office or shared computer environment:
- User A logs in → manages their stocks
- User A logs out
- User B logs in → sees completely different portfolio
- No data mixing or cross-contamination

### Scenario 3: Multiple Portfolios
Single person managing multiple portfolios:
- Create separate accounts: "Personal", "Trading", "Long-term"
- Each account tracks different investment strategies
- Switch between accounts by logging out and back in

## Creating New Users

### First User (Setup)
When the app is first installed:
1. Launch the application
2. Click "Sign Up" on the login screen
3. Enter username and password
4. First user is automatically created

### Additional Users
To add more users:
1. Current user logs out
2. Click "Sign Up" on the login screen
3. Enter new username and password
4. New user account is created

## Data Security

### Password Protection
- Passwords are never stored in plain text
- Bcrypt hashing with salt ensures security
- Each user's password is independent

### API Credentials
- Breeze API credentials are encrypted per user
- Each user must configure their own API keys
- Credentials cannot be accessed by other users

### Session Management
- Sessions expire after inactivity (default: 30 minutes)
- Each login creates a unique session token
- Logout invalidates the session immediately

## Data Separation

### What's Shared
- Stock master data (company names, symbols, ISIN codes)
- BSE Scrip Master data
- Price cache (current market prices)
- App settings (date format, currency format)

### What's Isolated
- All transactions (buy/sell records)
- Portfolio holdings and calculations
- Realized gains and tax reports
- API credentials
- User preferences

## Limitations

### Single Active Session
- Only one user can be logged in at a time
- To switch users, current user must log out first
- No concurrent multi-user sessions

### Shared Database File
- All users share the same database file
- Database is stored in Windows AppData folder
- If database is deleted, ALL users lose their data

### No User Management UI
- No admin panel to manage users
- Users cannot be deleted from the UI
- To remove a user, manual database editing required

## Best Practices

### For Multiple Users
1. Each user should create a unique username
2. Use strong passwords for each account
3. Always log out when finished
4. Don't share passwords between users

### For Backup
1. Backup the database file regularly
2. Backup includes ALL users' data
3. Restore affects ALL users
4. Location: `%APPDATA%\stock-portfolio-manager\portfolio.db`

### For API Configuration
1. Each user must configure their own Breeze API credentials
2. API credentials are user-specific
3. One user's API setup doesn't affect others

## Technical Details

### Database Location
```
Windows: C:\Users\[Username]\AppData\Roaming\stock-portfolio-manager\portfolio.db
macOS: ~/Library/Application Support/stock-portfolio-manager/portfolio.db
```

### User Table Schema
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);
```

### Data Isolation Example
```sql
-- User 1 sees only their transactions
SELECT * FROM transactions WHERE user_id = 1;

-- User 2 sees only their transactions
SELECT * FROM transactions WHERE user_id = 2;
```

## Migration from Single User

If you're currently using the app as a single user:
- Your existing data is already associated with user_id = 1
- You can add more users without affecting existing data
- New users start with empty portfolios
- Your data remains intact and isolated

## Troubleshooting

### Can't Create New User
- Check if username already exists
- Usernames must be unique
- Try a different username

### Can't See Other User's Data
- This is by design - data is isolated
- Each user only sees their own portfolio
- No way to share or merge data between users

### Forgot Password
- No password recovery mechanism currently
- Database must be manually edited to reset password
- Consider implementing password recovery in future

## Future Enhancements

Potential improvements for multi-user support:
- User management UI (admin panel)
- Password recovery mechanism
- User deletion from UI
- Data export/import per user
- User switching without logout
- Concurrent sessions (if needed)

## Summary

✅ **Yes, the app supports multiple users on one installation**
✅ Each user has completely isolated data
✅ Secure authentication with password hashing
✅ Simple to add new users via Sign Up screen
✅ Perfect for families, shared computers, or multiple portfolios

The architecture is designed from the ground up to support multiple users securely and efficiently.
