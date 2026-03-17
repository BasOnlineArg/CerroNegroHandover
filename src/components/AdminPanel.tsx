import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserRole, ActionLog } from '../types';

interface Props {
  isDemo?: boolean;
}

export const AdminPanel: React.FC<Props> = ({ isDemo }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

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

    const logsUnsubscribe = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActionLog));
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
    });

    setLoading(false);
    return () => {
      usersUnsubscribe();
      logsUnsubscribe();
    };
  }, []);

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
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Gestión de Usuarios</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Alta, baja y modificación de roles</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Actual</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
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
                  <td className="px-8 py-4">
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      className="text-red-500 hover:text-red-700 transition p-2"
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
