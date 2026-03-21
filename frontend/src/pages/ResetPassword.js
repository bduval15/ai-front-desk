import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

const ResetPassword = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    // In a real app, you'd call your API here
    setIsSuccess(true);
    setTimeout(() => navigate('/login'), 3000);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-12 text-center">
        {!isSuccess ? (
          <>
            <div className="inline-flex p-4 bg-indigo-600/10 text-indigo-500 rounded-2xl mb-6 border border-indigo-500/20">
              <KeyRound size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-3">Set New Password</h1>
            <p className="text-slate-400 mb-10 font-medium leading-relaxed">Ensure your new password is at least 8 characters long with a mix of symbols.</p>

            <form className="space-y-6 text-left" onSubmit={handleReset}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-600" size={18} />
                  <input type="password" required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-600" size={18} />
                  <input type="password" required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all font-medium" />
                </div>
              </div>

              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 group">
                Reset Password <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </>
        ) : (
          <div className="py-8">
            <div className="inline-flex p-6 bg-green-500/10 text-green-500 rounded-full mb-8 border border-green-500/20 animate-bounce">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Password Updated!</h2>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed">Your security is our priority. Redirecting you to the login screen in 3 seconds...</p>
            <Link to="/login" className="text-indigo-400 font-black hover:underline tracking-tight">Click here if you aren't redirected</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;