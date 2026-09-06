import React from 'react';
import { ShieldCheck, Award, Lock, UserCheck } from 'lucide-react';

export default function Navbar({ currentView, setView, isExamActive, candidate }) {
  return (
    <header className="sticky top-0 z-50 px-4 lg:px-8 py-3"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1.5px solid rgba(147,197,253,0.45)',
        boxShadow: '0 2px 16px rgba(29,78,216,0.07)'
      }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* DBS Logo Badge */}
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(29,78,216,0.35)'
          }}>
            <Award className="w-6 h-6" style={{ color: '#fff' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                background: 'linear-gradient(90deg, #1d4ed8 0%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                DBS IT Scholarship Test
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                borderRadius: 20, background: 'rgba(29,78,216,0.08)',
                color: '#1d4ed8', border: '1px solid rgba(29,78,216,0.2)',
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>
                Proctored
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }} className="hidden sm:block">
              IT Career Readiness &amp; Scholarship Assessment
            </p>
          </div>
        </div>

        {/* Center Status */}
        {isExamActive ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#f0f6ff', border: '1.5px solid #bfdbfe',
            borderRadius: 30, padding: '6px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-indicator"></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                AI Proctor Active
              </span>
            </div>
            <div style={{ width: 1, height: 16, background: '#bfdbfe' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock className="w-3.5 h-3.5" style={{ color: '#1d4ed8' }} />
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1d4ed8' }}>
                {candidate?.fullName || 'Candidate'}
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6" style={{ fontSize: 12, color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck className="w-4 h-4" style={{ color: '#059669' }} />
              <span>Anti-Cheat Protected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock className="w-4 h-4" style={{ color: '#1d4ed8' }} />
              <span>One-Time Attempt</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck className="w-4 h-4" style={{ color: '#d97706' }} />
              <span>Instant Certificate</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isExamActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setView('register')}
              style={{
                fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
                border: currentView === 'register' || currentView === 'system-check'
                  ? '1.5px solid rgba(29,78,216,0.35)' : '1.5px solid transparent',
                background: currentView === 'register' || currentView === 'system-check'
                  ? 'rgba(29,78,216,0.08)' : 'transparent',
                color: currentView === 'register' || currentView === 'system-check'
                  ? '#1d4ed8' : '#64748b',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Candidate Portal
            </button>
            <button
              onClick={() => setView('admin')}
              style={{
                fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
                border: currentView === 'admin'
                  ? '1.5px solid rgba(217,119,6,0.35)' : '1.5px solid transparent',
                background: currentView === 'admin'
                  ? 'rgba(217,119,6,0.08)' : 'transparent',
                color: currentView === 'admin' ? '#d97706' : '#64748b',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Admin Monitor
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
