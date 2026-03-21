import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, History, Settings, LogOut, Cpu, ShieldCheck } from 'lucide-react';

const Layout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Cpu, label: 'AI Agent Demo', path: '/ai-demo' },
    { icon: History, label: 'Call Logs', path: '#', disabled: true },
    { icon: ShieldCheck, label: 'Security', path: '#', disabled: true },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-8 flex items-center gap-3 text-indigo-600 font-bold text-xl">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><PhoneCall size={20} /></div>
          FrontDesk.ai
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link key={item.label} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${location.pathname === item.path ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={20} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => navigate('/login')} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 rounded-xl transition-colors">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{title}</h2>
          <div className="w-8 h-8 bg-indigo-100 rounded-full border border-indigo-200"></div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;