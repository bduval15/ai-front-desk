import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { Send, Phone, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const CALL_LIMIT = 20;

const getUsageWarning = (apiCalls = 0) => {
  if (apiCalls >= CALL_LIMIT) {
    return '20-call limit reached. New outbound calls are blocked until your usage resets or the plan changes.';
  }

  if (apiCalls >= CALL_LIMIT - 2) {
    const remaining = CALL_LIMIT - apiCalls;
    return `Warning: ${remaining} call${remaining === 1 ? '' : 's'} remaining before the 20-call limit is reached.`;
  }

  return '';
};

const getCallPreview = (call) => {
  if (call.transcriptProcessingStatus === 'processing') {
    return 'Processing Transcript...';
  }

  return call.summary || call.formattedTranscript || call.rawTranscript || call.transcript || 'Call queued.';
};

const Dashboard = () => {
  const { user, token, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const usagePercent = ((user?.apiCalls || 0) / CALL_LIMIT) * 100;
  const warningMessage = feedback.type === 'warning' && feedback.message
    ? feedback.message
    : (user?.warning || getUsageWarning(user?.apiCalls || 0));

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/calls/my-calls', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecent(res.data.slice(0, 3));
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/api/telephony/make-call',
        { phoneNumber: phone, goal },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser({
        ...(user || {}),
        apiCalls: res.data.apiCalls,
        warning: res.data.warning || getUsageWarning(res.data.apiCalls)
      });
      setFeedback({
        type: 'success',
        message: res.data.message || 'Outbound call queued.'
      });
      setPhone('');
      setGoal('');
      fetchData();
    } catch (err) {
      const apiError = err.response?.data;

      if (apiError?.apiCalls !== undefined) {
        setUser({
          ...(user || {}),
          apiCalls: apiError.apiCalls,
          warning: apiError.warning || getUsageWarning(apiError.apiCalls)
        });
      }

      setFeedback({
        type: apiError?.warning ? 'warning' : 'error',
        message: apiError?.warning || apiError?.error || 'Unable to place the call.'
      });
    }

    setLoading(false);
  };

  return (
    <Layout title="AI Command Center">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* USAGE */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
            <div className="flex justify-between items-end mb-4 text-xs font-black uppercase text-slate-500 tracking-widest">
              <span>Usage: {user?.apiCalls}/{CALL_LIMIT} Calls</span>
              {user?.apiCalls >= CALL_LIMIT && <span className="text-red-500 animate-pulse">Limit Alert</span>}
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className={`h-full transition-all duration-1000 ${user?.apiCalls >= CALL_LIMIT ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
            </div>
            {warningMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                <p className="text-sm leading-relaxed">{warningMessage}</p>
              </div>
            )}
            {feedback.type === 'success' && feedback.message && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {feedback.message}
              </div>
            )}
          </div>

          {/* DISPATCH */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <h3 className="text-white font-black mb-8 flex items-center gap-3 uppercase tracking-tighter"><Phone size={20} className="text-indigo-500" /> Initiate New Call</h3>
            <form onSubmit={handleDispatch} className="space-y-6">
              <input
                type="text"
                value={phone}
                placeholder="Recipient Number"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500"
                onChange={(e) => setPhone(e.target.value)}
              />
              <textarea
                rows="4"
                value={goal}
                placeholder="Goal (e.g. Confirm my 2pm meeting)"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500"
                onChange={(e) => setGoal(e.target.value)}
              />
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 group transition-all">
                {loading ? "Dialing..." : "Dispatch AI Agent"} <Send size={18} className="group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        </div>

        {/* RECENT TRANSCRIPTS */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl h-fit">
          <h3 className="text-white text-xs font-black uppercase mb-6 flex items-center gap-2 tracking-widest"><MessageSquare size={16} className="text-indigo-500" /> Recent Archive</h3>
          <div className="space-y-4">
            {recent.map((c) => (
              <div key={c._id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black text-indigo-400 mb-1">{c.phoneNumber}</p>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] uppercase tracking-widest text-slate-400">
                    {c.callStatus || 'Queued'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 italic line-clamp-3">{getCallPreview(c)}</p>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-[11px] uppercase tracking-[0.25em] text-slate-600">
                No calls yet
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Dashboard;
