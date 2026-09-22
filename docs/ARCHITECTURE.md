
# Architecture Overview: Pontaj Smart

The application follows a modern React architecture centered around **Separation of Concerns**. By decoupling business logic and data fetching from the UI, the codebase remains maintainable, testable, and performant.

## Layered Architecture

### 1. 🖥️ UI Layer (`App.tsx` & `/components`)
- Responsible for layout, routing, and user interaction.
- Uses **Custom Hooks** to access state and trigger actions.
- Strives to be "dumb" (presentational) where possible.

### 2. 🪝 Logic Layer (`/hooks`)
- **`useAuth`**: Manages user identity, session lifecycle, and role-based access control (RBAC).
- **`useAppData`**: Orchestrates global data fetching, server status monitoring, and polling.
- **`useTimesheetManager`**: Encapsulates all business workflows (Clocking, Leaves, Corrections) and interaction with the SQL service.

### 3. ⚙️ Service Layer (`/services`)
- **`SQLService`**: Abstracted API client for communicating with the Node.js bridge server.
- **`geoService`**: Utility for GPS validation and office proximity detection.

### 4. 🔗 Bridge Server (`/bridge`)
- Node.js Express server providing a RESTful API.
- Interfaces directly with the **Microsoft SQL Server** database.

---

## Data Flow

1. **Initialization**: `App.tsx` calls `useAppData` which fetches the initial state from the server.
2. **User Interaction**: A user clicks "Clock In". `App.tsx` calls `handleClockIn` from `useTimesheetManager`.
3. **Action Execution**: `useTimesheetManager` performs logic (e.g., getting GPS, matching office) and calls `SQLService.upsertTimesheet`.
4. **State Sync**: Upon success, the hook updates the local React state, which triggers a re-render in the UI layer.

## Future Roadmap
- **Context API**: Transitioning global app data to a React Context to avoid prop-drilling in deep component trees.
- **AI Integration**: Moving deterministic logic in `geminiService.ts` to use actual LLM capabilities for smart reporting and alerts.
