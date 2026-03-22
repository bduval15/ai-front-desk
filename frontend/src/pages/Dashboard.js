import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Send, Phone, AlertTriangle, Zap, MessageSquare, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, token, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  const usagePercent = ((user?.apiCalls || 0) / 20) * 100;

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/calls/my-calls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecent(res.data.slice(0, 3));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/telephony/make-call', 
        { phoneNumber: phone, goal },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setUser({ ...user, apiCalls: res.data.apiCalls });
      fetchData();
      alert(`Success! AI Script: ${res.data.script}`);
    } catch (err) { alert("Error"); }
    setLoading(false);
  };

  return (
    <Layout title="AI Command Center">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* USAGE */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
            <div className="flex justify-between items-end mb-4 text-xs font-black uppercase text-slate-500 tracking-widest">
              <span>Usage: {user?.apiCalls}/20 Calls</span>
              {user?.apiCalls >= 20 && <span className="text-red-500 animate-pulse">Limit Alert</span>}
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className={`h-full transition-all duration-1000 ${user?.apiCalls >= 20 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
            </div>
          </div>

          {/* DISPATCH */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h3 className="text-white font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><Phone size={20} className="text-indigo-500" /> Initiate New Call</h3>
            <form onSubmit={handleDispatch} className="space-y-6">
              <input type="text" placeholder="Recipient Number" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500" onChange={e => setPhone(e.target.value)} />
              <textarea rows="4" placeholder="Goal (e.g. Confirm my 2pm meeting)" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500" onChange={e => setGoal(e.target.value)} />
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 group transition-all">
                {loading ? "Processing..." : "Dispatch AI Agent"} <Send size={18} className="group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        </div>

        {/* RECENT TRANSCRIPTS */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl h-fit">
          <h3 className="text-white text-xs font-black uppercase mb-6 flex items-center gap-2 tracking-widest"><MessageSquare size={16} className="text-indigo-500" /> Recent Archive</h3>
          <div className="space-y-4">
            {recent.map(c => (
              <div key={c._id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-indigo-400 mb-1">{c.phoneNumber}</p>
                <p className="text-[11px] text-slate-500 italic line-clamp-2">{c.transcript}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Dashboard;