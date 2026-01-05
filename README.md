# SecureCopilot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

**SecureCopilot** is an enterprise security management platform that provides unified GRC (Governance, Risk, Compliance), security operations, vulnerability management, and authorized penetration testing workflows.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Logging](#logging)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Overview

SecureCopilot follows design patterns from industry tools like Splunk Enterprise Security, Tenable.io, and ServiceNow GRC modules, prioritizing information density and workflow efficiency. The platform is built for security professionals who need a comprehensive view of their organization's security posture.

## Features

### Core Capabilities

- **Dashboard Analytics** - Real-time security metrics and KPIs with trend analysis
- **Asset Management** - Track servers, APIs, databases, cloud resources, and more
- **Vulnerability Management** - Identify, prioritize, and remediate security vulnerabilities
- **Authorization Management** - Manage penetration testing approvals and scope definitions
- **Action Logging** - Complete audit trail of security operations
- **Security Controls** - Track compliance with NIST, ISO 27001, CIS, and other frameworks
- **Reporting** - Executive summaries, technical reports, and compliance status exports

### Technical Features

- **Modern React Frontend** - Built with React 18, TailwindCSS, and Radix UI components
- **RESTful API** - Express.js backend with comprehensive CRUD operations
- **Type Safety** - Full TypeScript coverage across frontend and backend
- **Data Validation** - Zod schemas for runtime validation
- **Responsive Design** - Works on desktop and tablet devices
- **Dark Mode** - Full dark/light theme support
- **Verbose Logging** - Comprehensive server-side logging for debugging and auditing

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SecureCopilot                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────┐   │
│  │   React Frontend    │    │      Express Backend        │   │
│  │                     │    │                             │   │
│  │  - Dashboard        │◄──►│  - REST API                 │   │
│  │  - Assets           │    │  - Request Validation       │   │
│  │  - Vulnerabilities  │    │  - Verbose Logging          │   │
│  │  - Authorizations   │    │  - Error Handling           │   │
│  │  - Actions          │    │                             │   │
│  │  - Controls         │    └─────────────┬───────────────┘   │
│  │  - Reports          │                  │                    │
│  │  - Settings         │                  ▼                    │
│  └─────────────────────┘    ┌─────────────────────────────┐   │
│                             │        Storage Layer         │   │
│                             │   (In-Memory / PostgreSQL)   │   │
│                             └─────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS, Radix UI, TanStack Query |
| Backend | Node.js, Express.js, TypeScript |
| Validation | Zod, drizzle-zod |
| Database | PostgreSQL (optional), In-Memory Storage |
| ORM | Drizzle ORM |
| Build | Vite, esbuild |

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **PostgreSQL** 14+ (optional, for persistent storage)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/securecopilot.git
cd securecopilot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | (in-memory) |
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error) | `info` |

### Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm start
```

#### Type Checking
```bash
npm run check
```

#### Database Migrations (if using PostgreSQL)
```bash
npm run db:push
```

The application will be available at `http://localhost:5000`.

## Project Structure

```
securecopilot/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   └── ui/           # Shadcn UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Page components
│   │   │   ├── dashboard.tsx
│   │   │   ├── assets.tsx
│   │   │   ├── vulnerabilities.tsx
│   │   │   ├── authorizations.tsx
│   │   │   ├── actions.tsx
│   │   │   ├── controls.tsx
│   │   │   ├── reports.tsx
│   │   │   └── settings.tsx
│   │   ├── App.tsx           # Main application component
│   │   └── main.tsx          # Application entry point
│   └── index.html
├── server/                    # Backend Express application
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Storage interface
│   ├── seed.ts               # Database seeding
│   ├── logger.ts             # Verbose logging utility
│   └── vite.ts               # Vite dev server integration
├── shared/                    # Shared code between client/server
│   └── schema.ts             # Data models and validation schemas
├── script/                    # Build scripts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

## API Reference

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/metrics` | Get dashboard metrics and KPIs |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all assets (with pagination and filtering) |
| GET | `/api/assets/:id` | Get a specific asset |
| POST | `/api/assets` | Create a new asset |
| PATCH | `/api/assets/:id` | Update an asset |
| DELETE | `/api/assets/:id` | Delete an asset |

### Vulnerabilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vulnerabilities` | List vulnerabilities (with pagination and filtering) |
| GET | `/api/vulnerabilities/:id` | Get a specific vulnerability |
| PATCH | `/api/vulnerabilities/:id` | Update vulnerability status |
| POST | `/api/vulnerabilities/import` | Bulk import vulnerabilities from CSV |

### Authorizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/authorizations` | List all authorizations |
| GET | `/api/authorizations/:id` | Get a specific authorization |
| POST | `/api/authorizations` | Create a new authorization |
| PATCH | `/api/authorizations/:id` | Update an authorization |

### Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actions` | List all action logs |
| GET | `/api/actions/:id` | Get a specific action |
| POST | `/api/actions` | Create a new action log |
| PATCH | `/api/actions/:id/approve` | Approve an action |

### Security Controls

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/controls` | List all security controls |
| GET | `/api/controls/:id` | Get a specific control |

## Data Models

### Asset Types
- `web_application` - Web applications and portals
- `api` - REST/GraphQL APIs
- `database` - Database servers
- `server` - Physical/virtual servers
- `cloud_resource` - Cloud infrastructure
- `container` - Docker/Kubernetes containers
- `network_device` - Routers, switches, firewalls
- `mobile_app` - iOS/Android applications

### Vulnerability Severities
- `critical` - CVSS 9.0-10.0
- `high` - CVSS 7.0-8.9
- `medium` - CVSS 4.0-6.9
- `low` - CVSS 0.1-3.9
- `info` - Informational findings

### Authorization Statuses
- `pending` - Awaiting approval
- `approved` - Approved for testing
- `expired` - Past end date
- `revoked` - Manually revoked

## Logging

SecureCopilot includes comprehensive verbose logging for debugging and audit purposes.

### Log Levels

| Level | Description |
|-------|-------------|
| `DEBUG` | Detailed debugging information |
| `INFO` | General operational messages |
| `WARN` | Warning conditions |
| `ERROR` | Error conditions |

### Log Format

```
[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE
{metadata}
```

### Example Log Output

```
2025-01-05T10:30:45.123Z [INFO] [HTTP] GET /api/assets 200 45ms
2025-01-05T10:30:45.125Z [DEBUG] [STORAGE] Fetched 42 assets with filters: {"type":"web_application"}
2025-01-05T10:30:46.001Z [INFO] [HTTP] POST /api/assets 201 120ms
2025-01-05T10:30:46.002Z [INFO] [AUDIT] Asset created: {id: "asset-123", name: "Production API"}
```

### Configuring Log Level

Set the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests and type checking: `npm run check`
5. Commit with a descriptive message
6. Push and create a Pull Request

## Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

**Do not report security vulnerabilities through public GitHub issues.**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs.securecopilot.io](https://docs.securecopilot.io)
- **Issues**: [GitHub Issues](https://github.com/your-org/securecopilot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/securecopilot/discussions)

---

Made with security in mind by the SecureCopilot team.
