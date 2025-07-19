# Contributing to ChatPulse

We welcome contributions to ChatPulse! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please treat all contributors with respect and create a welcoming environment for everyone.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ChatPulse.git
cd ChatPulse

# Install dependencies
npm install

# Create a test environment file
cp .env.example .env

# Run tests to ensure everything is working
npm test
```

### Project Structure

```
ChatPulse/
├── lib/                    # Main library code
│   ├── core/              # Core functionality
│   ├── handlers/          # Message and event handlers
│   ├── plugins/           # Plugin system
│   ├── session/           # Session management
│   ├── media/             # Media handling
│   ├── events/            # Event system
│   └── utils/             # Utility functions
├── examples/              # Usage examples
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── docs/                  # Documentation
└── plugins/               # Default plugins
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-message-type`
- `fix/connection-timeout-issue`
- `docs/update-api-documentation`
- `refactor/improve-error-handling`

### Commit Messages

Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(message): add support for ephemeral messages
fix(connection): resolve timeout issues in poor network conditions
docs(api): update message handler documentation
```

### Code Guidelines

1. **Follow existing code style** - Use ESLint and Prettier configurations
2. **Write meaningful variable and function names**
3. **Add JSDoc comments** for all public methods
4. **Keep functions small and focused**
5. **Use async/await** instead of callbacks
6. **Handle errors appropriately**
7. **Add input validation** for public APIs

### Adding New Features

1. **Create an issue first** to discuss the feature
2. **Write tests** before implementing the feature
3. **Update documentation** as needed
4. **Add examples** if applicable
5. **Ensure backward compatibility**

### Bug Fixes

1. **Create a test** that reproduces the bug
2. **Fix the bug** while ensuring the test passes
3. **Verify** that existing tests still pass
4. **Update documentation** if the fix changes behavior

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/ValidationUtils.test.js

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

1. **Unit tests** for individual functions and classes
2. **Integration tests** for component interactions
3. **Use descriptive test names** that explain what is being tested
4. **Follow AAA pattern**: Arrange, Act, Assert
5. **Mock external dependencies** appropriately

Example test:
```javascript
describe('ValidationUtils', () => {
    describe('validatePhoneNumber', () => {
        test('should validate correct phone numbers', () => {
            // Arrange
            const phoneNumber = '1234567890';
            
            // Act
            const result = ValidationUtils.validatePhoneNumber(phoneNumber);
            
            // Assert
            expect(result.valid).toBe(true);
            expect(result.formatted).toBe('1234567890');
        });
    });
});
```

### Test Coverage

Maintain test coverage above 70% for:
- Lines
- Functions
- Branches
- Statements

## Submitting Changes

### Pull Request Process

1. **Update your branch** with the latest changes from main
2. **Run all tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Update documentation** if needed
5. **Create a pull request** with a clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated checks** must pass (tests, linting, etc.)
2. **Code review** by maintainers
3. **Address feedback** and make necessary changes
4. **Final approval** and merge

## Code Style

### ESLint Configuration

The project uses ESLint with the following key rules:
- Use single quotes for strings
- Use semicolons
- 4-space indentation
- Maximum line length of 120 characters
- Prefer const over let, avoid var
- Use arrow functions where appropriate

### Prettier Configuration

Prettier is configured to:
- Use single quotes
- Add semicolons
- Use 4-space indentation
- Line width of 120 characters

### Running Code Style Checks

```bash
# Check for linting errors
npm run lint

# Fix auto-fixable linting errors
npm run lint:fix

# Format code with Prettier
npm run format
```

## Documentation

### JSDoc Comments

All public methods should have JSDoc comments:

```javascript
/**
 * Send a text message to a chat
 * @param {string} chatId - Target chat ID
 * @param {string} message - Message content
 * @param {Object} options - Additional options
 * @param {boolean} options.linkPreview - Enable link preview
 * @returns {Promise<Object>} Message result
 * @throws {Error} When chat ID is invalid
 */
async sendMessage(chatId, message, options = {}) {
    // Implementation
}
```

### README Updates

When adding new features:
1. Update the main README.md
2. Add usage examples
3. Update the feature list
4. Add any new configuration options

### API Documentation

For significant API changes:
1. Update inline documentation
2. Add examples to the examples/ directory
3. Update any relevant guides

## Getting Help

If you need help:
1. Check existing issues and discussions
2. Create a new issue with the "question" label
3. Join our community discussions
4. Contact maintainers directly for sensitive issues

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributors section

Thank you for contributing to ChatPulse! 🚀