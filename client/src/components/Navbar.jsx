import React from 'react';
import { ShieldCheck, Award, Lock, UserCheck } from 'lucide-react';

export default function Navbar({ currentView, setView, isExamActive, candidate }) {
  return (
    <header className="sticky top-0 z-50 navbar navbar-expand-lg bg-white bg-opacity-90 border-bottom shadow-sm" style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="container-fluid d-flex align-items-center justify-content-between">
        {/* Brand */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded-3 shadow-sm" style={{ width: 44, height: 44 }}>
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-primary" style={{ fontSize: 17, letterSpacing: '-0.02em' }}>
                DBS IT Scholarship Test
              </span>
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle rounded-pill text-uppercase" style={{ fontSize: 10, padding: '2px 8px' }}>
                Proctored
              </span>
            </div>
            <p className="text-muted mb-0 d-none d-sm-block" style={{ fontSize: 11 }}>
              IT Career Readiness &amp; Scholarship Assessment
            </p>
          </div>
        </div>

        {/* Center Status */}
        {isExamActive ? (
          <div className="d-flex align-items-center gap-3 bg-primary-subtle border border-primary-light rounded-pill px-3 py-1">
            <div className="d-flex align-items-center gap-2">
              <span className="spinner-grow spinner-grow-sm text-success" role="status" aria-hidden="true"></span>
              <span className="text-success fw-bold text-uppercase" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                AI Proctor Active
              </span>
            </div>
            <div className="vr bg-primary-subtle" style={{ height: 16 }}></div>
            <div className="d-flex align-items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary fw-bold font-monospace" style={{ fontSize: 12 }}>
                {candidate?.fullName || 'Candidate'}
              </span>
            </div>
          </div>
        ) : (
          <div className="d-none d-md-flex align-items-center gap-4 text-muted" style={{ fontSize: 12 }}>
            <div className="d-flex align-items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Anti-Cheat Protected</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>One-Time Attempt</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <UserCheck className="w-4 h-4 text-warning" />
              <span>Instant Certificate</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isExamActive && (
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={() => setView('register')}
              className={`btn btn-sm ${currentView === 'register' ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              Candidate Portal
            </button>
            <button
              onClick={() => setView('admin')}
              className={`btn btn-sm ${currentView === 'admin' ? 'btn-warning' : 'btn-outline-secondary'}`}
            >
              Admin Monitor
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
