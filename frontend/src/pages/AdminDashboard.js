import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users, PhoneIncoming, MessageSquare, Activity, Search, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch real data from Backend
  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  // 2. Filter logic for the search bar
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Aggregate stats
  const totalCalls = users.reduce((acc, curr) => acc + (curr.apiCalls || 0), 0);
  const limitBreakers = users.filter(u => u.apiCalls >= 20).length;

  return (
    <Layout title="Administrator Oversight">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'System Users', val: users.length, icon: Users, color: 'text-purple-500' },
          { label: 'Global Call Volume', val: totalCalls, icon: PhoneIncoming, color: 'text-blue-500' },
          { label: 'Limit Alerts', val: limitBreakers, icon: AlertCircle, color: 'text-red-500' },
          { label: 'System Health', val: '100%', icon: ShieldCheck, color: 'text-green-500' },
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

      {/* Main Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-950/30 gap-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-500 shadow-inner"><MessageSquare size={20} /></div>
              <div>
                <h3 className="font-black text-white tracking-tight uppercase text-sm">Consumer Usage Logs</h3>
              </div>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 text-slate-700" size={16} />
                 <input 
                    type="text" 
                    placeholder="Search by email..." 
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-500 transition-all w-full md:w-64 text-white"
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <button 
                onClick={fetchSystemData}
                className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-400 transition-colors border border-slate-700"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-600 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-6 text-indigo-500/50">Consumer ID</th>
                <th className="px-8 py-6">Account Email</th>
                <th className="px-8 py-6">Role</th>
                <th className="px-8 py-6">API Consumption (20 Limit)</th>
                <th className="px-8 py-6">Status</th>
              </tr>
            </thead>
            <tbody className="text-[12px] text-slate-400 divide-y divide-slate-800/50">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                  <td className="px-8 py-6 font-mono text-[10px] opacity-30 group-hover:opacity-100 transition-opacity">
                    {u._id.substring(0, 8)}...
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-200">{u.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded text-[9px] font-black tracking-tighter ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="flex-1 min-w-[100px] bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full transition-all duration-700 ${u.apiCalls >= 20 ? 'bg-red-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${Math.min((u.apiCalls / 20) * 100, 100)}%` }}
                          ></div>
                       </div>
                       <span className={`font-mono font-bold ${u.apiCalls >= 20 ? 'text-red-500' : 'text-slate-300'}`}>
                        {u.apiCalls || 0}/20
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-tighter ${
                      u.apiCalls >= 20 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                      {u.apiCalls >= 20 ? 'OVER_LIMIT' : 'HEALTHY'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest">
                    No API consumers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;