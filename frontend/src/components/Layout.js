import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, History, Settings, LogOut, Cpu, Bell } from 'lucide-react';

const Layout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Cpu, label: 'AI Agent Demo', path: '/ai-demo' },
    { icon: History, label: 'Call History', path: '#' },
    { icon: Settings, label: 'Settings', path: '#' },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-8 flex items-center gap-3 text-indigo-500 font-black text-xl tracking-tighter">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg glow-indigo"><PhoneCall size={20} /></div>
          FrontDesk
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.label} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${location.pathname === item.path ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
              <item.icon size={18} /> {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={() => navigate('/login')} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{title}</h2>
          <div className="flex items-center gap-4">
            <Bell size={18} className="text-slate-500 hover:text-white cursor-pointer" />
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-xs text-white">JD</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;