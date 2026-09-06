import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Award, Download, CheckCircle2, XCircle, Mail, ShieldCheck,
  User, Calendar, Clock, BarChart3, ChevronDown, ChevronUp, FileText, Check
} from 'lucide-react';
import CertificateModal from './CertificateModal';

export default function Scorecard({ submissionData, candidateData, onRestart }) {
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const scorecardRef = useRef(null);

  const submission = submissionData?.submission || submissionData;
  const candidate = candidateData || submissionData?.candidate;

  const totalScore = submission?.totalScore || 0;
  const maxScore = submission?.maxScore || 50;
  const percentage = submission?.percentage || 0;
  const tier = submission?.scholarshipTier || 'Certificate of Participation';
  const categoryScores = submission?.categoryScores || {};
  const answers = submission?.answers || {};

  // Confetti effect for scholarship achievers
  useEffect(() => {
    if (percentage >= 60) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [percentage]);

  const getTierColorClass = (t) => {
    if (t.includes('Platinum')) return 'from-purple-500 to-indigo-600 border-purple-400 text-purple-200';
    if (t.includes('Gold')) return 'from-amber-500 to-yellow-600 border-amber-400 text-amber-200';
    if (t.includes('Silver')) return 'from-cyan-500 to-sky-600 border-cyan-400 text-cyan-200';
    return 'from-slate-600 to-slate-700 border-slate-500 text-slate-200';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container p-4 py-4 animate-fade-in">
      {/* Formal Certificate Modal */}
      {showCertModal && (
        <CertificateModal
          candidate={candidate}
          submission={submission}
          onClose={() => setShowCertModal(false)}
        />
      )}

      {/* Top Action Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 d-print-none">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Assessment Result</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Official Scorecard & Scholarship Certificate</h1>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => setShowCertModal(true)}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-950" />
            Download Certificate PDF
          </button>
        </div>
      </div>

      {/* Printable Scorecard Container */}
      <div ref={scorecardRef} className="gy-3">
        {/* Certificate Card */}
        <div className="glass-panel-glow p-4 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-indigo-500/10 to-transparent rounded-full pointer-events-none -mr-20 -mt-20"></div>

          {/* Header Banner */}
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-4 pb-6 border-bottom border-secondary">
            <div>
              <div className="d-inline-d-flex align-items-center gap-2 px-3 py-1 rounded bg-success bg-opacity-15 border border-success text-success text-xs fw-bold text-uppercase mb-2">
                <ShieldCheck className="w-4 h-4" />
                Proctoring Verified & Authenticated
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">IT Career Readiness Assessment</h2>
              <p className="text-xs sm:text-sm text-muted mt-1">L1 Support Role Competency & Scholarship Evaluation</p>
            </div>

            {/* Scholarship Badge */}
            <div
              onClick={() => setShowCertModal(true)}
              className={`px-4 py-2 rounded-2 border shadow-xl d-flex align-items-center gap-2 cursor-pointer`} title="Click to preview &amp; download formal landscape certificate"
              title="Click to preview & download formal landscape certificate"
            >
              <Award className="w-6 h-6 text-white" />
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-white/80">Scholarship Award</div>
                <div className="text-sm font-extrabold text-white d-flex align-items-center gap-1">
                  {tier}
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">View Cert</span>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate & Verification Meta */}
          <div className="row row-cols-2 row-cols-sm-4 g-3 py-3 border-bottom border-secondary text-muted">
            <div>
              <div className="text-muted d-flex align-items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-sky-400" /> Candidate Name
              </div>
              <div className="font-bold text-white text-sm">{candidate?.fullName}</div>
            </div>

            <div>
              <div className="text-muted d-flex align-items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-sky-400" /> Email & Phone
              </div>
              <div className="font-bold text-white truncate">{candidate?.email}</div>
              <div className="text-muted text-[11px]">{candidate?.phone}</div>
            </div>

            <div>
              <div className="text-muted d-flex align-items-center gap-1.5 mb-1">
                <Award className="w-3.5 h-3.5 text-sky-400" /> Assigned Coach
              </div>
              <div className="font-bold text-white">{candidate?.coach || 'General'}</div>
            </div>

            <div>
              <div className="text-muted d-flex align-items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" /> Certificate ID
              </div>
              <div className="font-mono font-bold text-sky-300 text-[11px]">{submission?.id || 'CERT-N/A'}</div>
            </div>
          </div>

          {/* Score Highlight Grid */}
          <div className="row row-cols-sm-3 g-3 my-5">
            <div className="p-4 rounded bg-dark border border-secondary text-center">
              <div className="text-xs text-muted font-semibold uppercase tracking-wider">Total Score</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-sky-400 font-mono mt-1">
                {totalScore} <span className="text-lg text-slate-500 font-normal">/ {maxScore}</span>
              </div>
              <div className="text-xs text-muted mt-1">{Object.keys(answers).length} / {Object.keys(answers).length + Math.max(0, 10 - Object.keys(answers).length)} Questions Attempted</div>
            </div>

            <div className="p-4 rounded bg-dark border border-secondary text-center">
              <div className="text-xs text-muted font-semibold uppercase tracking-wider">Overall Accuracy</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mt-1">
                {percentage}%
              </div>
              <div className="text-xs text-muted mt-1">Pass Mark: 60%</div>
            </div>

            <div className="p-4 rounded bg-dark border border-secondary text-center">
              <div className="text-xs text-muted font-semibold uppercase tracking-wider">Scholarship Benefit</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono mt-1">
                {tier.includes('100%') ? '100% OFF' : tier.includes('50%') ? '50% OFF' : tier.includes('25%') ? '25% OFF' : 'Participation'}
              </div>
              <div className="text-xs text-muted mt-1">Valid for Enrollment</div>
            </div>
          </div>

          {/* Domain Breakdown Table */}
          <div>
            <h3 className="text-xs fw-bold text-muted text-uppercase mb-3 d-flex align-items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              Domain Competency Performance
            </h3>

            <div className="gy-3">
              {Object.entries(categoryScores).map(([cat, stat]) => (
                <div key={cat} className="p-3.5 rounded-xl bg-dark/60 border border-slate-800">
                  <div className="d-flex align-items-center justify-content-between text-xs fw-semibold mb-1.5">
                    <span className="text-white">{cat}</span>
                    <span className="text-info font-monospace">
                      {stat.correct} / {stat.totalQuestions} ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar ${stat.percentage >= 80 ? 'bg-success' : stat.percentage >= 60 ? 'bg-primary' : 'bg-warning'}`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Notification Status */}
          <div className="mt-3 p-4 rounded bg-primary bg-opacity-30 border border-primary d-flex align-items-center justify-content-between text-xs">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sky-200">Official Scorecard Emailed</div>
                <div className="text-muted">A copy of this scorecard was sent to <strong>{candidate?.email}</strong>.</div>
              </div>
            </div>
            <span className="d-flex align-items-center gap-1 text-success fw-bold">
              <Check className="w-3.5 h-3.5" /> Dispatched
            </span>
          </div>
        </div>
      </div>

      {/* Answer Key & Explanations Accordion */}
      <div className="mt-8">
        <button
          onClick={() => setShowAnswerKey(!showAnswerKey)}
          className="glass-panel w-100 p-4 d-flex align-items-center justify-content-between text-left hover:border-secondary transition-colors"
        >
          <div className="d-flex align-items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span className="text-sm fw-bold text-white">Review Detailed Answers & Solutions ({Object.keys(answers).length} Answered)</span>
          </div>
          {showAnswerKey ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>

        {showAnswerKey && (
          <div className="gy-3 mt-4 animate-fade-in">
            {Object.entries(answers).map(([qId, ansInfo]) => (
              <div
                key={qId}
                className={`p-4 rounded-xl border text-xs ${
                  ansInfo.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="d-flex align-items-center justify-content-between font-bold mb-2">
                  <span className="text-slate-200">Question #{qId}</span>
                  {ansInfo.isCorrect ? (
                    <span className="text-emerald-400 d-flex align-items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+5 Marks)
                      </span>
                  ) : (
                    <span className="text-rose-400 d-flex align-items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect (0 Marks)
                    </span>
                  )}
                </div>

                <div className="text-muted mb-1">
                  Selected Choice: <strong>{ansInfo.selected !== null ? String.fromCharCode(65 + ansInfo.selected) : 'Not Answered'}</strong>
                  {!ansInfo.isCorrect && (
                    <span className="ml-3 text-emerald-400">
                      Correct Choice: <strong>{String.fromCharCode(65 + ansInfo.correct)}</strong>
                    </span>
                  )}
                </div>

                {ansInfo.explanation && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-muted text-[11px]">
                    <strong className="text-muted">Explanation: </strong> {ansInfo.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


