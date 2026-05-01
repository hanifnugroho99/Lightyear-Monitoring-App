import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/errorHandlers';
import { UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Shield, Trash2, Edit2, Check, X, Search, Filter } from 'lucide-react';

export function Personnel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'employee'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: editRole });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the system? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Personnel Management</h2>
          <p className="text-slate-500 italic">Configure access levels and mission clearance for all studio agents.</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-border-main shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search agents by name or email..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            className="flex-1 md:w-40 bg-slate-50 border border-border-light rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="employee">Employees</option>
          </select>
        </div>
      </div>

      <div className="bento-card overflow-hidden !p-0 border border-border-main">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-border-light">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">Agent</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">Clearance Role</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">Recruitment Date</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            <AnimatePresence>
              {filteredUsers.map((user) => (
                <motion.tr 
                  key={user.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-border-light overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                        {user.photoURL ? <img src={user.photoURL} alt="" /> : <Users className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{user.displayName}</p>
                        <p className="text-xs text-slate-400 truncate font-mono">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === user.uid ? (
                      <div className="flex items-center gap-2">
                        <select 
                          className="bg-white border border-border-main rounded-lg px-2 py-1 text-sm focus:outline-none ring-2 ring-brand-primary/10"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                        >
                          <option value="admin">Admin</option>
                          <option value="employee">Employee</option>
                        </select>
                        <button onClick={() => handleUpdateRole(user.uid)} className="p-1 text-green-500 hover:bg-green-50 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`badge-${user.role === 'admin' ? 'info' : 'warning'} flex items-center gap-1.5`}>
                          {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                          {user.role}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingId(user.uid);
                            setEditRole(user.role as any);
                          }}
                          className="p-1.5 text-slate-300 hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-border-light px-2 py-1 rounded">
                      {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'LEGACY'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(user.uid)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">No agents matching telemetry filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
