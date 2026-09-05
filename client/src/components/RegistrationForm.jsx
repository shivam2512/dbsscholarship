import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, User, Mail, Phone, GraduationCap, Briefcase, UserCheck, AlertCircle, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

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
    "Sadanand B",
    "Vaishnavi",
    "Vijaykumar P.",
    "Ragini",
    "Dnyneshwari dhamal",
    "Aaryan",
    "Jay Dhumal",
    "Vanshita Pawar",
    "Saurabh Vispute",
    "Himanshu Panchal",
    "Rushikesh Dhanawade",
    "Gokul",
    "Darshan Mahajan",
    "Sivanand",
    "Siddharth"
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateAttemptInfo, setDuplicateAttemptInfo] = useState(null);

  useEffect(() => {
    api.fetchCoaches()
      .then(data => {
        if (data.coaches && data.coaches.length > 0) {
          setCoaches(data.coaches);
        }
      })
      .catch(err => console.warn('Could not load coach list:', err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
        onRegistered({
          candidate: res.candidate,
          testId: res.testId,
          token: res.token,
          isResume: res.isResume
        });
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
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-4 h-4" />
          Single-Attempt Proctored Assessment
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          IT Career Readiness & Scholarship Assessment
        </h1>
        <p className="text-slate-400 mt-2 max-w-2xl mx-auto text-sm md:text-base">
          Evaluate your technical readiness for L1 IT Support roles and qualify for up to <strong className="text-sky-300">100% Tuition Scholarships</strong>.
        </p>
      </div>

      {/* Duplicate Attempt Warning Card */}
      {duplicateAttemptInfo && (
        <div className="glass-panel border-amber-500/40 p-6 mb-8 bg-amber-950/20 rounded-2xl shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
              <Lock className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-200">Assessment Already Completed</h3>
              <p className="text-sm text-slate-300 mt-1">
                Our security record indicates that an assessment was already submitted using the email <strong className="text-white font-mono">{formData.email}</strong>. Per strict examination policies, re-attempts are locked.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {duplicateAttemptInfo.submissionId && (
                  <button
                    onClick={() => onResumeScorecard(duplicateAttemptInfo.submissionId)}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    View Official Verified Scorecard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setDuplicateAttemptInfo(null)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Register with another email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="md:col-span-7 glass-panel-glow p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" />
            Candidate Registration
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Ensure details match your official ID for certificate validation.
          </p>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Alex Kumar"
                required
                className="form-input"
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  WhatsApp / Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* College / Institution */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                College / University / Highest Degree
              </label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                placeholder="e.g. B.Tech CS / BCA / MCA"
                className="form-input"
              />
            </div>

            {/* Experience & Assigned Coach */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  Experience Level
                </label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="Fresher / Student">Fresher / Student</option>
                  <option value="0 - 1 Year">0 - 1 Year</option>
                  <option value="1 - 3 Years">1 - 3 Years</option>
                  <option value="3+ Years">3+ Years (Career Transition)</option>
                </select>
              </div>

              <div>
                <label className="form-label flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  Career Consultant / Coach
                </label>
                <select
                  name="coach"
                  value={formData.coach}
                  onChange={handleChange}
                  className="form-input"
                >
                  {coaches.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
                <span>
                  I understand this is a <strong className="text-sky-300">strictly proctored CBT</strong>. Exiting full-screen, switching tabs, or unauthorized actions will be flagged and can result in automatic disqualification.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-4"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Validating Eligibility...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Proceed to Security Pre-Check
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Scholarship & Test Highlights */}
        <div className="md:col-span-5 space-y-4">
          {/* Scholarship Brackets */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Scholarship Eligibility</span>
              <span className="text-xs text-sky-400 font-mono">50 Marks Max</span>
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                  <div>
                    <div className="text-xs font-bold text-purple-200">Platinum Tier (90% - 100%)</div>
                    <div className="text-[11px] text-purple-400/80">45 - 50 Marks</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  100% Scholarship
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <div>
                    <div className="text-xs font-bold text-amber-200">Gold Tier (75% - 89%)</div>
                    <div className="text-[11px] text-amber-400/80">38 - 44 Marks</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  50% Scholarship
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <div>
                    <div className="text-xs font-bold text-cyan-200">Silver Tier (60% - 74%)</div>
                    <div className="text-[11px] text-cyan-400/80">30 - 36 Marks</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  25% Scholarship
                </span>
              </div>
            </div>
          </div>

          {/* Test Pattern */}
          <div className="glass-panel p-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Assessment Pattern & Rules
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span><strong>10 Scored MCQs</strong> &bull; 20 Minutes Time Limit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span><strong>+5 Marks</strong> per correct answer (50 Marks Total) &bull; No negative marking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Continuous Face & Audio surveillance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Instant Scorecard & PDF Certificate delivery</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
