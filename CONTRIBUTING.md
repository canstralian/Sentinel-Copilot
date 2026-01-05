# Contributing to SecureCopilot

Thank you for your interest in contributing to SecureCopilot! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Git
- A code editor (VS Code recommended)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/securecopilot.git
   cd securecopilot
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/your-org/securecopilot.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Verify the setup** by visiting `http://localhost:5000`

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with the following prefixes:

| Prefix | Purpose |
|--------|---------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions or modifications |
| `chore/` | Maintenance tasks |

Examples:
- `feature/add-export-to-csv`
- `fix/vulnerability-filter-reset`
- `docs/update-api-reference`

### Making Changes

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our [coding standards](#coding-standards)

4. **Run type checking**:
   ```bash
   npm run check
   ```

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add descriptive message here"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(assets): add bulk delete functionality

fix(vulnerabilities): correct severity filter not resetting on search

docs(api): update authentication endpoint documentation

refactor(storage): extract common query patterns into helper functions
```

## Pull Request Process

### Before Submitting

1. **Ensure your code compiles** without errors:
   ```bash
   npm run check
   ```

2. **Update documentation** if you've changed APIs or added features

3. **Add/update tests** for your changes if applicable

4. **Rebase on main** if your branch is behind:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template with:
   - A clear description of the changes
   - Related issue numbers (if applicable)
   - Screenshots for UI changes
   - Breaking changes (if any)

### PR Review Process

- All PRs require at least one approval from a maintainer
- Address review feedback promptly
- Keep PRs focused - one feature/fix per PR
- Large changes should be discussed in an issue first

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Avoid `any` types - use proper typing or `unknown`
- Export types from `shared/schema.ts` for shared types
- Use interfaces for object shapes, types for unions/intersections

```typescript
// Preferred
interface UserData {
  id: string;
  name: string;
  email: string;
}

// For unions
type Status = "pending" | "approved" | "rejected";
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use the existing Shadcn UI components from `@/components/ui`

```tsx
// Component structure
export function MyComponent({ data }: MyComponentProps) {
  const [state, setState] = useState(initialValue);
  
  // Hooks first
  const { data: queryData, isLoading } = useQuery({ ... });
  
  // Event handlers
  const handleClick = () => { ... };
  
  // Render
  return ( ... );
}
```

### API Routes

- Keep routes thin - business logic in storage layer
- Validate request bodies with Zod schemas
- Use consistent error handling
- Add verbose logging for debugging

```typescript
app.post("/api/resource", async (req, res) => {
  try {
    logger.info("Creating resource", { body: req.body });
    const validated = insertSchema.parse(req.body);
    const result = await storage.create(validated);
    logger.info("Resource created", { id: result.id });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn("Validation failed", { errors: error.errors });
      return handleZodError(res, error);
    }
    logger.error("Failed to create resource", { error });
    res.status(500).json({ error: "Failed to create resource" });
  }
});
```

### Styling

- Use TailwindCSS utility classes
- Follow the design guidelines in `design_guidelines.md`
- Use semantic color tokens (e.g., `bg-card`, `text-muted-foreground`)
- Support both light and dark themes

### File Organization

- One component per file (unless tightly coupled)
- Group related files in directories
- Use barrel exports for cleaner imports
- Keep test files adjacent to source files

## Testing Guidelines

### Writing Tests

- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names

### Test Data Attributes

Add `data-testid` attributes to interactive and meaningful elements:

```tsx
<Button data-testid="button-submit-form">Submit</Button>
<span data-testid="text-user-name">{user.name}</span>
```

## Documentation

### Code Comments

- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for public APIs

```typescript
/**
 * Fetches vulnerabilities with optional filtering
 * @param filters - Optional filter criteria
 * @returns Array of vulnerabilities matching the filters
 */
async function getVulnerabilities(filters?: VulnerabilityFilters) {
  // Implementation
}
```

### README Updates

- Update README for new features
- Keep API documentation current
- Add examples for complex functionality

## Issue Guidelines

### Reporting Bugs

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment information

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (optional)
- Mockups or examples (optional)

### Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature request |
| `documentation` | Documentation improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `question` | Further information requested |

## Questions?

Feel free to:
- Open a [Discussion](https://github.com/your-org/securecopilot/discussions)
- Ask in issue comments
- Reach out to maintainers

Thank you for contributing to SecureCopilot!
