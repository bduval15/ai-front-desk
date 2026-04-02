import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import TranscriptView from '../components/TranscriptView';
import { Phone, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

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

const CallHistory = () => {
  const [calls, setCalls] = useState([]);
  const { token } = useAuth();

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/api/calls/my-calls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalls(res.data);
    } catch (err) {
      console.error('Archive fetch error');
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    fetchHistory();
    const intervalId = setInterval(fetchHistory, 5000);
    return () => clearInterval(intervalId);
  }, [token, fetchHistory]);

  return (
    <Layout title="Call Archive">
      <div className="max-w-5xl mx-auto space-y-6">
        {calls.map((c) => (
          <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl hover:border-indigo-500/30 transition-all group">
            <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center text-xs font-black uppercase text-slate-500">
              <div className="flex items-center gap-3"><Phone size={16} className="text-indigo-500" /> {c.phoneNumber}</div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-[10px] tracking-widest ${getStatusClasses(c.callStatus)}`}>
                  {c.callStatus || 'Queued'}
                </span>
                <div className="flex items-center gap-2 font-mono italic opacity-50"><Calendar size={14} /> {new Date(c.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-indigo-400 text-[10px] font-black mb-4 uppercase tracking-widest italic opacity-60">Goal: {c.goal}</p>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 px-6 py-5">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <FileText size={14} className="text-indigo-500" /> Summary
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  {c.transcriptProcessingStatus === 'processing'
                    ? 'Processing Transcript...'
                    : (c.summary || 'Summary pending.')}
                </p>
              </div>

              <TranscriptView call={c} />
            </div>
          </div>
        ))}
        {calls.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900 p-12 text-center text-[11px] uppercase tracking-[0.3em] text-slate-600">
            No archived calls yet
          </div>
        )}
      </div>
    </Layout>
  );
};
export default CallHistory;
