import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Rocket, Clock, CheckSquare, Users, LayoutDashboard, Calendar, ShieldCheck, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Leave', path: '/leave-requests', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: FileText },
    ...(profile?.role === 'admin' ? [
      { name: 'Personnel', path: '/admin/personnel', icon: ShieldCheck }
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-main bg-white flex flex-col">
        <div className="p-6 flex items-center gap-2.5 border-b border-border-light bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#7c3aed]"
            >
              <path 
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 leading-none">
              LIGHTYEAR
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] px-3 mb-4">Operations Interface</p>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden ${
                location.pathname === item.path
                  ? 'bg-brand-primary text-white shadow-lg shadow-blue-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-border-light'
              }`}
            >
              <item.icon className={`w-5 h-5 relative z-10 ${location.pathname === item.path ? 'text-white' : 'text-slate-400 group-hover:text-brand-primary'}`} />
              <span className="text-sm font-bold relative z-10">{item.name}</span>
              {location.pathname === item.path && (
                 <motion.div 
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-blue-600 -z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                 />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border-light bg-slate-50/50">
          <div className="mb-4">
             <div className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-border-light shadow-sm">
                <div className="w-9 h-9 rounded-xl border border-border-light bg-slate-100 flex items-center justify-center overflow-hidden">
                  {profile?.photoURL ? <img src={profile.photoURL} alt="" /> : <Users className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-slate-900">{profile?.displayName || 'Unknown Agent'}</p>
                  <p className="text-[10px] text-slate-400 truncate font-mono uppercase font-bold">{profile?.role || 'Guest'}</p>
                </div>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-border-main bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-primary rounded-full" />
            {menuItems.find(i => i.path === location.pathname)?.name || 'Overview'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-border-light rounded-lg text-[10px] font-mono text-slate-500 font-bold">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                COMMS_READY
             </div>
             <div className="h-4 w-px bg-border-light" />
             <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} // L-Y-01
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-0 custom-scrollbar bg-slate-50/30">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
