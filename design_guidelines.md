# Security Management Platform Copilot - Design Guidelines

## Design Approach
**System-Based**: Enterprise security dashboard following patterns from Splunk Enterprise Security, Tenable.io, and ServiceNow GRC modules. Prioritizes information density, workflow efficiency, and compliance requirements over visual flair.

## Color System
- **Primary**: #1E3A8A (deep security blue) - main UI elements, primary actions
- **Secondary**: #DC2626 (critical red) - critical severity, destructive actions
- **Warning**: #F59E0B (amber) - medium/high severity, caution states
- **Success**: #10B981 (green) - success states, low severity, safe actions
- **Background**: #F8FAFC (light slate) - main background
- **Accent**: #6366F1 (indigo) - highlights, links, interactive elements
- **Text**: #0F172A (slate black) - primary text
- **Severity Indicators**: Use color-coded badges (Critical=red, High=orange, Medium=amber, Low=green, Info=blue)

## Typography
- **Primary Font**: IBM Plex Sans (UI text, labels, body content)
- **Monospace Font**: Roboto Mono (code blocks, technical output, command logs, IDs)
- **Hierarchy**: H1: 24px/bold, H2: 20px/semibold, H3: 18px/semibold, Body: 14px/regular, Small: 12px/regular

## Layout Architecture
**Multi-Panel Dashboard**:
- **Left Navigation**: 240px fixed sidebar with collapsible sections (Dashboard, Assets, Vulnerabilities, Testing, Compliance, Reports, Settings)
- **Main Content Area**: Fluid width with max-width constraint (1400px)
- **Top Bar**: 64px height with breadcrumbs, search, notifications, user menu
- **Grid System**: 20px base spacing unit (p-5, gap-5, m-5 in Tailwind)

## Component Library

### Dashboard Cards
- 6px border radius
- Subtle border (#E2E8F0)
- White background with subtle shadow
- Header with title + action buttons
- Expandable sections for technical details
- Color-coded status bars on left edge for severity

### Tabbed Workflows
- Horizontal tabs for process steps (Input → Analysis → Testing → Remediation → Reporting)
- Active tab: Primary color bottom border (3px)
- Tab content with proper padding (p-6)

### Structured Forms
- Input groups with clear labels (text-sm font-medium)
- Validation states: Success (green border), Error (red border + message), Warning (amber border)
- Required field indicators (red asterisk)
- Approval checkboxes for authorization tracking
- Scope validation toggles

### Data Tables
- Sortable columns with clear headers
- Row hover states (background: #F1F5F9)
- Inline actions (view, edit, approve)
- Color-coded severity columns
- Expandable rows for detailed findings
- Pagination + row count selector

### Action Logging Panel
- Fixed-width right panel (320px) OR bottom drawer
- Command preview with intent, risk level, required approvals
- Rollback procedure display
- Monospace font for technical commands
- Approval workflow UI (checkboxes, signatures)

## Functional Sections

### Input Processing
- Asset upload interface (CSV, API integrations)
- Scope boundary definition with visual validation
- Authorization document upload + tracking
- Multi-source data ingestion cards

### Analysis Output
- Threat hypothesis cards with MITRE ATT&CK mapping
- CVSS score visualization with breakdown
- Business impact assessment (risk matrix visualization)
- Safe test plan generator with step-by-step breakdown

### Remediation Workflows
- Framework mapping selector (NIST/ISO/CIS dropdowns)
- Prioritized fix list with estimated effort
- Ticket generation integration buttons
- Retest scheduling calendar

### Reporting Dashboard
- Executive summary cards (high-level metrics)
- Technical appendices (expandable sections)
- Export options (PDF, CSV, SIEM integration)
- Compliance badge display

## Images
**Hero Section**: No large hero image. This is an enterprise security tool focused on data density and workflow efficiency. Open directly to the dashboard interface.

**In-Dashboard Imagery**:
- Small status icons throughout (security shield, checkmark, warning triangle)
- Chart/graph visualizations for risk scoring
- Network topology diagrams where applicable
- Framework logos (NIST, ISO, CIS) as small badges

## Interaction Patterns
- Minimal animations (subtle fade-ins for modals, no decorative motion)
- Instant feedback on form validation
- Progressive disclosure for technical details
- Confirmation modals for destructive actions
- Toast notifications for success/error states (top-right position)

## Responsive Behavior
- Desktop-first (primary use case)
- Collapsible left nav on tablet (hamburger menu)
- Stacked cards on mobile
- Horizontal scroll for wide tables on small screens