# Contributing to Stock Portfolio Manager

Thank you for your interest in contributing to Stock Portfolio Manager! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - System information (OS, version)

### Suggesting Features

1. Check if the feature has been suggested in [Issues](../../issues)
2. Create a new issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m "Add feature: description"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/portfolio-manager.git
cd portfolio-manager

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Coding Standards

### JavaScript/React

- Use ES6+ features
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### File Naming

- React components: `PascalCase.js`
- Utilities: `camelCase.js`
- CSS files: match component name
- Test files: `*.test.js`

### Git Commit Messages

- Use present tense: "Add feature" not "Added feature"
- Be descriptive but concise
- Reference issues: "Fix #123: Description"

Examples:
```
Add BSE stock search functionality
Fix price refresh bug in portfolio view
Update README with installation instructions
```

## Testing

- Write tests for new features
- Ensure existing tests pass: `npm test`
- Test on both Windows and macOS if possible

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for functions
- Update CHANGELOG.md

## Questions?

Feel free to ask questions by creating an issue with the "question" label.

Thank you for contributing! 🎉
