# ðŸƒ Current Sprint Board (Sprint 1: Centralized Auth & UI Consistency)

* **Sprint Goal:** Secure user PIN logins and centralize identity to BioeelAuth REST API, build a manual sync controller panel, and standardize sidebar layout to match Campanii Inteligente.
* **Duration:** 2026-08-22 to 2026-09-05
* **Capacity:** 25 pts (Committed: 18 pts)

---

## ðŸ“‹ Sprint Kanban Board

### ðŸ“ To Do
- [ ] **`UI-202`**: Circular hours worked progress rings (SVG) on ClockWidget dashboard (3 pts) â€” *Assignee: Frontend Dev*
  - Files: `components/ClockWidget.tsx`
- [ ] **`LV-301`**: Automated Leave Request PDF compiler & email dispatch to HR (5 pts) â€” *Assignee: Fullstack Dev*
  - Files: `components/LeaveModal.tsx`, `bridge/server.js`

---

### â³ In Progress
- [ ] **`UI-203`**: Modern floating toast notifications for clock actions & sync results (3 pts) â€” *Assignee: Frontend Agent*
  - Files: `components/shared/`
  - Status: Investigating toast libraries compatibilities

---

### ðŸ” In Review / QA
- [ ] **`SEC-003`**: Autentificare È™i autorizare pe server: sesiune JWT Ã®n cookie httpOnly, login Microsoft validat pe server, reguli de acces pe roluri È™i companie, filtrarea datelor pe server (8 pts) â€” *Assignee: Fullstack Agent*
  - Files: `bridge/auth/session.js`, `bridge/auth/policy.js`, `bridge/auth/microsoft.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `hooks/useAuth.ts`, `hooks/useAppData.ts`, `services/sqlService.ts`, `components/LoginScreen.tsx`, `App.tsx`, `constants.ts`
  - Verification: 10/10 teste de politicÄƒ (`npm run test:auth`), build OK. UrmeazÄƒ: deploy Ã®n `AUTH_MODE=report`, analizÄƒ log `[AUTHZ-VIOLATION]` 1â€“2 zile, apoi `AUTH_MODE=enforce`.

---

### âœ… Done
- [x] **`SEC-001`**: Butoanele demo, SSO-ul simulat È™i PIN-urile demo ascunse Ã®n build-ul de producÈ›ie (1 pt) â€” *Completed 2026-10-30*
  - Files: `components/LoginScreen.tsx`
- [x] **`SEC-002`**: Stack trace eliminat din rÄƒspunsurile API; limitare Ã®ncercÄƒri PIN (5 / 15 min); sincronizarea la cerere limitatÄƒ la 1 / 5 min (2 pts) â€” *Completed 2026-10-30*
  - Files: `bridge/server.js`
- [x] **`DATA-001`**: Data pontajelor calculatÄƒ Ã®n ora localÄƒ, nu Ã®n UTC (2 pts) â€” *Completed 2026-10-30*
  - Files: `utils/date.ts`, `App.tsx`, `hooks/useTimesheetManager.ts`, `ClockWidget.tsx`, `ManagerDashboard.tsx`, `TimesheetEditModal.tsx`, `NomenclatorManagement.tsx`
- [x] **`FIX-001`**: Build reparat dupÄƒ merge-ul greÈ™it din 08.10 (markeri de conflict Ã®n `AdminUserManagement.tsx`, export dublu Ã®n `BackendControlPanel.tsx`) (1 pt) â€” *Completed 2026-10-30*
- [x] **`AUTH-101`**: Secure PIN Login through backend REST API (Check & Login) (5 pts) â€” *Completed 2026-08-22*
  - Files: `components/LoginScreen.tsx`, `services/sqlService.ts`, `bridge/server.js`
- [x] **`AUTH-102`**: BioeelAuth manual sync panel in Admin User Management (3 pts) â€” *Completed 2026-08-22*
  - Files: `components/AdminUserManagement.tsx`, `App.tsx`
- [x] **`AUTH-103`**: Automatic user sync on server boot and periodic (6 hours) interval (3 pts) â€” *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`AUTH-104`**: On-demand user sync when user is not found locally (3 pts) â€” *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`AUTH-105`**: Fallback to localhost port 3006 API on production server (2 pts) â€” *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`UI-201`**: Compact sidebar user profile matching Campanii Inteligente style (2 pts) â€” *Completed 2026-08-22*
  - Files: `App.tsx`
