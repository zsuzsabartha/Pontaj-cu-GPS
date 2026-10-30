# Workspace Rules for Antigravity – PontajSmart (Andrej Karpathy Engineering Principles)

Aceleași principii ca în BioeelPOS, adaptate pentru aplicația de pontaj.

1. **Understand from First Principles (No Magic / No Leaky Abstractions)**
   - Always trace the actual data path: UI (React) → `services/sqlService.ts` → Express bridge (`bridge/server.js`) → SQL Server (`PontajSmart`) / BioeelAuth (POS `:3006`).
   - Never assume or guess. Inspect raw SQL rows, raw JSON payloads and response status codes before writing code.

2. **The Recipe: Minimal Working Baseline First, Then Iterate**
   - Build the simplest end-to-end flow first (clock in → save → reload → same data) and make it 100% reliable before adding features.

3. **Become One with the Data**
   - Check real column names in `INFORMATION_SCHEMA.COLUMNS` before writing SQL (e.g. `correction_requests.requested_start`, not `requested_start_time`).
   - 90% of bugs are data mismatch bugs – check the data first.

4. **Simplicity First (nanoGPT / micrograd Philosophy)**
   - 50 lines of clean, readable code beat 500 lines of framework abstractions. No speculative layers.

5. **Surgical Changes & High Precision**
   - Touch only the files needed for the task. Do not refactor stable adjacent code without explicit need.
   - Line endings: most files are CRLF – keep them as they are.

6. **Don't Trust Vibes – Use Hard Assertions (Deterministic Testing)**
   - Before declaring done, run: `npm run lint`, `npm run test:auth`, `npm run build`.
   - For anything touching API, auth or SQL also run `npm run test:e2e` (real dev SQL Server; test data uses the `test-auth-` prefix and dates in 2099 and is removed automatically).

7. **Zero-Friction User Experience**
   - Clocking in must be instantaneous and transparent. No unnecessary popups or redirects; keep the UI in Romanian business vocabulary (see `.agents/rules/bioeel-standards.md`).

8. **Automatic Git Commit & Push**
   - Stage, commit with a clear descriptive message and push to `origin/main` after each verified milestone.
   - Never commit a merge with unresolved conflict markers: `npm run lint` and `npm run build` must pass first.

9. **Security Is Server-Side (PontajSmart specific)**
   - Identity and roles come only from the server session (`bridge/auth/session.js`, httpOnly cookie). Never trust roles, user IDs or timestamps sent by the browser.
   - Every new API route must declare its access rule using `bridge/auth/policy.js` and get a test in `bridge/auth/policy.test.js`.
   - `AUTH_MODE=report` only during rollout; target state is `AUTH_MODE=enforce`.

10. **Local Calendar Dates (PontajSmart specific)**
    - Business dates (timesheet day, leave days, "today") use the local calendar via `utils/date.ts` (`toLocalDateISO`). Never use `toISOString().split('T')[0]` for a calendar day.
    - User-facing dates follow `.agents/rules/date_format.md` (`DD.MM.YYYY`).
