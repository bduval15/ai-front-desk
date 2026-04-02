import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, History, LogOut, Cpu, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 font-sans">
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl z-20">
        <div className="p-8 flex items-center gap-3 text-indigo-500 font-black text-xl italic tracking-tighter">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20"><PhoneCall size={24} /></div>
          FrontDesk AI
        </div>

        <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Main Console</p>
            <div className="space-y-1">
              <Link to="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${location.pathname === '/dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                <LayoutDashboard size={18} /> <span className="font-bold text-sm">Call Dispatch</span>
              </Link>
              <Link
                to="/call-history"
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${location.pathname === '/call-history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                <History size={18} /> <span className="font-bold text-sm">Call History</span>
              </Link>
              <Link to="/ai-demo" className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${location.pathname === '/ai-demo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                <Cpu size={18} /> <span className="font-bold text-sm">AI Agent Demo</span>
              </Link>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <p className="px-4 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">System Oversight</p>
              <Link to="/admin" className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${location.pathname === '/admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                <ShieldAlert size={20} /> <span className="font-bold">Admin Panel</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-900">
          <div className="mb-4 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Signed in as</p>
            <p className="text-sm font-bold text-indigo-400 truncate">{user?.email}</p>
            <p className="text-[10px] font-bold text-slate-600 uppercase mt-0.5 tracking-tighter italic">{user?.role} Access</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-400 transition-all font-bold group">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">{title}</h2>
          <div className="flex items-center gap-6">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl border border-white/10 shadow-lg flex items-center justify-center font-black text-white text-xs uppercase">
              {user?.email?.[0]}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-10 bg-[radial-gradient(#1e293b_0.5px,transparent_0.5px)] [background-size:24px_24px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
