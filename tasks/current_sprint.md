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
*(Niciun task în desfășurare)*

---

### 🔍 In Review / QA
*(Niciun task în așteptare)*

---

### ✅ Done
- [x] **`SEC-005`**: Securitate PIN cu 2FA la înrolare telefon + Device Binding (`1 Angajat = 1 Telefon Înrolat`): cookie criptografic `pontaj_device` (1 an, `httpOnly`, SHA-256 în `users.trusted_device_hash`), verificare cod 2FA din 6 cifre la primul login (`POST /api/v1/auth/verify-2fa`), blocare automată a oricărui alt telefon și gestiune HR (`Cod 2FA` + `Reset Telefon` în `AdminUserManagement.tsx`) (5 pts) — *Completed 2026-10-30*
  - Files: `bridge/migration.sql`, `bridge/auth/session.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `types.ts`, `services/sqlService.ts`, `components/LoginScreen.tsx`, `components/AdminUserManagement.tsx`, `scripts/e2e_auth_test.mjs`
- [x] **`MOB-001`**: Aplicație Android PWA instalabilă („Mod Mobil – Doar Pontare”): ecran dedicat `MobileClockScreen.tsx` (exclusiv Login + `ClockWidget`), banner de instalare rapidă pe Android (`beforeinstallprompt`), `start_url: /pontaj/?mode=mobile` și protecție împotriva locației simulate în producție (3 pts) — *Completed 2026-10-30*
  - Files: `components/MobileClockScreen.tsx`, `components/ClockWidget.tsx`, `App.tsx`, `vite.config.ts`, `index.html`
- [x] **`UI-203`**: Notificări flotante moderne (Toast) fără dependențe externe în locul `alert()` blocant pentru pontaj, concedii, corecții, nomenclatoare și sincronizare (3 pts) — *Completed 2026-10-30*
  - Files: `utils/toast.ts`, `components/ToastContainer.tsx`, `App.tsx`, `hooks/useTimesheetManager.ts`, `components/TimesheetEditModal.tsx`, `components/RejectionModal.tsx`, `components/NomenclatorManagement.tsx`, `components/CompanyManagement.tsx`, `components/OfficeManagement.tsx`, `components/AdminUserManagement.tsx`
- [x] **`FIX-004`**: Restaurare butoane de adăugare și salvare în SQL în `NomenclatorManagement.tsx` (Pauze, Concedii, Programe de Lucru, Zile Libere) și conectarea `workSchedules` reale în `TimesheetEditModal.tsx` (2 pts) — *Completed 2026-10-30*
  - Files: `components/NomenclatorManagement.tsx`, `components/TimesheetEditModal.tsx`, `App.tsx`
- [x] **`EMAIL-001`**: Fallback server-side automat pentru emailurile de concediu (`POST /api/v1/email/leave-request`) pentru angajații cu PIN sau fără sesiune Graph activă + formatare `DD.MM.YYYY` (2 pts) — *Completed 2026-10-30*
  - Files: `services/graphService.ts`, `services/sqlService.ts`
- [x] **`CLEAN-001`**: Eliminare PIN-uri plaintext și constante moarte din `constants.ts`, extindere sărbători legale RO pentru 2027–2028 și curățare importuri nefolosite (2 pts) — *Completed 2026-10-30*
  - Files: `constants.ts`, `App.tsx`, `bridge/auth/policy.test.js`
- [x] **`PERF-001`**: Paginare / filtrare pe interval de date (`?from=...&to=...&userId=...`) + indecși SQL pe `timesheets`, `leave_requests`, `schedule_plans` și `notifications` + fereastră implicită de 90 de zile la încărcare (3 pts) — *Completed 2026-10-30*
  - Files: `bridge/migration.sql`, `bridge/server.js`, `services/sqlService.ts`, `hooks/useAppData.ts`
- [x] **`PERF-002`**: Eliminare interogări N+1 în `syncUsersWithBioeelAuth` prin pre-încărcarea în memorie a `companies`, `departments` și `users` + creșterea timeout-ului de citire la 15s (2 pts) — *Completed 2026-10-30*
  - Files: `bridge/server.js`, `services/sqlService.ts`
- [x] **`PERF-003`**: Eliminare reîncărcări redundante `fetchAllData()` după aprobare corecție și creare utilizator (actualizare chirurgicală a stării locale) (1 pt) — *Completed 2026-10-30*
  - Files: `hooks/useTimesheetManager.ts`
- [x] **`DATA-009`**: Sistem complet de notificări persistente pe server (`notifications`, `GET /api/v1/notifications`, `POST /api/v1/notifications/read`) generat automat la creare/aprobare/respingere concedii și corecții (pentru toți utilizatorii, inclusiv PIN) (3 pts) — *Completed 2026-10-30*
  - Files: `bridge/migration.sql`, `bridge/auth/policy.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `services/sqlService.ts`, `hooks/useAppData.ts`, `App.tsx`
- [x] **`SEC-004`**: Validare strictă de schemă cu `zod` pe endpoint-urile de scriere (`POST /seed/timesheets`, `POST /seed/leaves`, `POST /seed/corrections`, `POST /schedule-plans`) (2 pts) — *Completed 2026-10-30*
  - Files: `bridge/server.js`, `scripts/e2e_auth_test.mjs`
- [x] **`SEC-003`**: Autentificare și autorizare pe server (`AUTH_MODE=enforce`): sesiune JWT în cookie httpOnly, login Microsoft validat pe server, reguli de acces pe roluri și companie, filtrarea datelor pe server (8 pts) — *Completed 2026-10-30*
  - Files: `bridge/auth/session.js`, `bridge/auth/policy.js`, `bridge/auth/microsoft.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `hooks/useAuth.ts`, `hooks/useAppData.ts`, `services/sqlService.ts`, `components/LoginScreen.tsx`, `App.tsx`, `constants.ts`
- [x] **`DATA-002`**: Timestamp server-side (`Europe/Bucharest`) la Clock-In, Clock-Out și Pauze pentru prevenirea manipulării ceasului de pe dispozitiv (3 pts) — *Completed 2026-10-30*
  - Files: `bridge/auth/policy.js`, `bridge/auth/policy.test.js`, `bridge/server.js`, `hooks/useTimesheetManager.ts`, `services/sqlService.ts`
- [x] **`DATA-003`**: Persistență completă în SQL Server pentru `timesheet_logs` (audit), `notes`, `endLocation`, `distanceToOffice`, `cancellationReason`, `createdAt` (3 pts) — *Completed 2026-10-30*
  - Files: `bridge/migration.sql`, `bridge/server.js`
- [x] **`DATA-004`**: Persistență în SQL Server pentru planificarea programului (`schedule_plans`) și luna închisă (`app_settings.lockedDate`) (3 pts) — *Completed 2026-10-30*
  - Files: `bridge/migration.sql`, `bridge/server.js`, `services/sqlService.ts`, `hooks/useAppData.ts`, `hooks/useTimesheetManager.ts`, `components/NomenclatorManagement.tsx`
- [x] **`DATA-005`**: Persistența ștergerilor în nomenclatoare (`?replace=1`) și salvarea programelor de lucru în SQL (2 pts) — *Completed 2026-10-30*
  - Files: `bridge/server.js`, `components/NomenclatorManagement.tsx`, `components/CompanyManagement.tsx`, `components/OfficeManagement.tsx`
- [x] **`DATA-008`**: Calcul zile lucrătoare la concedii (fără weekend și sărbători legale) și formatare `DD.MM.YYYY` (2 pts) — *Completed 2026-10-30*
  - Files: `utils/date.ts`, `App.tsx`, `components/LeaveModal.tsx`, `components/ManagerDashboard.tsx`
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
