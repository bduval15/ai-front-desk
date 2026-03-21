import React from 'react';
import Layout from '../components/Layout';
import { Send, Phone } from 'lucide-react';

const Dashboard = () => {
  return (
    <Layout title="AI Call Center">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800"><Phone size={20} className="text-indigo-600" /> Initiate AI Conversation</h3>
          <div className="space-y-4">
            <input type="text" placeholder="Recipient Phone Number (e.g. +1...)" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
            <textarea placeholder="Instruction: e.g. Call this person and schedule an appointment for tomorrow." rows="4" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600" />
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center gap-2 hover:scale-105 transition-transform">
              <Send size={18} /> Dispatch AI Agent
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Dashboard;