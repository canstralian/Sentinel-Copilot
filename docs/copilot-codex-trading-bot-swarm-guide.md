# GitHub Copilot + Codex Configuration Guide for Trading Bot Swarm

## 1) Purpose and Scope

This guide standardizes how contributors configure and use **GitHub Copilot** and **Codex** in a Trading Bot Swarm ecosystem.

**Goals:**
- Keep generated and human-written code consistent.
- Enforce quality gates before merge.
- Reduce security and operational risk in autonomous or semi-autonomous automation.
- Align contributors, reviewers, and CI/CD around one behavior model.

Copilot should be treated as a **pair programmer with strict rules**, not as an autonomous agent. It can suggest code quickly, but contributors remain responsible for correctness, safety, and compliance.

---

## 2) Configuration Overview

Use a project-level instruction set and repository automation to enforce the following defaults.

### Testing and Linting
- Run lint + tests for all code changes.
- Skip heavy quality gates for docs-only changes.
- Block merge when quality gates fail.

### Code Style
- Prefer TypeScript strict mode.
- Require explicit types at public boundaries.
- Keep functions small and deterministic where possible.
- Use existing architecture patterns in `client/`, `server/`, and `shared/`.

### Async Patterns
- Use `async/await` over chained promises.
- Wrap external I/O calls with timeout + retry policy where applicable.
- Avoid unbounded concurrency in strategy execution loops.
- Ensure cancellation/shutdown behavior for long-running bot tasks.

### Security Defaults
- Never hardcode API keys, exchange secrets, or tokens.
- Read secrets from secure env/secret manager only.
- Validate all external inputs (webhooks, market data, broker APIs).
- Add least-privilege scopes for integrations.
- Redact secrets from logs and error messages.

### Logging and Observability
- Use structured logs with strategy ID, market, order ID, correlation ID.
- Emit metrics for execution latency, fill failures, slippage, retry counts.
- Track critical audit events (config changes, deployment changes, key rotations).
- Add tracing for order lifecycle flows when available.

### CI/CD Integration
- Run quality checks on pull requests and protected branches.
- Fail fast on lint/type/test errors.
- Use signed artifacts and immutable build references.
- Include dependency and security scanning in the pipeline.

### Version Control
- Use short-lived feature branches.
- Keep commits atomic and message scope clear.
- Require code review and passing CI for merge.
- Tag releases with semantic versioning.

---

## 3) Custom Instruction Behavior (Codex + Copilot)

Below is a **conceptual YAML format** for standard behavior. Adapt naming and tool fields to your platform.

```yaml
assistant_policy:
  role: "pair_programmer"
  autonomy: "suggest_and_execute_with_review"
  hard_rules:
    - "Do not bypass tests or linters for code changes."
    - "Do not introduce secrets into code, logs, fixtures, or docs."
    - "Prefer existing project conventions over new patterns."
    - "If requirements are ambiguous, ask for clarification before risky changes."
    - "For docs-only changes, skip code test/lint requirements."

copilot:
  behavior:
    suggest_style: "repo_consistent"
    avoid:
      - "untested refactors across unrelated modules"
      - "new dependencies without justification"
      - "silent error swallowing"
  code_generation_rules:
    - "Use TypeScript strict-compatible code."
    - "Preserve API contracts unless explicitly changing them."
    - "Add tests when behavior changes."

codex:
  behavior:
    planning: "small_verifiable_steps"
    validation:
      code_changes:
        required:
          - "lint"
          - "typecheck"
          - "tests"
      docs_changes:
        required: []
        note: "No lint/test gate required when only markdown/docs changed."
  commit_rules:
    - "Use descriptive commit messages with scope."
    - "Summarize validation commands and outcomes in PR body."

quality_gates:
  fail_on:
    - "lint_errors"
    - "type_errors"
    - "test_failures"
    - "high_or_critical_security_findings"
```

### Example Rule Set (Human-readable)
- If files under `client/`, `server/`, or `shared/` change, run lint/type/test.
- If only `*.md` files change, require docs quality checks only (spelling/links optional).
- Any change touching execution logic, risk controls, or order routing must include tests.

---

## 4) GitHub Workflow Example: Lint + Test Automation

Use a quality-gate workflow that triggers on code changes and skips docs-only edits.

```yaml
name: quality-gate

on:
  pull_request:
    paths-ignore:
      - "**/*.md"
      - "docs/**"
  push:
    branches: [main]
    paths-ignore:
      - "**/*.md"
      - "docs/**"

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run check

      - name: Unit tests
        run: npm run test -- --runInBand
```

### Quality Gate Job Steps
1. Checkout repository.
2. Provision runtime/toolchain.
3. Install dependencies reproducibly.
4. Run lint.
5. Run type checks.
6. Run tests.
7. Fail pipeline on first hard failure.

---

## 5) Best-Practice Workflow: Semantic Release + Version Tagging

```yaml
name: release

on:
  push:
    branches: [main]

jobs:
  semantic-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run test
      - name: Semantic release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

**Tagging conventions:**
- `vMAJOR.MINOR.PATCH`
- Generate changelog from conventional commits.
- Publish only from protected branches after passing quality gates.

---

## 6) Best-Practice Workflow: Security + Dependency Scanning

```yaml
name: security-scan

on:
  pull_request:
  schedule:
    - cron: "0 3 * * 1"

jobs:
  dependency-and-code-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Audit dependencies
        run: npm audit --audit-level=high

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - name: Build
        run: npm run build

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

---

## 7) Contributor Guidelines

### Proposing Changes
- Open PR with clear scope and risk statement.
- Link related issues/incidents/strategy identifiers.
- Include tests for behavior changes.
- Explain any schema/API contract impacts.

### Review Criteria
- Correctness: strategy logic and control flow are deterministic and test-covered.
- Safety: no secret exposure, no unsafe defaults, proper validation.
- Reliability: retries/timeouts/circuit-breaker behavior is explicit.
- Operability: logs and metrics provide enough incident context.
- Maintainability: code follows existing patterns and naming conventions.

### Validation Process
- Local: lint + typecheck + tests.
- CI: all required checks pass.
- Security: dependency scan and code scan pass.
- Release readiness: versioning/changelog rules satisfied.

---

## 8) Troubleshooting and Optimization Tips

### Common Issues
- **Copilot suggests off-pattern code**
  - Add stronger repository instruction snippets and examples.
- **Codex attempts broad refactors**
  - Enforce small-step planning and module-scoped changes.
- **Flaky tests block PRs**
  - Mark unstable tests, isolate external dependencies, add deterministic fixtures.
- **Slow CI pipelines**
  - Cache dependencies, split jobs, run affected-test selection.
- **Security scan noise**
  - Triage and suppress with expiration + justification policy.

### Optimization
- Keep instruction files versioned and reviewed.
- Use reusable workflows for consistency across bot repositories.
- Measure DORA-like metrics plus incident recovery and regression rates.

---

## 9) Guide Maintenance Schedule

- **Monthly:** review instruction quality, false positives, and developer feedback.
- **Quarterly:** audit CI policies, security thresholds, and release automation.
- **On major architecture change:** update examples, rule sets, and mandatory checks.
- **Ownership:** assign a rotating maintainer from platform/security engineering.

Change log recommendation:
- Record all guide updates with date, owner, and reason.

---

## Closing Note

The objective of this guide is to **standardize excellence** across the Trading Bot Swarm ecosystem—strengthening reliability, performance, and safety while enabling fast, disciplined delivery.
