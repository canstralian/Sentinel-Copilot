# VulnTracker v1

A focused vulnerability management tool for small IT teams.

## Overview

VulnTracker v1 provides:
- **Vulnerability Import**: Import findings from Nessus, Qualys, Rapid7, Tenable via CSV
- **Smart Prioritization**: Risk scoring based on severity, exploitability, asset criticality, and age
- **Jira Integration**: Create remediation tickets directly from vulnerabilities

### What's NOT in v1 (by design)
- GRC/Compliance modules
- Penetration testing features
- Security controls management

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State**: TanStack Query (React Query)

### Directory Structure
```
client/src/
├── components/     # UI components (shadcn, custom)
├── pages/          # Route pages (Dashboard, Vulnerabilities, Assets, Settings, Activity)
├── hooks/          # Custom React hooks
├── lib/            # Utilities and query client

server/
├── routes.ts       # API endpoints
├── storage.ts      # Database operations
├── seed.ts         # Sample data seeding
├── db.ts           # Database connection

shared/
├── schema.ts       # Drizzle schema + types + risk scoring
```

### Database Schema
- **assets**: IT assets (servers, applications, databases) with criticality
- **vulnerabilities**: Security findings with risk scores, Jira integration
- **activityLogs**: Audit trail of all changes
- **jiraConfig**: Jira integration settings

### Risk Score Calculation
Factors in:
- Base severity (Critical: 40, High: 30, Medium: 20, Low: 10)
- Exploit availability (+25)
- Asset criticality multiplier (Critical: 1.5x, High: 1.25x)
- Age factor (>90 days: +20, >30 days: +10, >7 days: +5)

Max score: 100

## API Endpoints

### Dashboard
- `GET /api/dashboard/metrics` - Aggregated stats

### Assets
- `GET /api/assets` - List with filters
- `POST /api/assets` - Create asset
- `PATCH /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Remove asset

### Vulnerabilities
- `GET /api/vulnerabilities` - List with filters
- `POST /api/vulnerabilities` - Create
- `PATCH /api/vulnerabilities/:id` - Update status/assignee
- `POST /api/vulnerabilities/import` - CSV import
- `POST /api/vulnerabilities/bulk-update` - Bulk operations
- `POST /api/vulnerabilities/:id/jira` - Create Jira ticket

### Activity
- `GET /api/activity` - Audit log

### Jira
- `GET /api/jira/config` - Get configuration
- `POST /api/jira/config` - Save configuration

## Development

### Running
```bash
npm run dev
```

Starts Express + Vite on port 5000.

### Database
```bash
npx drizzle-kit push    # Push schema changes
```

## User Preferences
- None set yet

## Recent Changes
- Jan 10, 2026: Simplified to v1 focused MVP
  - Removed GRC modules (authorizations, security controls)
  - Added Jira integration
  - Implemented risk scoring algorithm
  - Renamed from SecureCopilot to VulnTracker
