# SecureCopilot - Security Management Platform

## Overview

SecureCopilot is an enterprise security management platform that provides unified GRC (Governance, Risk, Compliance), security operations, vulnerability management, and authorized penetration testing workflows. The platform follows design patterns from industry tools like Splunk Enterprise Security, Tenable.io, and ServiceNow GRC modules, prioritizing information density and workflow efficiency.

The application is a full-stack TypeScript project with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a page-based architecture with shared components. Key pages include Dashboard, Assets, Vulnerabilities, Authorizations, Actions, Reports, Controls, and Settings. The design uses a multi-panel dashboard layout with a 240px collapsible sidebar and a main content area.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js HTTP module wrapping Express
- **API Design**: RESTful JSON API with `/api` prefix
- **Development**: Vite dev server integration for HMR

The backend serves both the API and static frontend assets. In development, Vite middleware handles frontend compilation. In production, pre-built static files are served from the `dist/public` directory.

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

Key data models include:
- Users (authentication)
- Assets (servers, APIs, databases, cloud resources)
- Vulnerabilities (with severity levels: critical, high, medium, low, info)
- Authorizations (penetration testing approvals)
- Action Logs (security operations audit trail)
- Security Controls (compliance framework mappings)

### Build System
- **Frontend Build**: Vite produces static assets to `dist/public`
- **Backend Build**: esbuild bundles server code to `dist/index.cjs`
- **TypeScript**: Strict mode enabled with path aliases (`@/` for client, `@shared/` for shared code)

## External Dependencies

### Database
- PostgreSQL database required (connection via DATABASE_URL environment variable)
- Drizzle Kit for schema migrations (`npm run db:push`)

### UI Framework
- Radix UI primitives for accessible components
- Tailwind CSS for styling
- Lucide React for icons
- Google Fonts: IBM Plex Sans (UI text), Roboto Mono (code/technical output)

### Key Runtime Libraries
- TanStack React Query for data fetching and caching
- React Hook Form for form handling
- date-fns for date manipulation
- Zod for runtime validation
- wouter for client-side routing

### Development Tools
- Vite with React plugin and Replit-specific plugins
- esbuild for production server bundling
- TypeScript for type checking