# CLAUDE.MD - SecureCopilot AI Assistant Guide

This document provides context and guidance for AI assistants working on the SecureCopilot codebase.

## Project Overview

**SecureCopilot** is an enterprise security management platform that provides unified GRC (Governance, Risk, Compliance), security operations, vulnerability management, and authorized penetration testing workflows. The platform follows design patterns from industry tools like Splunk Enterprise Security, Tenable.io, and ServiceNow GRC modules, prioritizing information density and workflow efficiency for security professionals.

### Key Capabilities
- Dashboard Analytics with real-time security metrics
- Asset Management (servers, APIs, databases, cloud resources)
- Vulnerability Management with CVSS scoring and risk prioritization
- Authorization Management for penetration testing approvals
- Action Logging with complete audit trails
- Security Controls tracking (NIST, ISO 27001, CIS frameworks)
- Reporting and compliance exports
- Collections and Skills system for extensibility

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS, Radix UI, TanStack Query |
| Backend | Node.js 20+, Express.js, TypeScript |
| Validation | Zod, drizzle-zod |
| Database | PostgreSQL (optional), In-Memory Storage |
| ORM | Drizzle ORM |
| Build | Vite, esbuild |

## Project Structure

```
Sentinel-Copilot/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # Shadcn UI components (Radix-based)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Page components
│   │   │   ├── dashboard.tsx      # Main dashboard with metrics
│   │   │   ├── assets.tsx         # Asset management
│   │   │   ├── vulnerabilities.tsx # Vulnerability tracking
│   │   │   ├── activity.tsx       # Activity/action logs
│   │   │   └── settings.tsx       # Configuration
│   │   ├── App.tsx           # Main application component
│   │   └── main.tsx          # Application entry point
│   └── public/               # Static assets
├── server/                    # Express backend application
│   ├── index.ts              # Server entry point & initialization
│   ├── routes.ts             # API route definitions (comprehensive CRUD)
│   ├── storage.ts            # Storage interface & implementation
│   ├── seed.ts               # Database seeding with demo data
│   ├── logger.ts             # Verbose logging utility
│   ├── db.ts                 # Database connection
│   ├── vite.ts               # Vite dev server integration
│   └── static.ts             # Static file serving
├── shared/                    # Shared TypeScript code
│   └── schema.ts             # Drizzle schema & Zod validation
├── collections/               # Skill collections (grouping mechanism)
│   └── example-collection/   # Example collection with manifest
├── skills/                    # Extensible skill modules
│   └── example-skill/        # Example skill with manifest
├── script/                    # Build and CLI scripts
│   ├── build.ts              # Production build script
│   ├── collection-create.ts  # CLI tool to create collections
│   ├── collection-validate.ts # CLI tool to validate collections
│   ├── skill-create.ts       # CLI tool to create skills
│   └── skill-validate.ts     # CLI tool to validate skills
├── attached_assets/           # Runtime uploaded files/data
├── design_guidelines.md       # UI/UX design system
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── tailwind.config.ts        # TailwindCSS configuration
└── drizzle.config.ts         # Drizzle ORM configuration
```

## Core Architecture

### Frontend Architecture
- **React 18** with functional components and hooks
- **TanStack Query** for server state management and caching
- **Wouter** for client-side routing
- **Radix UI** (via Shadcn) for accessible component primitives
- **TailwindCSS** for styling with custom design system
- **Zod** for client-side validation

### Backend Architecture
- **Express.js** REST API with TypeScript
- **Drizzle ORM** for type-safe database operations
- **In-memory storage** fallback when PostgreSQL not configured
- **Comprehensive logging** via custom logger (server/logger.ts)
- **Request validation** using Zod schemas from shared/schema.ts

### Data Models (shared/schema.ts)

Key database tables:
- **users**: Authentication (username, password)
- **assets**: IT assets with criticality, environment, owner tracking
- **vulnerabilities**: Security findings with CVE/CWE, CVSS scores, Jira integration
- **activityLogs**: Audit trail for all entity changes
- **jiraConfig**: Integration settings for Jira ticketing

## Development Workflows

### Starting Development
```bash
npm run dev          # Start dev server (port 5000)
npm run check        # Run TypeScript type checking
```

### Building for Production
```bash
npm run build        # Build frontend and backend
npm start            # Run production server
```

### Database Operations
```bash
npm run db:push      # Push schema changes to PostgreSQL
```

### Working with Collections and Skills

Create new skill:
```bash
tsx script/skill-create.ts
```

Validate skill:
```bash
tsx script/skill-validate.ts <skill-name>
```

Create new collection:
```bash
tsx script/collection-create.ts
```

Validate collection:
```bash
tsx script/collection-validate.ts <collection-id>
```

## Design Philosophy

SecureCopilot follows an **enterprise security dashboard** design approach. See `design_guidelines.md` for complete details.

### Key Principles
1. **Information Density**: Maximize actionable data visibility
2. **Workflow Efficiency**: Reduce clicks for common security operations
3. **Desktop-First**: Primary use case is security analyst workstations
4. **Minimal Animation**: Subtle, functional transitions only
5. **System-Based Colors**: Severity-coded UI elements (Critical=red, High=orange, etc.)

### Color System
- Primary: #1E3A8A (deep security blue)
- Secondary: #DC2626 (critical red)
- Warning: #F59E0B (amber)
- Success: #10B981 (green)
- Accent: #6366F1 (indigo)

### Typography
- Primary: IBM Plex Sans
- Monospace: Roboto Mono (for technical output, IDs, code)

## Common Development Tasks

### Adding a New Page
1. Create page component in `client/src/pages/<name>.tsx`
2. Add route in `client/src/App.tsx`
3. Add navigation item in sidebar component
4. Create corresponding API endpoints in `server/routes.ts`

### Adding a New Data Model
1. Define table schema in `shared/schema.ts` using Drizzle
2. Create Zod validation schemas with `createInsertSchema`
3. Add storage methods in `server/storage.ts`
4. Create API routes in `server/routes.ts`
5. Run `npm run db:push` to update database

### Adding API Endpoints
1. Define route in `server/routes.ts`
2. Implement validation using Zod schemas
3. Add logging via `logger` for audit trail
4. Return consistent JSON responses
5. Handle errors with appropriate HTTP status codes

### Frontend Data Fetching Pattern
```typescript
// Use TanStack Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['/api/endpoint'],
  queryFn: async () => {
    const res = await fetch('/api/endpoint');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }
});
```

### Backend Route Pattern
```typescript
// Validate input, log request, handle errors
app.post("/api/resource", async (req, res, next) => {
  try {
    const startTime = Date.now();

    // Validate with Zod (use resource-specific schema, e.g., insertAssetSchema)
    const validated = insertResourceSchema.parse(req.body);

    // Business logic
    const result = await storage.create(validated);

    logger.http("POST", "/api/resource", 201, Date.now() - startTime);
    logger.audit("Resource created", { id: result.id });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
```

## Logging System

The platform uses a comprehensive logging system in `server/logger.ts`.

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General operational messages
- **WARN**: Warning conditions
- **ERROR**: Error conditions

In addition to these core log levels, the logger provides **helper methods** that
internally use the standard levels with specific source labels (typically logging at
`INFO` level with a structured `source` field):
- `logger.http()` for HTTP request/response logging
- `logger.startup()` for server initialization events
- `logger.performance()` for performance metrics
- `logger.audit()` for audit trail events

These helpers do not introduce new log levels; they are semantic wrappers around the
existing DEBUG/INFO/WARN/ERROR levels to make logs easier to categorize and search.

### Usage
```typescript
import { logger } from './logger';

logger.info("authService", "Operation completed", { userId: "123" });
logger.error("authService", "Failed to process", { error: err.message });
logger.http("GET", "/api/assets", 200, 45);
logger.performance("Database query", queryDuration);
logger.audit("User logged in", { userId: "123" });
```

## Collections and Skills System

### Collections
Collections are logical groupings of related skills. They have:
- Manifest file (`manifest.json`) with metadata
- References to included skills
- Version tracking
- Tags for categorization

### Skills
Skills are extensible modules providing specific capabilities:
- Manifest with inputs/outputs schema
- Implementation logic
- Metadata (author, version, category)
- Validation via CLI tools

## API Conventions

### Endpoints Structure
- **GET** `/api/<resource>` - List with pagination/filtering
- **GET** `/api/<resource>/:id` - Get single item
- **POST** `/api/<resource>` - Create new item
- **PATCH** `/api/<resource>/:id` - Update existing item
- **DELETE** `/api/<resource>/:id` - Delete item

### Response Format
```json
{
  "id": "uuid",
  "field": "value",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### Error Format
```json
{
  "error": "Error message",
  "details": { }
}
```

## Important Files to Know

### Configuration Files
- `package.json`: Dependencies, scripts, project metadata
- `tsconfig.json`: TypeScript compiler settings
- `vite.config.ts`: Vite bundler configuration
- `tailwind.config.ts`: TailwindCSS theme and plugins
- `drizzle.config.ts`: Database ORM configuration

### Documentation Files
- `README.md`: User-facing project documentation
- `CONTRIBUTING.md`: Contribution guidelines
- `SECURITY.md`: Security policy
- `design_guidelines.md`: UI/UX design system
- `CLAUDE.MD`: This file (AI assistant guide)

### Core Implementation Files
- `shared/schema.ts`: Single source of truth for data models
- `server/routes.ts`: Complete API surface area
- `server/storage.ts`: Data persistence layer
- `server/logger.ts`: Logging infrastructure
- `client/src/App.tsx`: Frontend routing and layout

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | (in-memory) |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Testing Philosophy

The project emphasizes type safety and manual testing while supporting automated testing strategies:

### Primary Testing Approach
- **Type safety via TypeScript** as primary correctness mechanism
- **Manual testing** in development mode with live dev server
- **Type checking**: `npm run check` validates all TypeScript before deployment
- **Integration testing** via live dev server

### Automated Testing Strategies
While the current project primarily relies on type safety and manual testing, here are recommended approaches for adding automated tests:

#### Unit Testing
- **Framework**: Vitest (fast, Vite-native test runner)
- **Coverage**: Utility functions, business logic, data transformations
- **Command**: `npm run test:unit` (when implemented)

#### Component Testing
- **Framework**: React Testing Library with Vitest
- **Coverage**: UI components, user interactions, rendering logic
- **Focus**: Test component behavior, not implementation details
- **Command**: `npm run test:components` (when implemented)

#### Backend API Testing
- **Framework**: Supertest with Vitest
- **Coverage**: API endpoints, validation, error handling
- **Focus**: Request/response contracts, status codes, data validation
- **Command**: `npm run test:api` (when implemented)

#### End-to-End Testing
- **Framework**: Playwright or Cypress
- **Coverage**: Critical user workflows, multi-step processes
- **Focus**: Dashboard loading, asset creation, vulnerability tracking flows
- **Command**: `npm run test:e2e` (when implemented)

#### Running Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report
```

**Note**: Test infrastructure can be added incrementally as the project matures. Start with the most critical paths and expand coverage over time.

## Git Workflow

This project uses feature branches with the naming convention `claude/<description>-<session-id>`.

### Current Branch
Working on: `claude/<description>-<session-id>`

### Common Commands
```bash
git status                           # Check working tree
git add .                           # Stage changes
git commit -m "Description"         # Commit changes
git push -u origin <branch-name>    # Push to remote
```

## Security Considerations

This is a security management platform, so:
- Never commit secrets or credentials
- Validate all user input server-side
- Use parameterized queries (Drizzle ORM handles this)
- Log security-relevant actions for audit trails
- Follow OWASP guidelines for web security
- Sanitize data before rendering in UI

## Common Patterns to Follow

### Component Structure
```typescript
// Prefer functional components with TypeScript
interface ComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
}

export function Component({ data, onAction }: ComponentProps) {
  // Component logic
  return <div>...</div>;
}
```

### Error Handling
```typescript
// Server-side: use try/catch and pass to next()
app.get("/api/resource", async (req, res, next) => {
  try {
    const result = await someAsyncOperation();
    res.json(result);
  } catch (error) {
    next(error); // Let error middleware handle it
  }
});

// Client-side: use TanStack Query error states
const { data, error, isError } = useQuery(...);
if (isError) return <ErrorDisplay error={error} />;
```

### State Management
- **Server state**: TanStack Query (queries, mutations, caching)
- **UI state**: React useState, useReducer
- **Form state**: React Hook Form (when complex validation needed)
- **URL state**: Wouter routing with query parameters

## Performance Considerations

- Vite provides fast HMR in development
- esbuild used for production builds
- TanStack Query handles caching and deduplication
- Pagination for large datasets
- Lazy loading for heavy components

## Accessibility

- Radix UI components provide ARIA attributes
- Keyboard navigation support
- Semantic HTML structure
- Color contrast meets WCAG standards
- Screen reader friendly labels

## Future Extensibility

The architecture supports:
- Additional security integrations via skills system
- Custom reporting modules
- Plugin-based authentication providers
- Multi-tenancy (schema supports it)
- Real-time updates via WebSocket (infrastructure present)

## Getting Help

- Check `README.md` for user documentation
- Review `design_guidelines.md` for UI/UX patterns
- Examine existing pages for implementation examples
- Check `server/routes.ts` for API endpoint patterns
- Look at `shared/schema.ts` for data model definitions

## Notes for AI Assistants

When working on this codebase:
1. **Always read before editing** - Understand existing patterns
2. **Follow design guidelines** - Maintain UI/UX consistency
3. **Use the logger** - Add appropriate logging for new features
4. **Validate inputs** - Use Zod schemas from shared/schema.ts
5. **Type everything** - No `any` types, leverage TypeScript fully
6. **Test locally** - Run `npm run dev` and verify changes
7. **Check types** - Run `npm run check` before committing
8. **Keep it simple** - Avoid over-engineering, match existing patterns
9. **Document complex logic** - Add comments for non-obvious code
10. **Security first** - This is a security platform, validate everything

---

Last updated: 2026-01-10
Version: 1.0.0
