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
    <div className="container py-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Hero Banner ── */}
      <div className="bg-primary bg-gradient" style={{
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
        <div className="position-relative text-center">
          {/* Institute badge */}
          <div className="d-inline-d-flex align-items-center gap-2 bg-white bg-opacity-20 border border-white rounded-pill py-1 px-3 mb-3">
            <Award style={{ width: 15, height: 15, color: '#fbbf24' }} />
            <span className="fs-6 fw-bold text-warning text-uppercase" style={{ letterSpacing: '0.1em' }}>DBS Institute of Technology</span>
          </div>
          {/* Main headline */}
          <h1 className="display-5 fw-bold text-white mb-2" style={{ fontFamily: '"Outfit", sans-serif', letterSpacing: '-0.03em' }}>IT Scholarship Test 2025</h1>
          {/* Lucrative quote */}
          <p className="fs-5 text-light fst-italic mb-4" style={{ maxWidth: 680, margin: '0 auto' }}>
            "Your 20 minutes today could save you lakhs tomorrow — <strong className="text-warning">earn up to 100% tuition scholarship</strong> and launch your IT career with zero financial barrier."
          </p>
          {/* CTA chips */}
          <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
            {[
              { icon: <Trophy style={{ width: 14, height: 14 }} />, label: '100% Scholarship for Top Scorers' },
              { icon: <Zap style={{ width: 14, height: 14 }} />, label: 'Results in 60 Seconds' },
              { icon: <Clock style={{ width: 14, height: 14 }} />, label: 'Only 20 Minutes' },
              { icon: <TrendingUp style={{ width: 14, height: 14 }} />, label: 'L1 IT Career Launch' },
            ].map((chip, i) => (
              <div key={i} className={`d-flex align-items-center gap-2 px-3 py-2 rounded-pill ${i===0 ? 'bg-warning text-dark' : 'bg-light text-muted'}`}>
                {chip.icon}
                <span className="small fw-semibold">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duplicate Attempt Warning */}
      {duplicateAttemptInfo && (
        <div className="alert alert-warning border border-warning rounded-3 p-4 mb-4 shadow-sm">
          <div className="d-flex gap-3 align-items-start">
            <div className="p-2 bg-warning bg-opacity-10 rounded-2 d-flex-shrink-0">
              <Lock style={{ width: 22, height: 22, color: '#d97706' }} />
            </div>
            <div className="d-flex-grow-1">
              <h3 className="fs-5 fw-bold text-danger mb-2">Assessment Already Completed</h3>
              <p className="fs-6 text-danger">Our record shows an assessment was submitted using <strong className="font-monospace">{formData.email}</strong>. Per strict examination policies, re-attempts are locked.</p>
              <div className="d-flex flex-wrap gap-2 mt-3">
                {duplicateAttemptInfo.submissionId && (
                  <button onClick={() => onResumeScorecard(duplicateAttemptInfo.submissionId)} className="btn btn-primary btn-sm">View Official Scorecard <ArrowRight style={{ width: 13, height: 13 }} /></button>
                )}
                <button onClick={() => setDuplicateAttemptInfo(null)} className="btn btn-secondary btn-sm">Register with another email</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="row g-4">
        {/* Left: Registration Form */}
        <div className="col-md-8">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              {/* Form header */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded" style={{ width: 36, height: 36, boxShadow: '0 4px 10px rgba(29,78,216,0.25)' }}>
                  <UserCheck style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div>
                  <h2 className="h5 fw-bold text-dark mb-0">Candidate Registration</h2>
                  <p className="small text-muted mb-0">Secure • Verified • One-Time Attempt</p>
                </div>
              </div>
              <p className="small text-muted mb-4 pt-2" style={{ borderTop: '1px solid #f0f4ff' }}>Ensure details match your official ID for scholarship certificate validation.</p>

              {/* Error */}
              {errorMsg && (
                <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                  <AlertCircle style={{ width: 16, height: 16 }} />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="row g-3">
                {/* Full Name */}
                <div className="col-12">
                  <label className="form-label fw-bold"><User style={{ width: 12, height: 12, color: '#1d4ed8' }} /> Full Name <span className="text-danger">*</span></label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Rahul Sharma" required className="form-control" />
                </div>
                {/* Email */}
                <div className="col-md-6">
                  <label className="form-label fw-bold"><Mail style={{ width: 12, height: 12, color: '#1d4ed8' }} /> Email <span className="text-danger">*</span></label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" required className="form-control" />
                </div>
                {/* Phone */}
                <div className="col-md-6">
                  <label className="form-label fw-bold"><Phone style={{ width: 12, height: 12, color: '#1d4ed8' }} /> WhatsApp / Phone <span className="text-danger">*</span></label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" required className="form-control" />
                </div>
                {/* College */}
                <div className="col-12">
                  <label className="form-label fw-bold"><GraduationCap style={{ width: 12, height: 12, color: '#1d4ed8' }} /> College / University / Highest Degree</label>
                  <input type="text" name="college" value={formData.college} onChange={handleChange} placeholder="e.g. B.Tech CS / BCA / MCA" className="form-control" />
                </div>
                {/* Experience */}
                <div className="col-md-6">
                  <label className="form-label fw-bold"><Briefcase style={{ width: 12, height: 12, color: '#1d4ed8' }} /> Experience Level</label>
                  <select name="experience" value={formData.experience} onChange={handleChange} className="form-select">
                    <option value="Fresher / Student">Fresher / Student</option>
                    <option value="0 - 1 Year">0 - 1 Year</option>
                    <option value="1 - 3 Years">1 - 3 Years</option>
                    <option value="3+ Years">3+ Years (Career Transition)</option>
                  </select>
                </div>
                {/* Coach */}
                <div className="col-md-6">
                  <label className="form-label fw-bold"><UserCheck style={{ width: 12, height: 12, color: '#1d4ed8' }} /> Career Consultant</label>
                  <select name="coach" value={formData.coach} onChange={handleChange} className="form-select">
                    {coaches.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Terms */}
                <div className="col-12">
                  <div className="bg-light border border-primary-subtle rounded p-3">
                    <div className="form-check">
                      <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} className="form-check-input" id="termsCheck" />
                      <label className="form-check-label small text-dark" htmlFor="termsCheck">
                        I understand this is a <strong className="text-primary">strictly proctored CBT</strong>. Exiting full-screen, switching tabs, or unauthorized actions will be flagged and may result in automatic disqualification.
                      </label>
                    </div>
                  </div>
                </div>
                {/* Submit */}
                <div className="col-12">
                  <button type="submit" disabled={loading} className="btn btn-primary w-100" style={{ fontSize: 15, padding: '14px' }}>
                    {loading ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Validating Eligibility...
                      </span>
                    ) : (
                      <span className="d-flex align-items-center justify-content-center gap-2">Proceed to Security Pre-Check <ArrowRight style={{ width: 16, height: 16 }} /></span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* Right: Info Sidebar */}
        <div className="col-md-4">
          <div className="d-flex flex-column gap-3">
            {/* Scholarship Tiers */}
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 fw-bold text-primary d-flex align-items-center gap-2" style={{ fontSize: 15 }}><Trophy style={{ width: 15, height: 15, color: '#d97706' }} /> Scholarship Brackets</h5>
                  <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle rounded-pill" style={{ fontSize: 11 }}>50 Marks Max</span>
                </div>
                <div className="list-group">
                  {/* Platinum */}
                  <div className="list-group-item d-flex justify-content-between align-items-center bg-white border border-primary-subtle rounded mb-2 p-2.5">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 18 }}>🥇</span>
                      <div>
                        <div className="small fw-bold text-primary">Platinum — 90% to 100%</div>
                        <div className="small text-muted">45 – 50 Marks</div>
                      </div>
                    </div>
                    <span className="badge bg-primary text-white">100% OFF</span>
                  </div>
                  {/* Gold */}
                  <div className="list-group-item d-flex justify-content-between align-items-center bg-white border border-warning-subtle rounded mb-2 p-2.5">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 18 }}>🥈</span>
                      <div>
                        <div className="small fw-bold text-warning">Gold — 75% to 89%</div>
                        <div className="small text-muted">38 – 44 Marks</div>
                      </div>
                    </div>
                    <span className="badge bg-warning text-dark">50% OFF</span>
                  </div>
                  {/* Silver */}
                  <div className="list-group-item d-flex justify-content-between align-items-center bg-white border border-info-subtle rounded mb-2 p-2.5">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: 18 }}>🥉</span>
                      <div>
                        <div className="small fw-bold text-info">Silver — 60% to 74%</div>
                        <div className="small text-muted">30 – 36 Marks</div>
                      </div>
                    </div>
                    <span className="badge bg-info text-dark">25% OFF</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Why Appear */}
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-3">
                <h5 className="mb-3 fw-bold text-primary d-flex align-items-center gap-2" style={{ fontSize: 15 }}><Star style={{ width: 14, height: 14, color: '#d97706' }} /> Why Appear?</h5>
                <ul className="list-unstyled mb-0">
                  {[
                    { icon: '🎯', text: 'Score 90%+ and get completely FREE training worth ₹40,000+' },
                    { icon: '⚡', text: 'Instant Scorecard — know your result in under 60 seconds' },
                    { icon: '🏅', text: 'Official digitally-signed Scholarship Certificate' },
                    { icon: '💼', text: 'Launch an L1 IT Support career with industry-ready skills' },
                    { icon: '📊', text: 'No negative marking — every correct answer gets you closer' },
                  ].map((item, i) => (
                    <li key={i} className="d-flex align-items-start gap-2 mb-2" style={{ fontSize: 13, color: '#334155' }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Exam Pattern */}
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body p-3">
                <h5 className="mb-3 fw-bold text-primary d-flex align-items-center gap-2" style={{ fontSize: 15 }}><ShieldCheck style={{ width: 14, height: 14, color: '#059669' }} /> Exam Pattern</h5>
                <ul className="list-unstyled mb-0">
                  {[
                    '10 MCQs covering core IT concepts',
                    '+5 marks per correct answer (50 Total)',
                    'No negative marking',
                    '20-minute strict time limit',
                    'AI-proctored webcam & audio monitoring',
                    'One-time attempt only — plan wisely!',
                  ].map((rule, i) => (
                    <li key={i} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: 13, color: '#334155' }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


