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
- None

---

### ✅ Done
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
