
import React, { useState, useEffect } from 'react';
import { FleetType, HandoverEntry, UserRole, UserProfile } from './types';
import { HandoverForm } from './components/HandoverForm';
import { KPISection } from './components/KPISection';
import { HistoryDetails } from './components/HistoryDetails';
import { AdminPanel } from './components/AdminPanel';
import { auth, db, signInWithEmail, registerWithEmail, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, setDoc, doc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { INITIAL_WHITELIST } from './constants/whitelist';

const App: React.FC = () => {
  const [activeFleet, setActiveFleet] = useState<FleetType | 'ADMIN'>(FleetType.STRUCTURAL);
  const [history, setHistory] = useState<HandoverEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<HandoverEntry | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Skip Firestore if we are in a demo state or if user is mock
        if (currentUser.uid === 'demo-user-id' || isDemo) {
          setLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            setUserProfile(profile);
            // Set initial fleet based on role if current is not allowed
            if (!canSeeFleet(profile.role, activeFleet)) {
              const firstAllowed = Object.values(FleetType).find(f => canSeeFleet(profile.role, f));
              if (firstAllowed) setActiveFleet(firstAllowed);
            }
          } else {
            // This case should be handled by the login logic for whitelisted users
            // But if they somehow get here (e.g. Google login), we might need a default
            // For this app, we strictly follow the whitelist.
            if (currentUser.email === 'spalmatw@gmail.com') {
               const adminProfile: UserProfile = {
                 uid: currentUser.uid,
                 email: currentUser.email!,
                 displayName: currentUser.displayName || 'Admin',
                 role: UserRole.ADMIN,
                 createdAt: serverTimestamp()
               };
               await setDoc(userDocRef, adminProfile);
               setUserProfile(adminProfile);
            } else {
               // Not in whitelist and no profile? Logout.
               await logout();
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isDemo || !user || !userProfile) {
      setHistory([]);
      return;
    }

    // Double check that we have a real UID and provider info if not demo
    if (!isDemo && (!user.uid || user.uid === 'demo-user-id')) {
      return;
    }

    const q = query(collection(db, 'handovers'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as HandoverEntry[];
      
      // Filter history based on what the user can see
      const visibleEntries = entries.filter(e => canSeeFleet(userProfile.role, e.fleet));
      setHistory(visibleEntries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'handovers');
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const canSeeFleet = (role: UserRole, fleet: FleetType | 'ADMIN'): boolean => {
    if (role === UserRole.ADMIN) return true;
    if (fleet === 'ADMIN') return false;
    if (role === UserRole.SUPERVISOR) return true;
    if (fleet === FleetType.RELIABILITY_KPIS) return true;

    switch (role) {
      case UserRole.ESTRUCTURAL:
      case UserRole.INSPECTOR_ESTRUCTURAL:
        return fleet === FleetType.STRUCTURAL;
      case UserRole.ELECTRICO:
        return fleet === FleetType.ELECTRICAL;
      case UserRole.PERFO:
        return fleet === FleetType.DRILLS;
      case UserRole.PYC:
        return fleet === FleetType.SHOVELS_TRUCKS;
      case UserRole.MULTIFLOTA:
        return fleet === FleetType.AUXILIARY;
      case UserRole.GOMERIA:
        return fleet === FleetType.GOMERIA;
      default:
        return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const whitelistEntry = INITIAL_WHITELIST.find(w => w.email.toLowerCase() === loginEmail.toLowerCase());
    
    if (!whitelistEntry) {
      setLoginError("Usuario no autorizado en la lista blanca.");
      setIsLoggingIn(false);
      return;
    }

    if (whitelistEntry.pass !== loginPass) {
      setLoginError("Contraseña incorrecta.");
      setIsLoggingIn(false);
      return;
    }

    try {
      // Try to sign in
      let userCredential;
      try {
        userCredential = await signInWithEmail(loginEmail, loginPass);
      } catch (err: any) {
        // If user doesn't exist in Firebase Auth, create them
        if (err.code === 'auth/user-not-found') {
          userCredential = await registerWithEmail(loginEmail, loginPass);
        } else {
          throw err;
        }
      }

      const loggedUser = userCredential.user;
      
      // Ensure profile exists with the correct role from whitelist
      const userDocRef = doc(db, 'users', loggedUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: loggedUser.uid,
          email: loggedUser.email,
          displayName: loggedUser.email?.split('@')[0],
          role: whitelistEntry.role,
          createdAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: loggedUser.uid,
        userEmail: loggedUser.email,
        action: 'LOGIN',
        details: `Usuario ${loggedUser.email} inició sesión.`
      });

    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError("ERROR: El método 'Correo/Contraseña' no está habilitado en Firebase. Por favor, actívalo en la consola de Firebase (Authentication > Sign-in method).");
      } else {
        setLoginError("Error al iniciar sesión: " + error.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleHandoverSubmit = async (entry: any) => {
    if (!user) return;

    const id = crypto.randomUUID();
    const newEntry: HandoverEntry = {
      ...entry,
      id,
      uid: user.uid,
      timestamp: new Date().toISOString()
    };

    if (isDemo) {
      setHistory(prev => [newEntry, ...prev]);
      return;
    }

    try {
      await setDoc(doc(db, 'handovers', id), newEntry);
      
      // Log the action
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email,
        action: 'CREATE_HANDOVER',
        details: `Nuevo pase de turno creado para la flota ${entry.fleet}. ID: ${id}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `handovers/${id}`);
    }
  };

  const handleFleetChange = (fleet: FleetType | 'ADMIN') => {
    setActiveFleet(fleet);
    setSelectedEntry(null); 
  };

  const filteredHistory = history.filter(item => item.fleet === activeFleet);
  const isKPIView = activeFleet === FleetType.RELIABILITY_KPIS;
  const isAdminView = activeFleet === 'ADMIN';

  const getFleetIcon = (fleet: FleetType) => {
    switch (fleet) {
      case FleetType.STRUCTURAL: return 'fa-gears';
      case FleetType.ELECTRICAL: return 'fa-bolt';
      case FleetType.DRILLS: return 'fa-bore-hole';
      case FleetType.AUXILIARY: return 'fa-truck-pickup';
      case FleetType.SHOVELS_TRUCKS: return 'fa-truck-monster';
      case FleetType.GOMERIA: return 'fa-circle-dot';
      case FleetType.RELIABILITY_KPIS: return 'fa-chart-line';
      default: return 'fa-folder';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0F172A] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-500">
          <div className="p-10 text-center bg-slate-50 border-b">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20 mx-auto mb-6">
              <i className="fa-solid fa-mountain-sun text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cerro Negro</h1>
            <p className="text-[10px] mt-1 text-blue-600 font-bold uppercase tracking-[0.2em]">Gestión de Pases de Turno</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <p className="text-slate-500 text-sm mb-4 text-center leading-relaxed">
              Ingrese sus credenciales autorizadas para acceder al sistema.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuario (Email)</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
                  placeholder="ejemplo@newmont.com"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña</label>
                <input 
                  type="password" 
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 animate-shake">
                <i className="fa-solid fa-circle-exclamation mr-2"></i>
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <><i className="fa-solid fa-spinner fa-spin"></i> Verificando...</>
              ) : (
                <>Ingresar con Credenciales</>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-white px-4 text-slate-400">O probar el sistema</span></div>
            </div>

            <button 
              type="button"
              onClick={() => {
                // Mock a user for demo purposes
                const demoUser = {
                  uid: 'demo-user-id',
                  email: 'demo@newmont.com',
                  displayName: 'Usuario Demo'
                };
                setIsDemo(true);
                setUser(demoUser as any);
                setUserProfile({
                  uid: demoUser.uid,
                  email: demoUser.email,
                  displayName: demoUser.displayName,
                  role: UserRole.ADMIN,
                  createdAt: new Date()
                });
              }}
              className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
            >
              <i className="fa-solid fa-flask mr-2"></i> Modo Demo (Sin Base de Datos)
            </button>
          </form>
          <div className="p-6 bg-slate-50 text-center border-t">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estándares ISO 10816 / 18436-7</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900">
      {/* Sidebar Navigation - Diseño Industrial Premium */}
      <aside className="w-72 bg-[#0F172A] text-white flex flex-col shrink-0 border-r border-slate-800 shadow-2xl">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
              <i className="fa-solid fa-mountain-sun text-white"></i>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none">Cerro Negro</h1>
              <p className="text-[9px] mt-1 text-blue-400 font-bold uppercase tracking-[0.2em]">Pase de Novedades</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 mt-6 overflow-y-auto px-4 space-y-2">
          <div className="px-4 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Sectores Operativos</div>
          {Object.values(FleetType).filter(f => f !== FleetType.RELIABILITY_KPIS && canSeeFleet(userProfile.role, f)).map((fleet) => (
            <button
              key={fleet}
              onClick={() => handleFleetChange(fleet)}
              className={`w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-3 group ${
                activeFleet === fleet && !isKPIView && !isAdminView
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <i className={`fa-solid ${getFleetIcon(fleet)} w-5 text-center`}></i>
              <span className="text-xs font-bold">{fleet}</span>
            </button>
          ))}
          
          <div className="pt-6 px-4 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-widest border-t border-slate-800 mt-4">Analítica</div>
          <button
            onClick={() => handleFleetChange(FleetType.RELIABILITY_KPIS)}
            className={`w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-3 group ${
              isKPIView 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <i className="fa-solid fa-chart-pie w-5 text-center"></i>
            <span className="text-xs font-bold uppercase tracking-tight">Métricas Globales</span>
          </button>

          {userProfile.role === UserRole.ADMIN && (
            <>
              <div className="pt-6 px-4 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-widest border-t border-slate-800 mt-4">Sistema</div>
              <button
                onClick={() => handleFleetChange('ADMIN')}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-3 group ${
                  isAdminView 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <i className="fa-solid fa-user-shield w-5 text-center"></i>
                <span className="text-xs font-bold uppercase tracking-tight">Administración</span>
              </button>
            </>
          )}
        </nav>
        
        <div className="p-6 border-t border-slate-800 bg-[#0c1222]">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 opacity-60">
                <i className="fa-solid fa-location-dot text-blue-500"></i>
                <span className="text-[10px] font-bold uppercase tracking-widest">Santa Cruz, ARG</span>
              </div>
              <button 
                onClick={logout}
                className="text-slate-500 hover:text-red-400 transition"
                title="Cerrar Sesión"
              >
                <i className="fa-solid fa-right-from-bracket text-xs"></i>
              </button>
           </div>
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                    {user.displayName?.charAt(0) || user.email?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-200 truncate">{user.displayName}</p>
                <p className="text-[8px] font-bold text-slate-500 truncate uppercase">{user.email}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b px-10 py-5 flex justify-between items-center z-10 shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestión Técnica</h2>
            </div>
            <p className="text-2xl font-black text-slate-800">{activeFleet}</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right border-r pr-4 border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Estado General</p>
              <p className="text-xs font-black text-emerald-600 uppercase">Activo</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Ubicación</p>
              <p className="text-xs font-black text-slate-800 uppercase">Yacimiento Principal</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#F1F5F9]">
          <div className="max-w-5xl mx-auto">
            {isAdminView ? (
              <AdminPanel isDemo={isDemo} />
            ) : isKPIView ? (
              <KPISection entries={history} title="Tablero de Confiabilidad" isGlobal={true} />
            ) : selectedEntry ? (
              <HistoryDetails entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
            ) : (
              <div className="animate-in fade-in duration-500">
                <HandoverForm fleet={activeFleet as FleetType} onSubmit={handleHandoverSubmit} history={history} currentUser={user} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      {!isKPIView && !isAdminView && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-sm">
          <div className="p-6 border-b bg-white flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Historial Técnico</h3>
            <button 
              onClick={() => setSelectedEntry(null)}
              className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition"
              title="Nuevo Pase"
            >
              <i className="fa-solid fa-plus text-[10px]"></i>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {filteredHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedEntry(item)}
                className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer group ${
                  selectedEntry?.id === item.id ? 'ring-2 ring-blue-500 border-transparent shadow-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{formatTimestamp(item.timestamp)}</span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-500 transition"></i>
                </div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{item.author}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <i className="fa-solid fa-wrench text-[9px] text-blue-500"></i>
                    <span className="text-[9px] font-bold text-slate-500">{item.ots.length} OTs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <i className="fa-solid fa-bell text-[9px] text-amber-500"></i>
                    <span className="text-[9px] font-bold text-slate-500">{item.notifications.length} Avisos</span>
                  </div>
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <div className="text-center py-20">
                <i className="fa-solid fa-folder-open text-slate-200 text-3xl mb-4"></i>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sin registros previos</p>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default App;
