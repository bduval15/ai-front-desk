import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Terminal, Play, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const AIDemo = () => {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const runModel = async () => {
    if (!prompt) return alert("Please enter a prompt first!");
    setLoading(true);
    setOutput(""); 
    
    try {
      const res = await api.post('/api/ai/test', 
        { prompt },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setOutput(res.data.output);
    } catch (err) {
      setOutput("Error: Check backend console.");
    } finally { setLoading(false); }
  };

  return (
    <Layout title="AI Playground">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Input Section */}
        <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-2 text-indigo-400 mb-6 uppercase tracking-widest text-xs font-black">
            <Terminal size={16} /> Mistral-7B
          </div>
          <textarea 
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-6 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" 
            rows="5" 
            placeholder="Ask anything (e.g. 'Give me a recipe for chocolate chip cookies' or 'Write a script for a dental reminder')" 
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button 
            onClick={runModel} 
            disabled={loading} 
            className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={18} />}
            {loading ? "In progress..." : "Run Local Model"}
          </button>
        </div>

        {/* Dynamic Output Section */}
        { (output || loading) && (
          <div className="bg-slate-900 rounded-[2rem] p-8 border border-indigo-500/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 text-indigo-500 mb-6 uppercase tracking-widest text-xs font-black border-b border-slate-800 pb-4">
              <Sparkles size={16} /> Generated Response
            </div>
            
            <div className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-slate-950 p-6 rounded-2xl border border-slate-800 min-h-[50px]">
              {loading && !output ? (
                <span className="flex items-center gap-2 text-slate-500 italic">
                  <Loader2 className="animate-spin" size={14} /> 
                  Mistral is thinking...
                </span>
              ) : output}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default AIDemo;
