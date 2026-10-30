---
name: build_and_dev
description: Type-checks and builds PontajSmart, then starts the backend bridge and the Vite dev server for local verification.
---

# PontajSmart Build and Dev Workflow

Builds the application and starts both local processes needed to try it in the browser.

## Prerequisites
- Node.js installed, dependencies installed (`npm install`).
- `.env` in the project root with the dev SQL Server, `JWT_SECRET`, `AUTH_MODE` and `AZURE_*` values.

## Instructions

From the project root:

```powershell
./.agents/skills/build_and_dev/scripts/run.ps1
```

## Workflow Steps
1. **Lint & Type Check**: `npm run lint`.
2. **Production Build**: `npm run build` (assets in `dist/`).
3. **Backend**: starts `npm run server` (Express bridge on port 3005) in a separate window.
4. **Frontend**: starts `npm run dev` (Vite on http://localhost:3000/pontaj/, API proxied to the bridge, same origin so the session cookie works).

If lint or build fails, the script stops and nothing is started.
