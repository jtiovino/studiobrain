# Development Workflow

This document outlines the development workflow and automated quality checks to prevent deployment issues.

## Prerequisites

### Required VS Code Extensions

When you open this project in VS Code, you'll be prompted to install these recommended extensions:

- **Prettier**: Automatic code formatting
- **ESLint**: Code linting and error detection
- **TypeScript**: Enhanced TypeScript support
- **Tailwind CSS**: Tailwind class completion

### Git Hooks Setup

Pre-commit hooks are automatically configured via Husky. They will run on every commit to ensure code quality.

## Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run dev:check` - Start development server with continuous type checking

### Code Quality

- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check if files are properly formatted
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking
- `npm run type-check:watch` - Run TypeScript type checking in watch mode

### Pre-deployment Checks

- `npm run check-all` - Run all checks (format, lint, type-check, build)
- `npm run precommit` - Manual pre-commit check (format + lint-fix + type-check)

### Build & Deploy

- `npm run build` - Build for production
- `npm run start` - Start production server

## Automated Quality Checks

### 1. Pre-commit Hooks

Every commit automatically runs:

- **Prettier formatting** on staged files
- **ESLint with auto-fix** on staged files
- **TypeScript type checking** on staged files

If any check fails, the commit is blocked until issues are resolved.

### 2. VS Code Integration

With the workspace settings:

- **Auto-format on save** using Prettier
- **ESLint auto-fix on save** for fixable issues
- **Import organization** on save
- **Consistent editor settings** (tabs, spacing, line endings)

### 3. CI/CD Pipeline

GitHub Actions runs on every push and pull request:

- Format checking
- Linting
- Type checking
- Production build
- Artifact storage

## Development Best Practices

### Before Starting Work

1. Pull latest changes: `git pull origin main`
2. Install dependencies: `npm install --legacy-peer-deps`
3. Run health check: `npm run check-all`

### During Development

1. Use `npm run dev:check` for continuous type checking
2. Fix linting/formatting issues as they appear in VS Code
3. Run `npm run check-all` before committing

### Before Committing

The pre-commit hooks will automatically:

1. Format your code with Prettier
2. Fix auto-fixable ESLint issues
3. Run TypeScript type checking
4. Block the commit if any issues remain

### Manual Quality Check

If you want to manually run the same checks as pre-commit:

```bash
npm run precommit
```

## Troubleshooting

### Commit Blocked by Hooks

If your commit is blocked:

1. Check the error messages in the terminal
2. Fix the reported issues
3. Stage the fixes: `git add .`
4. Try committing again

### TypeScript Errors

- Use `npm run type-check` to see all type errors
- Use `npm run type-check:watch` during development
- Most common issues: missing imports, incorrect types, unused variables

### ESLint Errors

- Use `npm run lint` to see all linting issues
- Use `npm run lint:fix` to auto-fix issues
- Check VS Code for inline ESLint suggestions

### Prettier Formatting

- Use `npm run format` to format all files
- Use `npm run format:check` to check formatting
- VS Code should auto-format on save

### Import/Package Issues

This project uses `--legacy-peer-deps` due to date-fns version conflicts:

```bash
npm install --legacy-peer-deps
```

## CI/CD Integration

### GitHub Actions

The CI pipeline runs on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Required Secrets

Set these in GitHub repository settings:

- `OPENAI_API_KEY`: Required for build process

### Deployment

- **Vercel**: Automatically deploys from `main` branch
- **Local Preview**: Use `npm run build && npm run start`

## Preventing Future Issues

This setup prevents the following common deployment issues:

✅ **Formatting inconsistencies**: Auto-formatted before commit
✅ **ESLint errors**: Fixed automatically or blocked at commit
✅ **TypeScript errors**: Caught during development and pre-commit
✅ **Import organization**: Auto-organized on save
✅ **Missing dependencies**: Caught during CI build
✅ **React Hook issues**: Stricter linting rules enabled

## Emergency Override

If you absolutely need to bypass pre-commit hooks (not recommended):

```bash
git commit --no-verify -m "Emergency commit message"
```

**Note**: This should only be used in emergencies as it bypasses all quality checks.
