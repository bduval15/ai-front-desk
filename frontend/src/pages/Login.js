import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-500 rounded-2xl mb-4 border border-indigo-500/20"><PhoneCall size={32} /></div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 mt-2">Sign in to your AI Command Center</p>
        </div>
        
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <input type="email" placeholder="admin@admin.com" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <input type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500 transition-all" />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all group">
            Login <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm">
           <Link to="/forgot-password" size={14} className="text-slate-400 hover:text-indigo-400 transition-colors block mb-2">Forgot password?</Link>
           <p className="text-slate-500 italic text-xs">Test: john@john.com / 123 | admin@admin.com / 111</p>
        </div>
      </div>
    </div>
  );
};
export default Login;