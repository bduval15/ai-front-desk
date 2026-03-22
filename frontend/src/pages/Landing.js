import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Cpu, Shield, Zap, ArrowRight, LogIn } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-10 py-6 border-b border-slate-800/50">
        <div className="flex items-center gap-2 text-indigo-500 font-bold text-xl">
          <PhoneCall size={24} /> <span>FrontDesk.ai</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-slate-400 hover:text-white transition-colors">Login</Link>
          <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-full font-bold transition-all text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto pt-24 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full text-indigo-400 text-sm font-medium mb-8">
          <Zap size={14} /> Powered by Mistral-7B LLM
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent leading-tight">
          The AI Receptionist for <br /> Modern Businesses.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          FrontDesk.ai automates your outbound calls, reminders, and feedback loops with human-like intelligence. Stop wasting time on the phone.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
            Sign Up <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="w-full sm:w-auto bg-slate-900 border border-slate-800 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <LogIn size={20} /> Sign In
          </Link>
        </div>
      </header>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-8">
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all group">
          <Cpu className="text-indigo-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold mb-3">Self-Hosted LLM</h3>
          <p className="text-slate-400 leading-relaxed">Full privacy with our dedicated Mistral model integration running on your own infrastructure.</p>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all group">
          <Shield className="text-indigo-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold mb-3">Secure & Compliant</h3>
          <p className="text-slate-400 leading-relaxed">Enterprise-grade encryption for all call transcripts, recordings, and sensitive customer data.</p>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all group">
          <Zap className="text-indigo-500 mb-6 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold mb-3">Real-time Action</h3>
          <p className="text-slate-400 leading-relaxed">Seamlessly book appointments, gather feedback, and send pill reminders via autonomous AI agents.</p>
        </div>
      </section>
    </div>
  );
};

export default Landing;