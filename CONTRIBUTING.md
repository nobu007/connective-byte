# Contributing to ConnectiveByte

Thank you for your interest in contributing to ConnectiveByte! We appreciate your time and effort in making this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)
- [License](#license)

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
   ```bash
   git clone https://github.com/your-username/connective-byte.git
   cd connective-byte
   ```
3. **Install** dependencies
   ```bash
   npm install
   ```
4. **Set up** environment variables
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```
5. **Start** the development servers
   ```bash
   # Start frontend and backend in separate terminals
   npm run dev:frontend
   npm run dev:backend
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. Make your changes following the code style guidelines

3. Run tests and ensure they pass:

   ```bash
   npm test
   ```

4. Commit your changes following the [commit message guidelines](#commit-message-guidelines)

5. Push your branch and create a pull request

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for our commit messages. Here's an example:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Examples

```
feat: add user authentication

- Add login/logout functionality
- Implement JWT authentication

Closes #123
```

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations, and container parameters.
3. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
4. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Code Style

- We use [Prettier](https://prettier.io/) for code formatting
- We use [ESLint](https://eslint.org/) for code quality
- Run the following commands to format and lint your code:
  ```bash
  npm run format
  npm run lint
  ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run E2E tests
npm run test:e2e
```

### Writing Tests

- Write unit tests for all new features and bug fixes
- Ensure the test suite passes before submitting a pull request
- When fixing a bug, add a test that would have caught the bug

## Reporting Issues

When reporting issues, please include:

1. A clear, descriptive title
2. A description of the issue
3. Steps to reproduce the issue
4. Expected vs. actual behavior
5. Screenshots (if applicable)
6. Browser/OS version (if applicable)
7. Any error messages in the console

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
