import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Terminal, Play, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AIDemo = () => {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState("Model ready for instructions...");
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    if (!prompt) return alert("Please enter a prompt first!");
    setLoading(true);
    setOutput("Mistral is thinking... (locally on your CPU)");
    
    try {
      const res = await axios.post('http://localhost:5000/api/ai/test', 
        { prompt },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setOutput(res.data.output);
    } catch (err) {
      setOutput("Error: Make sure the backend is running and model is loaded.");
    } finally { setLoading(false); }
  };

  return (
    <Layout title="HuggingFace Hosted Model">
      <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl font-mono text-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-indigo-400 mb-6 border-b border-slate-800 pb-4 uppercase tracking-widest text-xs font-bold font-sans">
          <Terminal size={16} /> Mistral-7B-Instruct Terminal
        </div>
        <textarea 
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 p-4 rounded-xl mb-4 focus:ring-1 focus:ring-indigo-500 outline-none" 
          rows="4" 
          placeholder="System: Act as a receptionist..." 
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={runModel} disabled={loading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-500 flex items-center gap-2 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={14} />}
          {loading ? "Mistral Thinking..." : "Execute Logic"}
        </button>
        <div className="mt-6 text-slate-400 bg-slate-950 p-6 rounded-xl border border-slate-800 min-h-[100px] italic leading-relaxed">
          {output}
        </div>
      </div>
    </Layout>
  );
};
export default AIDemo;