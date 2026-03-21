import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [sent, setSent] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10">
        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Reset Password</h1>
            <p className="text-slate-500 text-center mb-8">We'll send a link to your email.</p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <input type="email" placeholder="email@address.com" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
              <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all">Send Link</button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-8">Secure link sent!</h2>
            <Link to="/login" className="text-indigo-600 font-bold flex items-center justify-center gap-2"><ArrowLeft size={18} /> Back to login</Link>
          </div>
        )}
      </div>
    </div>
  );
};
export default ForgotPassword;