import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Phone, MessageSquare, Terminal, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const CallHistory = () => {
  const [calls, setCalls] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/calls/my-calls', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCalls(res.data);
      } catch (err) { console.error("Archive fetch error"); }
    };
    if (token) fetchHistory();
  }, [token]);

  return (
    <Layout title="Call Archive">
      <div className="max-w-5xl mx-auto space-y-6">
        {calls.map(c => (
          <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl hover:border-indigo-500/30 transition-all group">
            <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center text-xs font-black uppercase text-slate-500">
              <div className="flex items-center gap-3"><Phone size={16} className="text-indigo-500" /> {c.phoneNumber}</div>
              <div className="flex items-center gap-2 font-mono italic opacity-50"><Calendar size={14} /> {new Date(c.createdAt).toLocaleString()}</div>
            </div>
            <div className="p-8">
              <p className="text-indigo-400 text-[10px] font-black mb-4 uppercase tracking-widest italic opacity-60">Goal: {c.goal}</p>
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-[13px] leading-relaxed relative overflow-hidden">
                <Terminal size={120} className="absolute -right-10 -bottom-10 text-white/[0.02]" />
                <span className="text-indigo-500 mr-2">&gt;</span>
                <span className="text-slate-300 italic">"{c.transcript}"</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};
export default CallHistory;