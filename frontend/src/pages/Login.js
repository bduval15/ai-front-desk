import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PhoneCall, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  
  // 1. State for inputs and error handling
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Handle Login Logic
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Calling your Node.js backend
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const user = response.data.user;
        
        // 3. Logic: Redirect based on role (Admin vs User)
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
        {/* Aesthetic Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>
        
        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-500 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner">
            <PhoneCall size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 mt-2 font-medium italic">Sign in to your AI Command Center</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form className="space-y-5 relative z-10" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 text-left block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-600" size={18} />
              <input 
                type="email" 
                placeholder="admin@admin.com" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium" 
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1 text-left block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-600" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium" 
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black hover:bg-slate-200 font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center relative z-10 space-y-4">
          <Link to="/forgot-password text-sm text-slate-500 hover:text-indigo-400 block transition-colors">
            Forgot Password?
          </Link>
          <p className="text-slate-500 font-medium">
            New here? <Link to="/register" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Create Account</Link>
          </p>
          
          {/* Milestone Requirements - Test Credentials Box */}
          <div className="mt-6 bg-slate-950/50 rounded-2xl p-4 border border-slate-800 border-dashed text-[10px] text-slate-500 tracking-wider">
            <p className="font-black mb-2 uppercase text-indigo-500">Milestone 1 Test Access</p>
            <div className="flex justify-between mb-1"><span>Admin: admin@admin.com</span> <span>111</span></div>
            <div className="flex justify-between"><span>User: john@john.com</span> <span>123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;