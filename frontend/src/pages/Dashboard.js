import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Send, Phone, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, token, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculate usage inside the component to avoid "undefined" errors
  const currentCalls = user?.apiCalls || 0;
  const usagePercent = (currentCalls / 20) * 100;

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!phone || !goal) return alert("Please fill in all fields.");
    
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/telephony/make-call', 
        { phoneNumber: phone, goal, email: user.email },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update the global user state with new call count
      setUser({ ...user, apiCalls: res.data.apiCalls });
      alert(res.data.script ? `AI Dispatched! Opening line: "${res.data.script}"` : "Call successfully initiated.");
    } catch (err) {
      alert("Error initiating call. Check if backend is running.");
    }
    setLoading(false);
  };

  return (
    <Layout title="AI Call Center">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* API USAGE TRACKER SECTION */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={120} className="text-indigo-500" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Free Tier Allowance</p>
                <h4 className="text-3xl font-black text-white italic">{currentCalls} <span className="text-slate-700 text-lg">/ 20</span></h4>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border ${currentCalls >= 20 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                  {currentCalls >= 20 ? 'LIMIT EXCEEDED' : 'PROVISIONED'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-800 p-1">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${currentCalls >= 20 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`} 
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              ></div>
            </div>

            {currentCalls >= 20 && (
              <div className="mt-6 flex items-center gap-3 text-amber-500 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 animate-pulse">
                <AlertTriangle size={18} />
                <p className="text-[11px] font-bold uppercase tracking-tight">Warning: API Limit Reached. Additional calls will be queued at lower priority.</p>
              </div>
            )}
          </div>
        </div>

        {/* CALL DISPATCH FORM */}
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-tighter">
            <div className="p-2 bg-indigo-600/20 rounded-xl text-indigo-500 shadow-inner"><Phone size={20} /></div>
            Initiate AI Conversation
          </h3>
          <form className="space-y-6" onSubmit={handleDispatch}>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Recipient Number</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000" 
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all text-white font-medium placeholder:text-slate-800"
                  onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">AI Objective / Instructions</label>
                <textarea 
                  rows="4" 
                  placeholder="e.g. Call this number and schedule an appointment for tomorrow at 2pm..." 
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all text-white font-medium placeholder:text-slate-800"
                  onChange={(e) => setGoal(e.target.value)}
                />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/20 flex items-center gap-3 transition-all disabled:opacity-50 active:scale-95 group"
            >
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
              {loading ? "PROCESSING..." : "DISPATCH AI AGENT"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;