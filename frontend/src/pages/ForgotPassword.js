import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      alert(err.response?.data?.message || "Error sending reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-[100px]"></div>
        
        {!sent ? (
          <>
            <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-500 rounded-2xl mb-6 border border-indigo-500/20 shadow-inner">
              <KeyRound size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-3">Reset Password</h1>
            <p className="text-slate-400 mb-10 font-medium leading-relaxed">
              Enter your email address and we'll send you a secure link to reset your credentials.
            </p>

            <form className="space-y-6 text-left" onSubmit={handleForgot}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-slate-700" size={18} />
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="py-8 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-white mb-4 tracking-tight">Secure link sent!</h2>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed">
              We've sent a password reset link to <span className="text-indigo-400">{email}</span>. Please check your inbox and spam folder.
            </p>
            <button onClick={() => setSent(false)} className="text-slate-500 hover:text-white text-sm font-bold transition-colors">
                Didn't receive it? Try again
            </button>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-slate-800">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 font-bold transition-all text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;