import React from 'react';
import Layout from '../components/Layout';
import { Users, PhoneIncoming, MessageSquare, Activity, Search, ShieldCheck } from 'lucide-react';

const AdminDashboard = () => {
  // Mock data representing what the Admin sees from the DB
  const systemLogs = [
    { id: 1, user: "john@john.com", usage: "14/20", phone: "+1 604 555 0123", goal: "Dentist Booking", transcript: "AI: I'd like to book for 2 PM...", status: "Completed" },
    { id: 2, user: "admin@admin.com", usage: "2/20", phone: "+1 778 000 1111", goal: "System Test", transcript: "AI: Testing connection to Mistral...", status: "Active" },
    { id: 3, user: "guest@user.com", usage: "20/20", phone: "+1 236 999 8888", goal: "Pill Reminder", transcript: "AI: Remember to take your meds...", status: "Limited" },
  ];

  return (
    <Layout title="System Oversight">
      {/* Admin Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total AI Calls', val: '842', icon: PhoneIncoming, color: 'text-blue-500' },
          { label: 'System Users', val: '24', icon: Users, color: 'text-purple-500' },
          { label: 'Mistral Latency', val: '1.4s', icon: Activity, color: 'text-green-500' },
          { label: 'System Health', val: '98%', icon: ShieldCheck, color: 'text-indigo-500' },
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

      {/* GLOBAL LOGS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-500 shadow-inner"><MessageSquare size={20} /></div>
              <h3 className="font-black text-white tracking-tight uppercase text-sm">Live System Transcripts & Usage</h3>
           </div>
           <div className="relative flex items-center">
              <Search className="absolute left-3 text-slate-700" size={16} />
              <input type="text" placeholder="Search system logs..." className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all w-64 text-white" />
           </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-600 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="px-8 py-6">Consumer</th>
              <th className="px-8 py-6">Usage</th>
              <th className="px-8 py-6">Target</th>
              <th className="px-8 py-6">Goal</th>
              <th className="px-8 py-6">Transcript Preview</th>
              <th className="px-8 py-6">Status</th>
            </tr>
          </thead>
          <tbody className="text-[12px] text-slate-400 divide-y divide-slate-800/50">
            {systemLogs.map((log) => (
              <tr key={log.id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                <td className="px-8 py-6 font-bold text-slate-200">{log.user}</td>
                <td className="px-8 py-6 font-mono text-indigo-500">{log.usage}</td>
                <td className="px-8 py-6 font-mono opacity-60">{log.phone}</td>
                <td className="px-8 py-6 max-w-[150px] truncate italic text-slate-500 group-hover:text-slate-300">"{log.goal}"</td>
                <td className="px-8 py-6 max-w-[200px]">
                  <p className="truncate text-slate-600 font-mono text-[11px]">{log.transcript}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-tighter ${
                    log.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                    log.status === 'Active' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse' : 
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default AdminDashboard;