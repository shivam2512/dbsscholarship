import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck, User, Mail, Phone, GraduationCap, Briefcase,
  UserCheck, AlertCircle, ArrowRight, Lock, CheckCircle2,
  Star, Trophy, Zap, TrendingUp, Award, Clock
} from 'lucide-react';

export default function RegistrationForm({ onRegistered, onResumeScorecard }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    experience: 'Fresher / Student',
    coach: 'Direct / None',
    agreeTerms: true
  });

  const [coaches, setCoaches] = useState([
    "Sadanand B", "Vaishnavi", "Vijaykumar P.", "Ragini",
    "Dnyneshwari dhamal", "Aaryan", "Jay Dhumal", "Vanshita Pawar",
    "Saurabh Vispute", "Himanshu Panchal", "Rushikesh Dhanawade",
    "Gokul", "Darshan Mahajan", "Sivanand", "Siddharth"
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateAttemptInfo, setDuplicateAttemptInfo] = useState(null);

  useEffect(() => {
    api.fetchCoaches()
      .then(data => {
        if (data.coaches && data.coaches.length > 0) setCoaches(data.coaches);
      })
      .catch(err => console.warn('Could not load coach list:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrorMsg('');
    setDuplicateAttemptInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return setErrorMsg('Please enter your full name.');
    if (!formData.email.trim() || !formData.email.includes('@')) return setErrorMsg('Please provide a valid email address.');
    if (!formData.phone.trim() || formData.phone.length < 8) return setErrorMsg('Please provide a valid phone number.');
    if (!formData.agreeTerms) return setErrorMsg('You must agree to the proctoring guidelines to proceed.');

    setLoading(true);
    setErrorMsg('');
    setDuplicateAttemptInfo(null);

    try {
      const res = await api.registerCandidate(formData);
      if (res.success) {
        onRegistered({ candidate: res.candidate, testId: res.testId, token: res.token, isResume: res.isResume });
      }
    } catch (err) {
      if (err.isAttempted) {
        setDuplicateAttemptInfo(err);
      } else {
        setErrorMsg(err.error || 'Registration failed. Please check your network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 48px' }} className="animate-fade-in">

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
        borderRadius: 24,
        padding: '48px 40px 44px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(29,78,216,0.35)'
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 240, height: 240,
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(217,119,6,0.15)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '10%',
          transform: 'translateY(-50%)', fontSize: 120, opacity: 0.07,
          pointerEvents: 'none', lineHeight: 1
        }}>🎓</div>

        <div style={{ position: 'relative', textAlign: 'center' }}>
          {/* Institute badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 18px', borderRadius: 50,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
            marginBottom: 18
          }}>
            <Award style={{ width: 15, height: 15, color: '#fbbf24' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fde68a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              DBS Institute of Technology
            </span>
          </div>

          {/* Main headline */}
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(26px, 5vw, 42px)',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 12
          }}>
            IT Scholarship Test 2025
          </h1>

          {/* Lucrative quote */}
          <p style={{
            fontSize: 'clamp(14px, 2.2vw, 18px)',
            color: 'rgba(255,255,255,0.85)',
            maxWidth: 680,
            margin: '0 auto 20px',
            lineHeight: 1.6,
            fontStyle: 'italic',
            fontWeight: 400
          }}>
            "Your 20 minutes today could save you lakhs tomorrow —{' '}
            <strong style={{ color: '#fde68a', fontStyle: 'normal', fontWeight: 700 }}>
              earn up to 100% tuition scholarship
            </strong>{' '}
            and launch your IT career with zero financial barrier."
          </p>

          {/* CTA chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {[
              { icon: <Trophy style={{ width: 14, height: 14 }} />, label: '100% Scholarship for Top Scorers' },
              { icon: <Zap style={{ width: 14, height: 14 }} />, label: 'Results in 60 Seconds' },
              { icon: <Clock style={{ width: 14, height: 14 }} />, label: 'Only 20 Minutes' },
              { icon: <TrendingUp style={{ width: 14, height: 14 }} />, label: 'L1 IT Career Launch' },
            ].map((chip, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 30,
                background: i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.1)',
                border: i === 0 ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.18)',
                color: i === 0 ? '#fde68a' : 'rgba(255,255,255,0.9)',
                fontSize: 12, fontWeight: 600
              }}>
                {chip.icon}
                {chip.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duplicate Attempt Warning */}
      {duplicateAttemptInfo && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fbbf24',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24,
          boxShadow: '0 4px 16px rgba(217,119,6,0.1)'
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              padding: 10, borderRadius: 10, background: 'rgba(217,119,6,0.1)', flexShrink: 0
            }}>
              <Lock style={{ width: 22, height: 22, color: '#d97706' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                Assessment Already Completed
              </h3>
              <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                Our record shows an assessment was submitted using{' '}
                <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formData.email}</strong>.
                Per strict examination policies, re-attempts are locked.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                {duplicateAttemptInfo.submissionId && (
                  <button onClick={() => onResumeScorecard(duplicateAttemptInfo.submissionId)} className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}>
                    View Official Scorecard <ArrowRight style={{ width: 13, height: 13 }} />
                  </button>
                )}
                <button onClick={() => setDuplicateAttemptInfo(null)} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px' }}>
                  Register with another email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Grid: Form + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>

        {/* Left: Registration Form */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="glass-panel-glow" style={{ padding: '32px 28px' }}>
            {/* Form header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(29,78,216,0.25)'
              }}>
                <UserCheck style={{ width: 18, height: 18, color: '#fff' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                  Candidate Registration
                </h2>
                <p style={{ fontSize: 11, color: '#64748b' }}>Secure • Verified • One-Time Attempt</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 22, paddingTop: 6, borderTop: '1px solid #f0f4ff' }}>
              Ensure details match your official ID for scholarship certificate validation.
            </p>

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginBottom: 18, padding: '12px 16px',
                background: '#fef2f2', border: '1.5px solid #fca5a5',
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, color: '#dc2626'
              }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Full Name */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                  Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text" name="fullName" value={formData.fullName}
                  onChange={handleChange} placeholder="e.g. Rahul Sharma"
                  required className="form-input"
                />
              </div>

              {/* Email & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                    Email <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email" name="email" value={formData.email}
                    onChange={handleChange} placeholder="name@example.com"
                    required className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                    WhatsApp / Phone <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="tel" name="phone" value={formData.phone}
                    onChange={handleChange} placeholder="+91 98765 43210"
                    required className="form-input"
                  />
                </div>
              </div>

              {/* College */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GraduationCap style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                  College / University / Highest Degree
                </label>
                <input
                  type="text" name="college" value={formData.college}
                  onChange={handleChange} placeholder="e.g. B.Tech CS / BCA / MCA"
                  className="form-input"
                />
              </div>

              {/* Experience & Coach */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Briefcase style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                    Experience Level
                  </label>
                  <select name="experience" value={formData.experience} onChange={handleChange} className="form-input">
                    <option value="Fresher / Student">Fresher / Student</option>
                    <option value="0 - 1 Year">0 - 1 Year</option>
                    <option value="1 - 3 Years">1 - 3 Years</option>
                    <option value="3+ Years">3+ Years (Career Transition)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCheck style={{ width: 12, height: 12, color: '#1d4ed8' }} />
                    Career Consultant
                  </label>
                  <select name="coach" value={formData.coach} onChange={handleChange} className="form-input">
                    {coaches.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Terms */}
              <div style={{
                background: '#f0f6ff', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #bfdbfe'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12, color: '#334155' }}>
                  <input
                    type="checkbox" name="agreeTerms" checked={formData.agreeTerms}
                    onChange={handleChange}
                    style={{ marginTop: 2, accentColor: '#1d4ed8', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span>
                    I understand this is a <strong style={{ color: '#1d4ed8' }}>strictly proctored CBT</strong>. Exiting full-screen,
                    switching tabs, or unauthorized actions will be flagged and may result in automatic disqualification.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginTop: 4 }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Validating Eligibility...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Proceed to Security Pre-Check
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Info Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Scholarship Tiers */}
          <div className="glass-panel" style={{ padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trophy style={{ width: 15, height: 15, color: '#d97706' }} />
                Scholarship Brackets
              </h3>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', padding: '3px 10px', borderRadius: 20 }}>50 Marks Max</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Platinum */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                border: '1.5px solid #c4b5fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🥇</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#5b21b6' }}>Platinum — 90% to 100%</div>
                    <div style={{ fontSize: 11, color: '#7c3aed' }}>45 – 50 Marks</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#7c3aed', color: '#fff' }}>
                  100% OFF
                </span>
              </div>

              {/* Gold */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: '1.5px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🥈</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>Gold — 75% to 89%</div>
                    <div style={{ fontSize: 11, color: '#b45309' }}>38 – 44 Marks</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#d97706', color: '#fff' }}>
                  50% OFF
                </span>
              </div>

              {/* Silver */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                border: '1.5px solid #7dd3fc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🥉</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0c4a6e' }}>Silver — 60% to 74%</div>
                    <div style={{ fontSize: 11, color: '#0369a1' }}>30 – 36 Marks</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#0891b2', color: '#fff' }}>
                  25% OFF
                </span>
              </div>
            </div>
          </div>

          {/* Why Appear */}
          <div className="glass-panel" style={{ padding: '20px 20px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star style={{ width: 14, height: 14, color: '#d97706', fill: '#d97706' }} />
              Why Appear?
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🎯', text: 'Score 90%+ and get completely FREE training worth ₹40,000+' },
                { icon: '⚡', text: 'Instant Scorecard — know your result in under 60 seconds' },
                { icon: '🏅', text: 'Official digitally-signed Scholarship Certificate' },
                { icon: '💼', text: 'Launch an L1 IT Support career with industry-ready skills' },
                { icon: '📊', text: 'No negative marking — every correct answer gets you closer' },
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: '#334155' }}>
                  <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Exam Pattern */}
          <div className="glass-panel" style={{ padding: '20px 20px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck style={{ width: 14, height: 14, color: '#059669' }} />
              Exam Pattern
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                '10 MCQs covering core IT concepts',
                '+5 marks per correct answer (50 Total)',
                'No negative marking',
                '20-minute strict time limit',
                'AI-proctored webcam & audio monitoring',
                'One-time attempt only — plan wisely!',
              ].map((rule, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155' }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
