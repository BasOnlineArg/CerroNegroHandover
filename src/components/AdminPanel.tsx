import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole, ActionLog } from '../types';

interface Props {
  isDemo?: boolean;
}

export const AdminPanel: React.FC<Props> = ({ isDemo }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ESTRUCTURAL);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const whitelistUnsubscribe = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      const whitelistData = snapshot.docs.map(doc => ({ ...doc.data() }));
      setWhitelist(whitelistData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'whitelist');
    });

    const logsUnsubscribe = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionLog));
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
    });

    setLoading(false);
    return () => {
      usersUnsubscribe();
      whitelistUnsubscribe();
      logsUnsubscribe();
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPass) return;
    
    setIsAdding(true);
    try {
      await setDoc(doc(db, 'whitelist', newUserEmail.toLowerCase()), {
        email: newUserEmail.toLowerCase(),
        pass: newUserPass,
        role: newUserRole
      });
      
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin',
        action: 'USER_ADD',
        details: `Agregado usuario ${newUserEmail} con rol ${newUserRole}`
      });
      
      setNewUserEmail('');
      setNewUserPass('');
      alert('Usuario agregado correctamente a la lista blanca.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `whitelist/${newUserEmail}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateWhitelistPass = async (email: string, newPass: string) => {
    try {
      await updateDoc(doc(db, 'whitelist', email), { pass: newPass });
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin',
        action: 'WHITELIST_PASS_UPDATE',
        details: `Actualizada clave de ${email}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `whitelist/${email}`);
    }
  };

  const handleUpdateWhitelistRole = async (email: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'whitelist', email), { role: newRole });
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin',
        action: 'WHITELIST_UPDATE',
        details: `Actualizado rol de ${email} a ${newRole}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `whitelist/${email}`);
    }
  };

  const handleDeleteWhitelist = async (email: string) => {
    if (!window.confirm(`¿Está seguro de eliminar a ${email} de la lista blanca?`)) return;
    try {
      await deleteDoc(doc(db, 'whitelist', email));
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin',
        action: 'WHITELIST_DELETE',
        details: `Eliminado ${email} de la lista blanca`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `whitelist/${email}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin', // Should be current user id
        userEmail: 'admin', // Should be current user email
        action: 'ROLE_CHANGE',
        details: `Cambiado rol de usuario ${userId} a ${newRole}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        userId: 'admin',
        action: 'USER_DELETE',
        details: `Eliminado usuario ${userId}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando panel de administración...</div>;

  if (isDemo) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-10 rounded-3xl text-center">
        <i className="fa-solid fa-flask text-4xl text-amber-500 mb-4"></i>
        <h2 className="text-xl font-black text-amber-800 uppercase">Modo Demo Activo</h2>
        <p className="text-sm text-amber-700 mt-2 max-w-md mx-auto">
          En el modo demo, la base de datos de Firebase está desactivada para evitar errores de permisos. 
          Las funciones de administración real no están disponibles en este modo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Add User Form */}
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Agregar Nuevo Usuario</h2>
          <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest mt-1">Autorizar acceso al sistema</p>
        </div>
        <form onSubmit={handleAddUser} className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
            <input 
              type="email" 
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
              placeholder="usuario@newmont.com"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clave</label>
            <input 
              type="text" 
              value={newUserPass}
              onChange={(e) => setNewUserPass(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
              placeholder="Contraseña"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol</label>
            <select 
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition uppercase font-bold"
            >
              {Object.values(UserRole).map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit"
            disabled={isAdding}
            className="bg-blue-600 text-white py-4 px-6 rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {isAdding ? 'Agregando...' : 'Autorizar Usuario'}
          </button>
        </form>
      </section>

      {/* Whitelist Table */}
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Lista Blanca de Acceso</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Usuarios autorizados para ingresar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clave</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {whitelist.map(entry => (
                <tr key={entry.email} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-4">
                    <span className="text-xs font-bold text-slate-700">{entry.email}</span>
                  </td>
                  <td className="px-8 py-4">
                    <input 
                      type="text"
                      defaultValue={entry.pass}
                      onBlur={(e) => {
                        if (e.target.value !== entry.pass) {
                          handleUpdateWhitelistPass(entry.email, e.target.value);
                        }
                      }}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono w-32 focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-8 py-4">
                    <select 
                      value={entry.role}
                      onChange={(e) => handleUpdateWhitelistRole(entry.email, e.target.value as UserRole)}
                      className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-4">
                    <button 
                      onClick={() => handleDeleteWhitelist(entry.email)}
                      className="text-red-500 hover:text-red-700 transition p-2"
                    >
                      <i className="fa-solid fa-user-minus"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Perfiles de Usuario Activos</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Usuarios que ya han iniciado sesión</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Actual</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-4">
                    <p className="text-sm font-black text-slate-800">{user.displayName || 'Sin nombre'}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{user.email}</p>
                  </td>
                  <td className="px-8 py-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                      className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      className="text-red-500 hover:text-red-700 transition p-2"
                      title="Eliminar Perfil"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Log de Acciones</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Historial de auditoría del sistema</p>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-6 space-y-3 bg-slate-50/50">
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{log.action}</span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Reciente'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">{log.details}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Por: {log.userEmail || 'Sistema'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
