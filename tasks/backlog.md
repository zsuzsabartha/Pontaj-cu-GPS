# 📋 Product Backlog — Pontaj Smart (Bioeel Pontaj & Sync)

All upcoming feature stories, Auth integrations, UI/UX refinements, and database optimizations for the Pontaj Smart platform are tracked here.

---

## 🔐 Epic 1: Auth & User Synchronization (BioeelAuth REST API)
| ID | Title | Priority | Estimate | Status | Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AUTH-101` | Secure PIN Login through backend REST API (Check & Login) | P0 | 5 pts | `Done` | `LoginScreen.tsx`, `server.js` |
| `AUTH-102` | BioeelAuth manual sync panel in Admin User Management | P0 | 3 pts | `Done` | `AdminUserManagement.tsx` |
| `AUTH-103` | Automatic user sync on server boot and periodic (6 hours) interval | P0 | 3 pts | `Done` | `bridge/server.js` |
| `AUTH-104` | On-demand user sync when user is not found locally during login | P1 | 3 pts | `Done` | `bridge/server.js` |
| `AUTH-105` | Automatic fallback to localhost port 3006 API on production server | P0 | 2 pts | `Done` | `bridge/server.js` |

---

## 🎨 Epic 2: UI/UX & Styling Refinements
| ID | Title | Priority | Estimate | Status | Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `UI-201` | Compact sidebar user profile matching Campanii Inteligente style | P0 | 2 pts | `Done` | `App.tsx` |
| `UI-202` | Circular hours worked progress rings (SVG) on ClockWidget dashboard | P1 | 3 pts | `Ready` | `components/ClockWidget.tsx` |
| `UI-203` | Modern floating toast notifications for clock actions & sync results | P1 | 3 pts | `Ready` | `components/shared/` |
| `UI-204` | Skeleton loading placeholders for Table components during fetch | P2 | 2 pts | `Draft` | `components/SmartTable.tsx` |

---

## 📅 Epic 3: Leave & Work Schedule Management
| ID | Title | Priority | Estimate | Status | Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `LV-301` | Automated Leave Request PDF compiler & email dispatch to HR | P0 | 5 pts | `Ready` | `LeaveModal.tsx`, `mailer.ts` |
| `SCH-302` | Multi-shift calendar auto-matching based on employee contracts | P1 | 8 pts | `Draft` | `scheduler.ts`, `Nomenclator` |
| `SCH-303` | GPS geofencing radius validation for remote mobile clocking | P1 | 5 pts | `Draft` | `ClockWidget.tsx` |

---

## 🗄️ Epic 4: ERP Integration & Payroll Export
| ID | Title | Priority | Estimate | Status | Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PAY-401` | Automated monthly timesheet export directly to ERP staging tables | P0 | 5 pts | `Ready` | `bridge/server.js` |
| `PAY-402` | Stored procedure sp_Test_IncomingOutgoingQueues integration | P1 | 5 pts | `Draft` | `bridge/db.js` |
