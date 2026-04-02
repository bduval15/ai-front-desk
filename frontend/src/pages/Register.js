import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../lib/api';

const Register = () => {
  const navigate = useNavigate();
  
  // 1. Add State to track inputs
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  // 2. Handle the Registration Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/register', {
        email: formData.email,
        password: formData.password,
        role: 'user' 
      });

      if (response.data.success || response.status === 201) {
        alert("Account created! Please sign in with your new credentials.");
        navigate('/login');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>
        
        <div className="relative z-10 text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-500 rounded-2xl mb-4 border border-indigo-500/20 shadow-inner">
            <UserPlus size={32} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 mt-2 font-medium">Join 500+ businesses using FrontDesk AI</p>
        </div>

        {/* 3. Connect the onSubmit handler */}
        <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-4 text-slate-600" size={18} />
              <input 
                type="text" 
                placeholder="John Doe" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-600" size={18} />
              <input 
                type="email" 
                placeholder="john@company.com" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-600" size={18} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-white text-black hover:bg-slate-200 font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group mt-4">
            Create Free Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-800 text-center relative z-10">
          <p className="text-slate-500 font-medium">Already have an account? <Link to="/login" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Sign In</Link></p>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-600">
            <ShieldCheck size={14} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Bank-level Security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
