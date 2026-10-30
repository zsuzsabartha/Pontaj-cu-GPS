
import { useState, useCallback, useEffect } from 'react';
import { User, Role } from '../types';
import { SQLService, UNAUTHORIZED_EVENT } from '../services/sqlService';

// Legacy client-side session key (pre server-side auth). Removed on load; never trusted.
const LEGACY_SESSION_KEY = 'pontaj_session_user';

export const useAuth = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    // Restore the session from the httpOnly cookie: the server is the source of truth for identity and roles.
    useEffect(() => {
        localStorage.removeItem(LEGACY_SESSION_KEY);
        SQLService.me()
            .then(res => setCurrentUser(res.user))
            .catch(() => setCurrentUser(null))
            .finally(() => setAuthChecked(true));
    }, []);

    // Session expired or revoked on the server -> back to the login screen.
    useEffect(() => {
        const onUnauthorized = () => setCurrentUser(null);
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    // Called after a successful server login (the session cookie is already set).
    const handleLogin = useCallback((user: User) => {
        if (user.employmentStatus === 'SUSPENDED' || user.employmentStatus === 'TERMINATED') {
            alert("Contul dumneavoastră este suspendat sau inactiv.");
            return;
        }
        setCurrentUser(user);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await SQLService.logout();
        } catch {
            // Logging out locally is still correct if the server is unreachable.
        }
        setCurrentUser(null);
    }, []);

    const hasRole = useCallback((r: Role) => {
        return currentUser?.roles.includes(r) || false;
    }, [currentUser]);

    return {
        currentUser,
        authChecked,
        handleLogin,
        handleLogout,
        hasRole,
        isAdmin: hasRole(Role.ADMIN),
        canViewTeam: hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN) || hasRole(Role.PONTATOR),
        canManageUsers: hasRole(Role.ADMIN) || hasRole(Role.HR)
    };
};
