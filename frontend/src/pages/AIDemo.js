import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Terminal, Play, Loader2 } from 'lucide-react';
import axios from 'axios';

const AIDemo = () => {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState("Model ready for instructions...");
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    if (!prompt) return alert("Please enter a prompt first!");
    
    setLoading(true);
    setOutput("Mistral is thinking...");
    
    try {
      const res = await axios.post('http://localhost:5000/api/ai/test', { prompt });

      setOutput(res.data.output);
    } catch (err) {
      console.error(err);
      setOutput("Error: Make sure your backend (node server.js) is running and the model is loaded.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="HuggingFace Hosted Model">
      <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl font-mono text-sm">
        <div className="flex items-center gap-2 text-indigo-400 mb-6 border-b border-slate-800 pb-4 uppercase tracking-widest text-xs font-bold">
          <Terminal size={16} /> Mistral-7B-Instruct Logic Terminal
        </div>
        
        <textarea 
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 p-4 rounded-xl mb-4 focus:ring-1 focus:ring-indigo-500 outline-none" 
          rows="4" 
          placeholder="e.g. Write a script to remind a patient to take their medicine..." 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        <button 
          onClick={runModel} 
          disabled={loading}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-500 flex items-center gap-2 mb-6 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={14} />}
          {loading ? "Mistral is Thinking..." : "Run Hosted Model"}
        </button>

        <div className="text-slate-400 bg-slate-950 p-6 rounded-xl border border-slate-800 min-h-[100px] whitespace-pre-wrap">
          {output}
        </div>
      </div>
    </Layout>
  );
};

export default AIDemo;