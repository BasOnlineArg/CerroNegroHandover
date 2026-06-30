import React, { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../appwrite';
import { UserProfile, UserRole, ActionLog } from '../types';

interface Props {
  isDemo?: boolean;
}

interface WhitelistEntry {
  $id: string;
  email: string;
  pass: string;
  role: string;
}

const addLog = (action: string, details: string) =>
  databases.createDocument(DATABASE_ID, COLLECTIONS.LOGS, ID.unique(), {
    timestamp: new Date().toISOString(),
    userId: 'admin',
    action,
    details,
  }).catch(() => { /* non-fatal */ });

export const AdminPanel: React.FC<Props> = ({ isDemo }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.OPERATOR);
  const [isAdding, setIsAdding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, whitelistRes, logsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(200)]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.WHITELIST, [Query.limit(200)]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.LOGS, [Query.orderDesc('$createdAt'), Query.limit(100)]),
      ]);

      setUsers(usersRes.documents.map(d => ({
        uid: d.$id,
        email: d.email,
        displayName: d.displayName,
        role: d.role as UserRole,
        createdAt: d.createdAt || d.$createdAt,
      })));

      setWhitelist(whitelistRes.documents.map(d => ({
        $id: d.$id,
        email: d.email,
        pass: d.pass,
        role: d.role,
      })));

      setLogs(logsRes.documents.map(d => ({
        id: d.$id,
        userId: d.userId,
        userEmail: d.userEmail,
        action: d.action,
        details: d.details,
        timestamp: d.timestamp || d.$createdAt,
      } as ActionLog)));
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isDemo) loadAll();
    else setLoading(false);
  }, [isDemo, loadAll]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPass) return;
    setIsAdding(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.WHITELIST, ID.unique(), {
        email: newUserEmail.toLowerCase(),
        pass: newUserPass,
        role: newUserRole,
      });
      await addLog('USER_ADD', `Agregado usuario ${newUserEmail} con rol ${newUserRole}`);
      setNewUserEmail('');
      setNewUserPass('');
      alert('Usuario agregado correctamente a la lista blanca.');
      await loadAll();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error al agregar usuario.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateWhitelistPass = async (entry: WhitelistEntry, newPass: string) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.WHITELIST, entry.$id, { pass: newPass });
      await addLog('WHITELIST_PASS_UPDATE', `Actualizada clave de ${entry.email}`);
    } catch (error) {
      console.error('Error updating password:', error);
    }
  };

  const handleUpdateWhitelistRole = async (entry: WhitelistEntry, newRole: UserRole) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.WHITELIST, entry.$id, { role: newRole });
      await addLog('WHITELIST_UPDATE', `Actualizado rol de ${entry.email} a ${newRole}`);
      await loadAll();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteWhitelist = async (entry: WhitelistEntry) => {
    if (!window.confirm(`¿Está seguro de eliminar a ${entry.email} de la lista blanca?`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.WHITELIST, entry.$id);
      await addLog('WHITELIST_DELETE', `Eliminado ${entry.email} de la lista blanca`);
      await loadAll();
    } catch (error) {
      console.error('Error deleting whitelist entry:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, { role: newRole });
      await addLog('ROLE_CHANGE', `Cambiado rol de usuario ${userId} a ${newRole}`);
      await loadAll();
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USERS, userId);
      await addLog('USER_DELETE', `Eliminado usuario ${userId}`);
      await loadAll();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando panel de administración...</div>;

  if (isDemo) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-10 rounded-3xl text-center">
        <i className="fa-solid fa-flask text-4xl text-amber-500 mb-4"></i>
        <h2 className="text-xl font-black text-amber-800 uppercase">Modo Demo Activo</h2>
        <p className="text-sm text-amber-700 mt-2 max-w-md mx-auto">
          En el modo demo, la base de datos está desactivada. Las funciones de administración real no están disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button onClick={loadAll} className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-slate-700 transition">
          <i className="fa-solid fa-arrows-rotate mr-2"></i>Actualizar
        </button>
      </div>

      {/* Add User Form */}
      <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">Agregar Nuevo Usuario</h2>
          <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest mt-1">Autorizar acceso al sistema</p>
        </div>
        <form onSubmit={handleAddUser} className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
            <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
              placeholder="usuario@empresa.com" required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clave</label>
            <input type="text" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition"
              placeholder="Contraseña" required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol</label>
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-0 transition uppercase font-bold">
              {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <button type="submit" disabled={isAdding}
            className="bg-blue-600 text-white py-4 px-6 rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 disabled:opacity-50">
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
                <tr key={entry.$id} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-4"><span className="text-xs font-bold text-slate-700">{entry.email}</span></td>
                  <td className="px-8 py-4">
                    <input type="text" defaultValue={entry.pass}
                      onBlur={(e) => { if (e.target.value !== entry.pass) handleUpdateWhitelistPass(entry, e.target.value); }}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono w-32 focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-8 py-4">
                    <select value={entry.role} onChange={(e) => handleUpdateWhitelistRole(entry, e.target.value as UserRole)}
                      className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-blue-500">
                      {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td className="px-8 py-4">
                    <button onClick={() => handleDeleteWhitelist(entry)} className="text-red-500 hover:text-red-700 transition p-2">
                      <i className="fa-solid fa-user-minus"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Users */}
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
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-4">
                    <p className="text-sm font-black text-slate-800">{u.displayName || 'Sin nombre'}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{u.email}</p>
                  </td>
                  <td className="px-8 py-4">
                    <select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className="bg-slate-100 border-none rounded-lg text-[10px] font-black uppercase px-3 py-2 focus:ring-2 focus:ring-blue-500">
                      {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <button onClick={() => handleDeleteUser(u.uid)} className="text-red-500 hover:text-red-700 transition p-2" title="Eliminar Perfil">
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Logs */}
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
                    {log.timestamp ? new Date(log.timestamp as string).toLocaleString('es-AR') : 'Reciente'}
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
