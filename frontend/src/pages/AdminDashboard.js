import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Users, PhoneIncoming, MessageSquare, Search, ShieldCheck, RefreshCw, AlertCircle, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [calls, setCalls] = useState([]); // State for Transcripts
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Unified Fetch Function
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both Users and All Calls simultaneously
      const [userRes, callRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` }}),
        axios.get('http://localhost:5000/api/admin/all-calls', { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setUsers(userRes.data);
      setCalls(callRes.data);
    } catch (err) {
      console.error("Failed to fetch oversight data", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAdminData();
  }, [token, fetchAdminData]);

  // Search logic
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalCalls = users.reduce((acc, curr) => acc + (curr.apiCalls || 0), 0);

  return (
    <Layout title="Administrator Oversight">
      {/* 1. UPDATED STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'System Users', val: users.length, icon: Users, color: 'text-purple-500' },
          { label: 'Global Call Volume', val: totalCalls, icon: PhoneIncoming, color: 'text-blue-500' },
          { label: 'Total Transcripts', val: calls.length, icon: Terminal, color: 'text-indigo-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
             <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={80} />
             </div>
             <stat.icon className={`${stat.color} mb-4`} size={28} />
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
             <h3 className="text-3xl font-black text-white mt-1 italic">{stat.val}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* 2. CONSUMER USAGE TABLE (Your original favorite) */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
             <h3 className="font-black text-white uppercase text-sm flex items-center gap-2">
                <Users size={18} className="text-indigo-500" /> Account Usage
             </h3>
             <div className="relative">
                 <Search className="absolute left-3 top-2 text-slate-700" size={14} />
                 <input 
                    type="text" placeholder="Search users..." 
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-[11px] outline-none focus:border-indigo-500 text-white w-48"
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
          </div>
          <div className="overflow-x-auto h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-950 text-slate-600 text-[9px] uppercase font-black sticky top-0">
                <tr>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4 text-center">Usage</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-400 divide-y divide-slate-800/50">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-indigo-500/[0.02] transition-colors">
                    <td className="px-6 py-4">
                        <p className="font-bold text-slate-200">{u.email}</p>
                        <p className="opacity-30 text-[9px]">{u.role}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-950 h-1 rounded-full mb-1 border border-slate-800">
                        <div className={`h-full ${u.apiCalls >= 20 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((u.apiCalls/20)*100, 100)}%` }}></div>
                      </div>
                      <p className="text-center font-mono opacity-50">{u.apiCalls}/20</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${u.apiCalls >= 20 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                        {u.apiCalls >= 20 ? 'LIMITED' : 'HEALTHY'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. NEW: GLOBAL TRANSCRIPT LOG */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[610px]">
          <div className="p-8 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
             <h3 className="font-black text-white uppercase text-sm flex items-center gap-2">
                <Terminal size={18} className="text-indigo-500" /> System Transcripts
             </h3>
             <button onClick={fetchAdminData} className="text-slate-500 hover:text-indigo-500 transition-colors">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {calls.length > 0 ? calls.map((call) => (
              <div key={call._id} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl group hover:border-indigo-500/30 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-tighter">{call.userEmail}</p>
                    <p className="text-white font-bold text-xs mt-1 italic">{call.phoneNumber}</p>
                  </div>
                  <span className="text-[9px] text-slate-700 font-mono">
                    {new Date(call.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                   <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest opacity-50 italic">Goal: {call.goal}</p>
                   <p className="text-[12px] text-slate-300 font-mono leading-relaxed">
                     <span className="text-indigo-500 mr-2 opacity-50">&gt;</span>
                     {call.transcript}
                   </p>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-bold uppercase text-[10px] tracking-[0.3em]">
                 No system calls detected
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default AdminDashboard;