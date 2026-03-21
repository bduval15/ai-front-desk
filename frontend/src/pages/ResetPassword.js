import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { KeyRound, Lock, CheckCircle2, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return alert("Passwords do not match!");
    
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, { password });
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "This link has expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-12 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>

        {!isSuccess ? (
          <>
            <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-500 rounded-2xl mb-6 border border-indigo-500/20 shadow-inner">
              <KeyRound size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-3 italic">Set New Password</h1>
            <p className="text-slate-400 mb-10 font-medium leading-relaxed">
              Your new password must be at least 8 characters and should be unique from your previous passwords.
            </p>

            <form className="space-y-6 text-left" onSubmit={handleReset}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">New Password</label>
                <div className="relative text-slate-400 focus-within:text-indigo-500 transition-colors">
                  <Lock className="absolute left-4 top-4" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                <div className="relative text-slate-400 focus-within:text-indigo-500 transition-colors">
                  <Lock className="absolute left-4 top-4" size={18} />
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </>
        ) : (
          <div className="py-8 animate-in zoom-in fade-in duration-500">
            <div className="inline-flex p-6 bg-green-500/10 text-green-500 rounded-full mb-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle2 size={48} className="animate-bounce" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Success!</h2>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed">
              Your security is our priority. We've updated your password. You will be redirected to the login screen in a few seconds...
            </p>
            <div className="flex items-center justify-center gap-2 text-indigo-500 font-bold text-sm bg-indigo-500/10 py-3 rounded-xl border border-indigo-500/20">
               <ShieldCheck size={16} /> Secure Handshake Complete
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;