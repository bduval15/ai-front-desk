import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Send, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, token, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/telephony/make-call', 
        { phoneNumber: phone, goal, email: user.email },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update the global call count
      setUser({ ...user, apiCalls: res.data.apiCalls });
      alert(res.data.script ? `AI Opening Script: ${res.data.script}` : "Call Dispatched!");
    } catch (err) {
      alert("Error initiating call.");
    }
    setLoading(false);
  };

  return (
    <Layout title="AI Call Center">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 20-CALL LIMIT WARNING */}
        {user?.apiCalls >= 20 && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center gap-4 text-amber-500 animate-pulse">
            <AlertTriangle size={24} />
            <div>
                <p className="font-black text-sm uppercase tracking-widest">Free Limit Reached</p>
                <p className="text-xs opacity-80 mt-1">You have used {user.apiCalls}/20 free calls. Contact sales to upgrade your API tier.</p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white">
            <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-500"><Phone size={20} /></div>
            Initiate AI Conversation
          </h3>
          <form className="space-y-6" onSubmit={handleDispatch}>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Recipient Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000" 
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all text-white font-medium"
                  onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">AI Instructions</label>
                <textarea 
                  rows="4" 
                  placeholder="e.g. Schedule a pill reminder for 8pm tonight..." 
                  className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all text-white font-medium"
                  onChange={(e) => setGoal(e.target.value)}
                />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send size={18} /> {loading ? "Dispatching..." : "Dispatch AI Agent"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;