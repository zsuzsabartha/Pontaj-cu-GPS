import React, { useState } from 'react';
import { User, Role, Company } from '../types';
import { KeyRound, Lock, User as UserIcon, ArrowLeft, Loader2, Sparkles, MailQuestion, Shield, Users, Briefcase } from 'lucide-react';

interface LoginScreenProps {
  users: User[]; // Accept current users state
  companies?: Company[]; // Accept companies for display
  onLogin: (user: User, isNewUser?: boolean) => void;
  onRequestPinReset?: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, companies, onLogin, onRequestPinReset }) => {
  const [view, setView] = useState<'main' | 'pin' | 'forgot'>('main');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter users who use PIN and are validated
  const pinUsers = users.filter(u => u.authType === 'PIN' && u.isValidated);

  const handleMicrosoftLogin = (simulateNew: boolean = false) => {
    setIsLoading(true);
    // Simulate OAuth Delay
    setTimeout(() => {
        if (simulateNew) {
             // Create a random new user
             const randomId = Math.floor(Math.random() * 1000);
             const newUser: User = {
                 id: `ms-${Date.now()}`,
                 name: `New User ${randomId}`,
                 email: `new.user${randomId}@example.com`,
                 roles: [Role.EMPLOYEE],
                 companyId: 'c1', // Default
                 avatarUrl: `https://ui-avatars.com/api/?name=New+User`,
                 authType: 'MICROSOFT',
                 isValidated: false,
                 requiresGPS: true,
                 allowedScheduleIds: ['sch1'], // Default schedule
                 shareBirthday: false
             };
             onLogin(newUser, true);
        } else {
             // Find a default Manager for general login if no specific demo button used
             const msUser = users.find(u => u.authType === 'MICROSOFT' && u.isValidated);
             if (msUser) {
                 onLogin(msUser);
             } else {
                 setError("Nu s-a găsit contul Microsoft demo.");
                 setIsLoading(false);
             }
        }
    }, 1000);
  };

  const handlePinLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      
      const user = pinUsers.find(u => u.id === selectedUserId);
      if (!user) {
          setError("Selectați un utilizator.");
          return;
      }

      if (user.pin === pin) {
          setIsLoading(true);
          setTimeout(() => onLogin(user), 800);
      } else {
          setError("PIN incorect.");
          setPin('');
      }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(onRequestPinReset) {
          onRequestPinReset(resetEmail);
          alert(`Dacă adresa ${resetEmail} există în sistem, un administrator a fost notificat să vă reseteze PIN-ul.`);
          setView('main');
          setResetEmail('');
      }
  };
  
  // Specific Demo Logins
  const handleDemoLogin = (role: Role) => {
      setIsLoading(true);
      setTimeout(() => {
          // Find the best fit user for the requested role
          let targetUser = users.find(u => u.roles.includes(role) && u.isValidated);
          // Special case for specific mock users to ensure consistent demo experience
          if (role === Role.ADMIN) targetUser = users.find(u => u.email === 'admin@techgroup.ro');
          if (role === Role.HR) targetUser = users.find(u => u.email === 'ioana.hr@techgroup.ro');
          
          if (targetUser) {
              onLogin(targetUser);
          } else {
              setIsLoading(false);
              alert(`Nu s-a găsit un utilizator cu rolul ${role}`);
          }
      }, 800);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
       {/* Background Decoration */}
       <div className="absolute top-0 left-0 w-full h-1/2 bg-blue-600 transform -skew-y-6 origin-top-left z-0"></div>
       <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 z-0"></div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">P</div>
            <h1 className="text-2xl font-bold text-gray-800">PontajGroup</h1>
            <p className="text-gray-500 text-sm">Portal Angajați & Management</p>
        </div>

        {view === 'main' && (
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-sm text-gray-500 mt-2">Autentificare în curs...</p>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={() => handleMicrosoftLogin(false)}
                            className="w-full bg-[#2F2F2F] text-white p-3 rounded-lg font-medium flex items-center justify-center gap-3 hover:bg-black transition-all shadow-md group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 23 23">
                                <path fill="#f35325" d="M1 1h10v10H1z"/>
                                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                                <path fill="#ffba08" d="M12 12h10v10H12z"/>
                            </svg>
                            Sign in with Microsoft
                        </button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200"></div>
                            <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">sau</span>
                            <div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <button 
                            onClick={() => setView('pin')}
                            className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <KeyRound size={20} className="text-gray-400"/>
                            Autentificare cu PIN
                        </button>
                        
                        {/* DEMO SECTION */}
                        <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                             <p className="text-xs font-bold text-gray-400 uppercase text-center mb-3">Acces Rapid (Demo)</p>
                             <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => handleDemoLogin(Role.ADMIN)} className="flex items-center gap-2 p-2 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-900 transition">
                                     <Shield size={14} className="text-yellow-400"/> Admin General
                                 </button>
                                 <button onClick={() => handleDemoLogin(Role.MANAGER)} className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition">
                                     <Briefcase size={14}/> Manager
                                 </button>
                                 <button onClick={() => handleDemoLogin(Role.HR)} className="flex items-center gap-2 p-2 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition">
                                     <Users size={14}/> HR
                                 </button>
                                 <button onClick={() => handleDemoLogin(Role.EMPLOYEE)} className="flex items-center gap-2 p-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition">
                                     <UserIcon size={14}/> Angajat
                                 </button>
                             </div>
                             <button 
                                onClick={() => handleMicrosoftLogin(true)}
                                className="w-full mt-3 text-purple-600 text-xs font-medium hover:underline flex items-center justify-center gap-1"
                             >
                                <Sparkles size={12}/> Simulează User Nou (SSO)
                             </button>
                        </div>
                    </>
                )}
            </div>
        )}

        {view === 'pin' && (
            <form onSubmit={handlePinLogin} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                 <button 
                    type="button"
                    onClick={() => { setView('main'); setError(''); setPin(''); }}
                    className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm mb-2"
                >
                    <ArrowLeft size={16}/> Înapoi
                </button>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Angajat</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                        <select 
                            className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none text-sm"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            <option value="">Selectează contul...</option>
                            {pinUsers.map(u => {
                                const compName = companies?.find(c => c.id === u.companyId)?.name;
                                return (
                                    <option key={u.id} value={u.id}>
                                        {u.name} {compName ? `(${compName})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PIN Securitate</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest text-lg"
                            placeholder="****"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-600 hover:underline">Am uitat PIN-ul</button>
                </div>

                {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</p>}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-2 flex justify-center"
                >
                    {isLoading ? <Loader2 className="animate-spin"/> : 'Accesează Contul'}
                </button>
                
                <div className="text-center mt-4">
                     <p className="text-xs text-gray-400">Pentru demo, PIN-urile sunt: Elena (1234), Mihai (0000)</p>
                </div>
            </form>
        )}

        {view === 'forgot' && (
            <form onSubmit={handleResetSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-8">
                 <button 
                    type="button"
                    onClick={() => setView('pin')}
                    className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm mb-2"
                >
                    <ArrowLeft size={16}/> Înapoi
                </button>

                <div className="text-center mb-4">
                    <MailQuestion size={48} className="mx-auto text-blue-500 bg-blue-50 p-2 rounded-full mb-2"/>
                    <h3 className="font-bold text-gray-800">Recuperare PIN</h3>
                    <p className="text-sm text-gray-500">Introduceți email-ul asociat contului.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                        required
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="nume@companie.ro"
                    />
                </div>

                <button 
                    type="submit" 
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-2"
                >
                    Solicită Resetare
                </button>
            </form>
        )}
        
        <div className="mt-8 text-center text-xs text-gray-400">
             &copy; 2024 PontajGroup Enterprise. Secure Access.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;