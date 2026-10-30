# 🏃 Current Sprint Board (Sprint 1: Centralized Auth & UI Consistency)

* **Sprint Goal:** Secure user PIN logins and centralize identity to BioeelAuth REST API, build a manual sync controller panel, and standardize sidebar layout to match Campanii Inteligente.
* **Duration:** 2026-08-22 to 2026-09-05
* **Capacity:** 25 pts (Committed: 18 pts)

---

## 📋 Sprint Kanban Board

### 📝 To Do
- [ ] **`UI-202`**: Circular hours worked progress rings (SVG) on ClockWidget dashboard (3 pts) — *Assignee: Frontend Dev*
  - Files: `components/ClockWidget.tsx`
- [ ] **`LV-301`**: Automated Leave Request PDF compiler & email dispatch to HR (5 pts) — *Assignee: Fullstack Dev*
  - Files: `components/LeaveModal.tsx`, `bridge/server.js`

---

### ⏳ In Progress
- [ ] **`UI-203`**: Modern floating toast notifications for clock actions & sync results (3 pts) — *Assignee: Frontend Agent*
  - Files: `components/shared/`
  - Status: Investigating toast libraries compatibilities

---

### 🔍 In Review / QA
- [ ] **`SEC-003`**: Autentificare și autorizare pe server: sesiune JWT în cookie httpOnly, login Microsoft validat pe server, reguli de acces pe roluri și companie, filtrarea datelor pe server (8 pts) — *Assignee: Fullstack Agent*
  - Files: `bridge/auth/session.js`, `bridge/auth/policy.js`, `bridge/auth/microsoft.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `hooks/useAuth.ts`, `hooks/useAppData.ts`, `services/sqlService.ts`, `components/LoginScreen.tsx`, `App.tsx`, `constants.ts`
  - Verification: 10/10 teste de politică (`npm run test:auth`), 29/29 teste end-to-end pe SQL dev în `AUTH_MODE=enforce` (`npm run test:e2e`), lint 0 erori, build OK. Urmează: deploy în `AUTH_MODE=report`, analiză log `[AUTHZ-VIOLATION]`, apoi `AUTH_MODE=enforce`.

---

### ✅ Done
- [x] **`SEC-001`**: Butoanele demo, SSO-ul simulat și PIN-urile demo ascunse în build-ul de producție (1 pt) — *Completed 2026-10-30*
  - Files: `components/LoginScreen.tsx`
- [x] **`SEC-002`**: Stack trace eliminat din răspunsurile API; limitare încercări PIN (5 / 15 min); sincronizarea la cerere limitată la 1 / 5 min (2 pts) — *Completed 2026-10-30*
  - Files: `bridge/server.js`
- [x] **`DATA-001`**: Data pontajelor calculată în ora locală, nu în UTC (2 pts) — *Completed 2026-10-30*
  - Files: `utils/date.ts`, `App.tsx`, `hooks/useTimesheetManager.ts`, `ClockWidget.tsx`, `ManagerDashboard.tsx`, `TimesheetEditModal.tsx`, `NomenclatorManagement.tsx`
- [x] **`FIX-001`**: Build reparat după merge-ul greșit din 08.10 (markeri de conflict în `AdminUserManagement.tsx`, export dublu în `BackendControlPanel.tsx`) (1 pt) — *Completed 2026-10-30*
- [x] **`FIX-002`**: Cererile de corecție nu se salvau deloc (coloane greșite `requested_start_time` vs. `requested_start`); pontajul cu o corecție atașată nu mai putea fi re-salvat sau șters (FK fără cascadă) (2 pts) — *Completed 2026-10-30*
  - Files: `bridge/server.js`
- [x] **`FIX-003`**: Panoul „Sincronizare BioeelAuth” nu apărea niciodată (imbricat greșit); butonul „Respinge” din emailul de concediu bloca aplicația (1 pt) — *Completed 2026-10-30*
  - Files: `components/AdminUserManagement.tsx`, `App.tsx`
- [x] **`SYS-002`**: Guvernanță ca în BioeelPOS: `.agents/AGENTS.md`, regula `date_format`, skill-urile `test_and_lint` și `build_and_dev`, scripturile `lint`, `test:auth`, `test:e2e` (2 pts) — *Completed 2026-10-30*
- [x] **`AUTH-101`**: Secure PIN Login through backend REST API (Check & Login) (5 pts) — *Completed 2026-08-22*
  - Files: `components/LoginScreen.tsx`, `services/sqlService.ts`, `bridge/server.js`
- [x] **`AUTH-102`**: BioeelAuth manual sync panel in Admin User Management (3 pts) — *Completed 2026-08-22*
  - Files: `components/AdminUserManagement.tsx`, `App.tsx`
- [x] **`AUTH-103`**: Automatic user sync on server boot and periodic (6 hours) interval (3 pts) — *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`AUTH-104`**: On-demand user sync when user is not found locally (3 pts) — *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`AUTH-105`**: Fallback to localhost port 3006 API on production server (2 pts) — *Completed 2026-08-22*
  - Files: `bridge/server.js`
- [x] **`UI-201`**: Compact sidebar user profile matching Campanii Inteligente style (2 pts) — *Completed 2026-08-22*
  - Files: `App.tsx`
