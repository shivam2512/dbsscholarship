import React from 'react';
import { ShieldCheck, Award, Lock, UserCheck, HelpCircle } from 'lucide-react';

export default function Navbar({ currentView, setView, isExamActive, candidate, timeRemainingFormatted }) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Scholarship CBT
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
                Proctored
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              IT Career Readiness & Scholarship Assessment (L1 Support Role)
            </p>
          </div>
        </div>

        {/* Center / Status */}
        {isExamActive ? (
          <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-700/60 rounded-full px-4 py-1.5 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="pulse-indicator"></span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">AI Proctor Active</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-mono font-bold text-sky-300">{candidate?.fullName || 'Candidate'}</span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Multi-Layer Anti-Cheat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-sky-400" />
              <span>One-Time Attempt Shield</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Instant Verified Scorecard</span>
            </div>
          </div>
        )}

        {/* Navigation Switch (Registration / Admin) */}
        {!isExamActive && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('register')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'register' || currentView === 'system-check'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Candidate Portal
            </button>
            <button
              onClick={() => setView('admin')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'admin'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              Admin & Coach Monitor
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
