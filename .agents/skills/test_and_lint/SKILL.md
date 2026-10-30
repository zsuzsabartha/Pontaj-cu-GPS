---
name: test_and_lint
description: Runs TypeScript type-checking, the authorization policy unit tests and the production build for PontajSmart; optionally the end-to-end API/auth test against the dev SQL Server.
---

# PontajSmart Test and Lint Workflow

Validates the codebase before a commit or deploy.

## Prerequisites
- Node.js & NPM installed, dependencies installed (`npm install`).
- For `-E2E`: network access to the dev SQL Server configured in `.env` (run outside the agent sandbox).

## Instructions

From the project root:

```powershell
./.agents/skills/test_and_lint/scripts/run.ps1          # lint + policy tests + build
./.agents/skills/test_and_lint/scripts/run.ps1 -E2E     # + end-to-end auth/API test on the dev DB
```

## Workflow Steps
1. **Lint & Type Check**: `npm run lint` (`tsc --noEmit`) – must report 0 errors.
2. **Authorization policy tests**: `npm run test:auth` (`node --test bridge/auth/policy.test.js`).
3. **Production build**: `npm run build`.
4. **(Optional) End-to-end**: `npm run test:e2e` – starts the bridge in `AUTH_MODE=enforce` on a temporary port, checks every access rule with real users and removes its `test-auth-*` data.

The script stops at the first failing step.
