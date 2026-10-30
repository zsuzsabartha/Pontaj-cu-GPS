import React, { useState } from 'react';
import { User, Role, Company } from '../types';
import { KeyRound, Lock, User as UserIcon, ArrowLeft, Loader2, Sparkles, MailQuestion, Shield, Users, Briefcase, Smartphone } from 'lucide-react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { SQLService } from '../services/sqlService';
import { showToast } from '../utils/toast';

// Demo shortcuts (quick role login, simulated SSO, demo PIN hints) exist only in local development builds.
const DEMO_MODE = import.meta.env.DEV;

interface LoginScreenProps {
    users: User[];
    companies?: Company[];
    onLogin: (user: User, isNewUser?: boolean) => void;
    onRequestPinReset?: (email: string) => void;
    onCreateUser?: (u: User) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, companies, onLogin, onRequestPinReset }) => {
    const { instance, accounts, inProgress } = useMsal();
    const [savedName, setSavedName] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('pontaj_saved_name') || '' : ''));
    const [email, setEmail] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('pontaj_saved_email') || '' : ''));
    const isMobileOrTunnel = typeof window !== 'undefined' && (
        window.location.hostname.endsWith('.trycloudflare.com') ||
        new URLSearchParams(window.location.search).get('mode') === 'mobile' ||
        window.innerWidth < 768
    );
    const [view, setView] = useState<'main' | 'pin' | '2fa' | 'forgot'>(() => (typeof window !== 'undefined' && (localStorage.getItem('pontaj_saved_email') || isMobileOrTunnel) ? 'pin' : 'main'));
    const [challengeToken, setChallengeToken] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaMessage, setTwoFaMessage] = useState('');
    const [pin, setPin] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [msLoginAttempted, setMsLoginAttempted] = useState(false);

    const persistDeviceIdentity = (user: User) => {
        try {
            localStorage.setItem('pontaj_saved_email', user.email);
            localStorage.setItem('pontaj_saved_name', user.name);
        } catch {
            // ignore storage errors
        }
    };

    // After the Microsoft redirect: send the ID token to the server, which validates it and opens the session.
    // Unknown accounts are rejected by the server (employees come from BioeelAuth / ERP).
    React.useEffect(() => {
        if (inProgress !== "none" || accounts.length === 0 || msLoginAttempted) return;
        setMsLoginAttempted(true);
        setIsLoading(true);
        (async () => {
            try {
                const result = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const response = await SQLService.loginMicrosoft(result.idToken);
                if (response.success && response.user) {
                    onLogin(response.user);
                } else {
                    setError(response.error || "Autentificare Microsoft eșuată.");
                    setIsLoading(false);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Autentificare Microsoft eșuată.");
                setIsLoading(false);
            }
        })();
    }, [inProgress, accounts, instance, msLoginAttempted, onLogin]);

    const handleMicrosoftLogin = async (simulateNew: boolean = false) => {
        setIsLoading(true);
        if (DEMO_MODE && (simulateNew || users.length === 0)) {
            setTimeout(() => {
                const isFirstUser = users.length === 0;
                const randomId = Math.floor(Math.random() * 1000);
                const newUser: User = {
                    id: `ms-${Date.now()}`,
                    name: isFirstUser ? 'System Admin' : `New User ${randomId}`,
                    email: isFirstUser ? 'admin@system.local' : `new.user${randomId}@example.com`,
                    roles: isFirstUser ? [Role.ADMIN, Role.MANAGER] : [Role.EMPLOYEE],
                    companyId: companies && companies.length > 0 ? companies[0].id : 'c1',
                    avatarUrl: `https://ui-avatars.com/api/?name=${isFirstUser ? 'Sys+Admin' : 'New+User'}`,
                    authType: 'MICROSOFT',
                    isValidated: isFirstUser,
                    requiresGPS: true,
                    alternativeScheduleIds: ['sch1'],
                    shareBirthday: false,
                    employmentStatus: 'ACTIVE'
                };
                onLogin(newUser, true);
            }, 1000);
        } else {
            try {
                await instance.loginRedirect(loginRequest);
            } catch (err) {
                console.error(err);
                setError("Eroare la redirecționarea către Microsoft.");
                setIsLoading(false);
            }
        }
    };

    const handlePinLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await SQLService.loginPin(email, pin);
            if (response.requires2FA && response.challengeToken) {
                setChallengeToken(response.challengeToken);
                setTwoFaMessage(response.message || 'Introduceți codul de verificare 2FA din 6 cifre pentru a înrola acest telefon.');
                setTwoFaCode('');
                setView('2fa');
                setIsLoading(false);
                return;
            }

            if (response.success && response.user) {
                persistDeviceIdentity(response.user);
                onLogin(response.user);
            } else {
                setError(response.error || "PIN incorect.");
                setPin('');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Eroare la autentificare.");
            setPin('');
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const response = await SQLService.verify2FA(challengeToken, twoFaCode);
            if (response.success && response.user) {
                persistDeviceIdentity(response.user);
                showToast('Telefonul a fost înrolat cu succes!', 'success');
                onLogin(response.user);
            } else {
                setError(response.error || 'Cod 2FA incorect.');
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Cod 2FA incorect sau expirat.');
            setIsLoading(false);
        }
    };

    const handleResetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onRequestPinReset) {
            onRequestPinReset(resetEmail);
            showToast(`Dacă adresa ${resetEmail} există în sistem, un administrator a fost notificat să vă reseteze PIN-ul.`, 'info');
            setView('main');
            setResetEmail('');
        }
    };

    const handleDemoLogin = (role: Role) => {
        if (!DEMO_MODE) return;
        setIsLoading(true);
        setTimeout(() => {
            let targetUser = users.find(u => u.roles.includes(role) && u.isValidated);
            if (role === Role.ADMIN) {
                const specific = users.find(u => u.email === 'admin@techgroup.ro');
                if (specific) targetUser = specific;
            }
            if (role === Role.HR) {
                const specific = users.find(u => u.email === 'ioana.hr@techgroup.ro');
                if (specific) targetUser = specific;
            }

            if (targetUser) {
                onLogin(targetUser);
            } else {
                setIsLoading(false);
                showToast(`Nu s-a găsit un utilizator cu rolul ${role}.`, 'warning');
            }
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 relative overflow-hidden transition-colors duration-500">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-emerald-600 dark:bg-emerald-900/50 transform -skew-y-6 origin-top-left z-0 transition-colors"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-3xl opacity-50 z-0"></div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 border border-gray-100 dark:border-gray-800 transition-all">

                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="flex items-end justify-center gap-1 mb-4">
                        <img src="https://bioeel.ro/wp-content/themes/bioeel/images/logo.png" alt="Bioeel Logo" className="h-16 object-contain" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        <span className="hidden font-black text-5xl text-emerald-600 dark:text-emerald-500">Bioeel</span>
                        <span className="font-bold text-lg tracking-tight text-emerald-600 dark:text-emerald-500">grup</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Portal Angajați & Management</p>
                </div>

                {view === 'main' && (
                    <div className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-center mb-4">
                                <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="animate-spin text-emerald-600" size={32} />
                                <p className="text-sm text-gray-500 mt-2">Autentificare în curs...</p>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleMicrosoftLogin(false)}
                                    className="w-full bg-[#2F2F2F] dark:bg-gray-800 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-black dark:hover:bg-gray-700 transition-all shadow-md group"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                                        <path fill="#f35325" d="M1 1h10v10H1z" />
                                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                                    </svg>
                                    {DEMO_MODE && users.length === 0 ? 'Initialize System (Admin SSO)' : 'Sign in with Microsoft'}
                                </button>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                                    <span className="flex-shrink mx-4 text-gray-400 dark:text-gray-600 text-xs uppercase">sau</span>
                                    <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                                </div>

                                <button
                                    onClick={() => setView('pin')}
                                    disabled={DEMO_MODE && users.length === 0}
                                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50"
                                >
                                    <KeyRound size={20} className="text-gray-400 dark:text-gray-500" />
                                    Autentificare cu PIN
                                </button>

                                {DEMO_MODE && users.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-dashed border-gray-200 dark:border-gray-800">
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase text-center mb-3">Acces Rapid (Demo)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => handleDemoLogin(Role.ADMIN)} className="flex items-center gap-2 p-2 bg-slate-800 dark:bg-gray-800 text-white rounded-lg text-xs hover:bg-slate-900 dark:hover:bg-black transition shadow-sm">
                                                <Shield size={14} className="text-yellow-400" /> Admin General
                                            </button>
                                            <button onClick={() => handleDemoLogin(Role.MANAGER)} className="flex items-center gap-2 p-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg text-xs hover:bg-emerald-700 dark:hover:bg-emerald-800 transition shadow-sm">
                                                <Briefcase size={14} /> Manager
                                            </button>
                                            <button onClick={() => handleDemoLogin(Role.HR)} className="flex items-center gap-2 p-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg text-xs hover:bg-purple-700 dark:hover:bg-purple-800 transition shadow-sm">
                                                <Users size={14} /> HR
                                            </button>
                                            <button onClick={() => handleDemoLogin(Role.EMPLOYEE)} className="flex items-center gap-2 p-2 bg-green-600 dark:bg-green-700 text-white rounded-lg text-xs hover:bg-green-700 dark:hover:bg-green-800 transition shadow-sm">
                                                <UserIcon size={14} /> Angajat
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleMicrosoftLogin(true)}
                                            className="w-full mt-3 text-purple-600 dark:text-purple-400 text-xs font-medium hover:underline flex items-center justify-center gap-1"
                                        >
                                            <Sparkles size={12} /> Simulează User Nou (SSO)
                                        </button>
                                    </div>
                                )}

                                {users.length === 0 && (
                                    <div className="mt-4 text-center">
                                        <p className="text-xs text-orange-500 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 p-2 rounded">Sistemul nu are utilizatori. Folosiți butonul "Microsoft" de mai sus pentru a crea primul cont de Administrator.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {view === 'pin' && (
                    <form onSubmit={handlePinLogin} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <button
                            type="button"
                            onClick={() => { setView('main'); setError(''); setPin(''); }}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1 text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Înapoi
                        </button>

                        {savedName && email ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold truncate">Bună, {savedName}!</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{email}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSavedName('');
                                        setEmail('');
                                        setPin('');
                                        try {
                                            localStorage.removeItem('pontaj_saved_email');
                                            localStorage.removeItem('pontaj_saved_name');
                                        } catch {
                                            // ignore
                                        }
                                    }}
                                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
                                >
                                    Alt cont
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 text-gray-400 dark:text-gray-600" size={18} />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-10 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm transition-all"
                                        placeholder="nume@companie.ro"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIN Securitate</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400 dark:text-gray-600" size={18} />
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full pl-10 p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono tracking-widest text-lg transition-all"
                                    placeholder="****"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" onClick={() => setView('forgot')} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Am uitat PIN-ul</button>
                        </div>

                        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 dark:bg-emerald-700 text-white p-3 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 mt-2 flex justify-center"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Accesează Contul'}
                        </button>

                        {DEMO_MODE && users.length > 0 && (
                            <div className="text-center mt-4">
                                <p className="text-xs text-gray-400 dark:text-gray-500">Pentru demo, PIN-urile sunt: Elena (1234), Mihai (0000)</p>
                            </div>
                        )}
                    </form>
                )}

                {view === '2fa' && (
                    <form onSubmit={handleVerify2FA} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <button
                            type="button"
                            onClick={() => { setView('pin'); setError(''); setTwoFaCode(''); }}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1 text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Înapoi la PIN
                        </button>

                        <div className="text-center mb-3">
                            <Smartphone size={44} className="mx-auto text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-full mb-2" />
                            <h3 className="font-bold text-gray-800 dark:text-white text-base">Înrolare Telefon (2FA)</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{twoFaMessage}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cod Verificare (6 cifre)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                value={twoFaCode}
                                onChange={(e) => setTwoFaCode(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono tracking-[0.5em] text-center text-xl font-bold transition-all"
                                placeholder="000000"
                            />
                        </div>

                        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading || twoFaCode.length !== 6}
                            className="w-full bg-emerald-600 dark:bg-emerald-700 text-white p-3 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 mt-2 flex justify-center disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Verifică & Asociază Telefonul'}
                        </button>
                    </form>
                )}

                {view === 'forgot' && (
                    <form onSubmit={handleResetSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <button
                            type="button"
                            onClick={() => setView('pin')}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1 text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Înapoi
                        </button>

                        <div className="text-center mb-4">
                            <MailQuestion size={48} className="mx-auto text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-full mb-2" />
                            <h3 className="font-bold text-gray-800 dark:text-white">Recuperare PIN</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Introduceți email-ul asociat contului.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-all"
                                placeholder="nume@companie.ro"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 dark:bg-emerald-700 text-white p-3 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 mt-2"
                        >
                            Solicită Resetare
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
                    &copy; 2024 Bioeel Enterprise. Secure Access.
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
