import React from 'react';
import Layout from '../components/Layout';
import { Users, PhoneIncoming, Activity, Shield } from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { label: 'Total Users', value: '1,284', icon: Users, color: 'text-blue-500' },
    { label: 'Active Calls', value: '42', icon: PhoneIncoming, color: 'text-green-500' },
    { label: 'Model Latency', value: '1.2s', icon: Activity, color: 'text-indigo-500' },
  ];

  return (
    <Layout title="Admin Control Center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{s.label}</p>
                <h3 className="text-3xl font-black text-white mt-2">{s.value}</h3>
              </div>
              <s.icon className={s.color} size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <Shield className="text-indigo-500" size={20} />
          <h3 className="font-bold text-white">System User Logs</h3>
        </div>
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-[10px] uppercase font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            <tr>
              <td className="px-6 py-4 text-white">admin@admin.com</td>
              <td className="px-6 py-4"><span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md text-[10px]">ADMIN</span></td>
              <td className="px-6 py-4 text-green-500 font-medium font-mono text-xs">ONLINE</td>
              <td className="px-6 py-4">Just now</td>
            </tr>
            <tr>
              <td className="px-6 py-4 text-white">john@john.com</td>
              <td className="px-6 py-4"><span className="bg-slate-800 text-slate-400 px-2 py-1 rounded-md text-[10px]">USER</span></td>
              <td className="px-6 py-4 text-slate-500 font-medium font-mono text-xs">AWAY</td>
              <td className="px-6 py-4">14 mins ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default AdminDashboard;