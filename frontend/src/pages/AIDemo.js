import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Terminal, Play } from 'lucide-react';

const AIDemo = () => {
  const [output, setOutput] = useState("Model ready for instructions...");
  return (
    <Layout title="HuggingFace Hosted Model">
      <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl font-mono text-sm">
        <div className="flex items-center gap-2 text-indigo-400 mb-6 border-b border-slate-800 pb-4 uppercase tracking-widest text-xs font-bold">
          <Terminal size={16} /> Mistral-7B-Instruct Logic Terminal
        </div>
        <textarea className="w-full bg-slate-800 border border-slate-700 text-slate-100 p-4 rounded-xl mb-4 focus:ring-1 focus:ring-indigo-500 outline-none" rows="3" placeholder="Enter scenario prompt..." />
        <button onClick={() => setOutput("AI Response: Scheduling successful. Confirmation sent to recipient.")} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-500 flex items-center gap-2 mb-6 transition-colors">
          <Play size={14} /> Run Hosted Model
        </button>
        <div className="text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800">{output}</div>
      </div>
    </Layout>
  );
};
export default AIDemo;