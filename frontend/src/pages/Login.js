import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Save JWT and user data
      login(res.data.user, res.data.token);

      // Redirect based on role
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      alert("Login failed. Check credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>
        <div className="relative text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-500 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner"><PhoneCall size={32} /></div>
          <h1 className="text-3xl font-black tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 mt-2 text-sm italic">Sign in to your AI Command Center</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative"><Mail className="absolute left-4 top-4 text-slate-700" size={18} />
              <input type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all" onChange={(e)=>setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative"><Lock className="absolute left-4 top-4 text-slate-700" size={18} />
              <input type="password" required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all" onChange={(e)=>setPassword(e.target.value)} />
            </div>
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 group transition-all">
            Login <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs space-y-4">
           <Link to="/forgot-password" size={14} className="text-slate-500 hover:text-indigo-400 block transition-colors">Forgot password?</Link>
           <p className="text-slate-600">Admin: admin@admin.com / 111 | User: john@john.com / 123</p>
        </div>
      </div>
    </div>
  );
};
export default Login;