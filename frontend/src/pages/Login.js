import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      // Save JWT and user data to context
      login(res.data.user, res.data.token);

      // Redirect based on role
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>
        
        <div className="relative text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-500 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner">
            <PhoneCall size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Welcome Back</h1>
          <p className="text-slate-500 mt-2 text-sm italic font-medium">Sign in to your AI Command Center</p>
        </div>

        <form className="space-y-6 relative z-10" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-700" size={18} />
              <input 
                type="email" 
                placeholder="admin@admin.com"
                required 
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-medium" 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-700" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                required 
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all font-medium" 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Login"} 
            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center relative z-10">
          <div className="space-y-4">
            <Link to="/forgot-password" size={14} className="text-slate-500 hover:text-indigo-400 transition-colors text-sm font-medium">
              Forgot password?
            </Link>

            <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
              <p className="text-slate-500 text-sm">
                Don't have an account? 
                <Link to="/register" className="ml-2 text-indigo-400 font-bold hover:text-indigo-300 transition-all inline-flex items-center gap-1 group uppercase tracking-tighter">
                  Create Account <UserPlus size={14} className="group-hover:scale-110 transition-transform" />
                </Link>
              </p>
            </div>

            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 border-dashed text-[9px] text-slate-600 tracking-[0.1em] font-bold">
               <p className="mb-2 uppercase text-indigo-900/40">Milestone 1 Test Access</p>
               <div className="flex justify-between mb-1"><span>Admin: admin@admin.com</span> <span>111</span></div>
               <div className="flex justify-between"><span>User: john@john.com</span> <span>123</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;