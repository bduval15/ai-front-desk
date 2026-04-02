import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Users, PhoneIncoming, Search, RefreshCw, Terminal, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const getStatusClasses = (status = '') => {
  const normalized = status.toLowerCase();

  if (['confirmed', 'completed'].includes(normalized)) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }

  if (['busy', 'voicemail', 'no answer', 'failed', 'rejected', 'canceled'].includes(normalized)) {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  }

  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rawOpenId, setRawOpenId] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, callRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/admin/all-calls', { headers: { Authorization: `Bearer ${token}` } })
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

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalCalls = users.reduce((acc, curr) => acc + (curr.apiCalls || 0), 0);
  const processingCalls = calls.filter((call) => call.transcriptProcessingStatus === 'processing').length;

  return (
    <Layout title="Administrator Oversight">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'System Users', val: users.length, icon: Users, color: 'text-purple-500' },
          { label: 'Global Call Volume', val: totalCalls, icon: PhoneIncoming, color: 'text-blue-500' },
          { label: 'Processing Queue', val: processingCalls, icon: Terminal, color: 'text-indigo-500' },
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

        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[610px]">
          <div className="p-8 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
             <h3 className="font-black text-white uppercase text-sm flex items-center gap-2">
                <Terminal size={18} className="text-indigo-500" /> System Calls
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
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-widest ${getStatusClasses(call.callStatus)}`}>
                      {call.callStatus || 'Queued'}
                    </span>
                    <span className="text-[9px] text-slate-700 font-mono">
                      {new Date(call.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 relative overflow-hidden space-y-4">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors"></div>
                   <p className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest opacity-50 italic">Goal: {call.goal}</p>
                   <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                     <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                       <FileText size={14} className="text-indigo-500" /> Summary
                     </div>
                     <p className="text-[12px] leading-relaxed text-slate-200">
                       {call.transcriptProcessingStatus === 'processing'
                         ? 'Processing Transcript...'
                         : (call.summary || 'Summary pending.')}
                     </p>
                   </div>
                   <p className="text-[12px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                     <span className="text-indigo-500 mr-2 opacity-50">&gt;</span>
                     {call.transcriptProcessingStatus === 'processing'
                       ? 'Processing Transcript...'
                       : (call.formattedTranscript || call.rawTranscript || call.transcript || 'Transcript unavailable.')}
                   </p>
                   <button
                     type="button"
                     onClick={() => setRawOpenId(rawOpenId === call._id ? null : call._id)}
                     className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300"
                   >
                     {rawOpenId === call._id ? 'Hide Raw Telephony Data' : 'Show Raw Telephony Data'}
                   </button>
                   {rawOpenId === call._id && (
                     <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-black/30 p-4 text-[11px] leading-relaxed text-slate-400">
                       {JSON.stringify({
                         rawTranscript: call.rawTranscript,
                         transcriptProcessingStatus: call.transcriptProcessingStatus,
                         processingError: call.processingError,
                         answeredBy: call.answeredBy,
                         durationSeconds: call.durationSeconds,
                         providerCallSid: call.providerCallSid,
                         rawTelephonyData: call.rawTelephonyData
                       }, null, 2)}
                     </pre>
                   )}
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
