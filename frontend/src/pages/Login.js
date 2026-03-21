import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PhoneCall, ArrowRight } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4"><PhoneCall size={32} /></div>
          <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
        </div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <input type="email" placeholder="Email" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
          <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
          <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
            Sign In <ArrowRight size={18} />
          </button>
        </form>
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-slate-500">No account? <Link to="/register" className="text-indigo-600 font-bold">Register</Link></p>
          <p className="text-sm"><Link to="/forgot-password">Forgot Password?</Link></p>
        </div>
        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
          Test Credentials: admin@admin.com / 111 | john@john.com / 123
        </div>
      </div>
    </div>
  );
};
export default Login;