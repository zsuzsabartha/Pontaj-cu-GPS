
# Hooks Reference: Pontaj Smart

This document provides a detailed reference for the custom hooks used to manage state and logic in the application.

## 🪝 `useAuth`
**Location**: `/hooks/useAuth.ts`
**Purpose**: Handles authentication and session management.

### State & Properties
- `currentUser`: The currently logged-in `User` object or `null`.
- `isAdmin`: Boolean indicating if the user has the `ADMIN` role.
- `canViewTeam`: Boolean (Manager/HR/Admin) for team dashboard access.
- `canManageUsers`: Boolean (HR/Admin) for user administration.

### Methods
- `handleLogin(user: User)`: Validates and persists the user session to `localStorage`.
- `handleLogout()`: Clears the session and resets the app state.
- `hasRole(role: Role)`: Returns boolean check for a specific role.

---

## 🪝 `useAppData`
**Location**: `/hooks/useAppData.ts`
**Purpose**: Orchestrates global data fetching and server health.

### State & Properties
- `users`, `timesheets`, `leaves`, `notifications`, etc.: Core entity arrays.
- `serverStatus`: `'CONNECTING' | 'ONLINE' | 'OFFLINE'`.
- `isGlobalLoading`: Boolean for blocking UI during async operations.

### Methods
- `fetchAllData()`: Triggers a parallel fetch of all database entities.
- `setUsers`, `setTimesheets`, etc.: React State dispatchers for local optimistic updates.

---

## 🪝 `useTimesheetManager`
**Location**: `/hooks/useTimesheetManager.ts`
**Purpose**: Encapsulates core business workflows and admin actions.

### Methods (Workflow)
- `handleClockIn()`: Records a new start time with GPS validation.
- `handleClockOut()`: Records end time and distance to office.
- `handleToggleBreak()`: Manages break transitions (Start/Stop).
- `handleLeaveSubmit(req)`: Submits a new leave request.

### Methods (Admin / Approval)
- `handleApproveLeave(id)`: Approves a pending leave request.
- `handleApproveCorrection(id)`: Applies a requested timesheet correction.
- `handleConfirmRejection(modal, reason)`: Generic handler for rejecting leaves, corrections, or breaks.
- `handleCreateUser(user)`, `handleUpdateUser(user)`: Direct database management of users.
- `handleTimesheetSave(data, targetUserId)`: Unified handler for direct timesheet edits or employee correction requests.
- `handleAssignSchedule(userId, date, scheduleId)`: Updates the daily shift plan for a specific user.
