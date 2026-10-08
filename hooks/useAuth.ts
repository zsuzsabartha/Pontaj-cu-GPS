
import { useState, useCallback } from 'react';
import { User, Role } from '../types';

const getStoredUser = (): User | null => {
    try {
        const item = localStorage.getItem('pontaj_session_user');
        return item ? JSON.parse(item) : null;
    } catch { return null; }
};

export const useAuth = (users: User[]) => {
    const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());

    const handleLogin = useCallback((user: User) => {
        // Validate that user still exists in the fetched list
        const freshUser = users.find(u => u.id === user.id);
        if (!freshUser) {
            alert("Eroare: Utilizatorul nu a fost găsit pe server.");
            return;
        }
        if (freshUser.employmentStatus === 'SUSPENDED' || freshUser.employmentStatus === 'TERMINATED') {
            alert("Contul dumneavoastră este suspendat sau inactiv.");
            return;
        }
        
        localStorage.setItem('pontaj_session_user', JSON.stringify(freshUser));
        setCurrentUser(freshUser);
    }, [users]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('pontaj_session_user');
        setCurrentUser(null);
    }, []);

    const hasRole = useCallback((r: Role) => {
        return currentUser?.roles.includes(r) || false;
    }, [currentUser]);

    return {
        currentUser,
        handleLogin,
        handleLogout,
        hasRole,
        isAdmin: hasRole(Role.ADMIN),
        canViewTeam: hasRole(Role.MANAGER) || hasRole(Role.HR) || hasRole(Role.ADMIN) || hasRole(Role.PONTATOR),
        canManageUsers: hasRole(Role.ADMIN) || hasRole(Role.HR)
    };
};
