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
    <div className="container py-4">
      {/* Formal Certificate Modal */}
      {showCertModal && (
        <CertificateModal
          candidate={candidate}
          submission={submission}
          onClose={() => setShowCertModal(false)}
        />
      )}

      {/* Top Action Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 d-print-none">
        <div>
          <span className="small fw-bold text-primary text-uppercase tracking-wider">Assessment Result</span>
          <h1 className="fs-2 fw-bold text-dark mb-0">Official Scorecard & Scholarship Certificate</h1>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => setShowCertModal(true)}
            className="btn btn-primary py-2 px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Certificate PDF
          </button>
        </div>
      </div>

      {/* Printable Scorecard Container */}
      <div ref={scorecardRef}>
        {/* Certificate Card */}
        <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white mb-4 position-relative overflow-hidden">
          {/* Header Banner */}
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 pb-4 border-bottom">
            <div>
              <div className="d-inline-flex align-items-center gap-1.5 px-3 py-1 rounded-pill bg-success bg-opacity-10 border border-success-subtle text-success small fw-bold text-uppercase mb-2">
                <ShieldCheck className="w-4 h-4" />
                Proctoring Verified & Authenticated
              </div>
              <h2 className="fs-3 fw-bold text-dark mb-1">IT Career Readiness Assessment</h2>
              <p className="small text-muted mb-0">L1 Support Role Competency & Scholarship Evaluation</p>
            </div>

            {/* Scholarship Badge */}
            <div
              onClick={() => setShowCertModal(true)}
              className="p-3 rounded-3 bg-primary bg-opacity-10 border border-primary-subtle shadow-sm d-flex align-items-center gap-3 cursor-pointer"
              title="Click to preview & download formal landscape certificate"
            >
              <div className="p-2 rounded-circle bg-primary text-white">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: 10 }}>Scholarship Award</div>
                <div className="fs-6 fw-bold text-primary d-flex align-items-center gap-1">
                  {tier}
                  <span className="badge bg-primary text-white ms-1" style={{ fontSize: 10 }}>View Cert</span>
                </div>
              </div>
            </div>
          </div>

          {/* Candidate & Verification Meta */}
          <div className="row row-cols-2 row-cols-md-4 g-3 py-4 border-bottom text-dark">
            <div>
              <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                <User className="w-4 h-4 text-primary" /> Candidate Name
              </div>
              <div className="fw-bold text-dark">{candidate?.fullName}</div>
            </div>

            <div>
              <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                <Mail className="w-4 h-4 text-primary" /> Email & Phone
              </div>
              <div className="fw-bold text-dark text-truncate">{candidate?.email}</div>
              <div className="small text-muted">{candidate?.phone}</div>
            </div>

            <div>
              <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                <Award className="w-4 h-4 text-primary" /> Assigned Coach
              </div>
              <div className="fw-bold text-dark">{candidate?.coach || 'General'}</div>
            </div>

            <div>
              <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                <FileText className="w-4 h-4 text-primary" /> Certificate ID
              </div>
              <div className="font-monospace fw-bold text-primary small">{submission?.id || 'CERT-N/A'}</div>
            </div>
          </div>

          {/* Score Highlight Grid */}
          <div className="row row-cols-1 row-cols-md-3 g-3 my-4">
            <div className="col">
              <div className="card border-0 bg-light p-4 rounded-3 text-center">
                <div className="small text-muted fw-bold text-uppercase">Total Score</div>
                <div className="fs-1 fw-bold text-primary font-monospace mt-1">
                  {totalScore} <span className="fs-5 text-muted fw-normal">/ {maxScore}</span>
                </div>
                <div className="small text-muted mt-1">{Object.keys(answers).length} / 10 Questions Attempted</div>
              </div>
            </div>

            <div className="col">
              <div className="card border-0 bg-light p-4 rounded-3 text-center">
                <div className="small text-muted fw-bold text-uppercase">Overall Accuracy</div>
                <div className="fs-1 fw-bold text-success font-monospace mt-1">
                  {percentage}%
                </div>
                <div className="small text-muted mt-1">Pass Mark: 60%</div>
              </div>
            </div>

            <div className="col">
              <div className="card border-0 bg-light p-4 rounded-3 text-center">
                <div className="small text-muted fw-bold text-uppercase">Scholarship Benefit</div>
                <div className="fs-2 fw-bold text-primary font-monospace mt-1">
                  {tier.includes('100%') ? '100% OFF' : tier.includes('50%') ? '50% OFF' : tier.includes('25%') ? '25% OFF' : 'Participation'}
                </div>
                <div className="small text-muted mt-1">Valid for Immediate Enrollment</div>
              </div>
            </div>
          </div>

          {/* Domain Breakdown Table */}
          <div className="mt-2">
            <h3 className="small fw-bold text-muted text-uppercase mb-3 d-flex align-items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" />
              Domain Competency Performance
            </h3>

            <div className="d-flex flex-column gap-3">
              {Object.entries(categoryScores).map(([cat, stat]) => (
                <div key={cat} className="p-3 rounded-3 bg-light border">
                  <div className="d-flex align-items-center justify-content-between small fw-bold mb-1.5">
                    <span className="text-dark">{cat}</span>
                    <span className="text-primary font-monospace">
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
          <div className="mt-4 p-3 rounded-3 bg-primary bg-opacity-10 border border-primary-subtle d-flex align-items-center justify-content-between small">
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 rounded-circle bg-primary text-white">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="fw-bold text-primary">Official Scorecard Emailed</div>
                <div className="text-muted">A copy of this scorecard was sent to <strong>{candidate?.email}</strong>.</div>
              </div>
            </div>
            <span className="badge bg-success text-white px-2 py-1">
              <Check className="w-3.5 h-3.5 me-1" /> Dispatched
            </span>
          </div>
        </div>
      </div>

      {/* Answer Key & Explanations Accordion */}
      <div className="mt-4">
        <button
          onClick={() => setShowAnswerKey(!showAnswerKey)}
          className="btn btn-white w-100 p-4 border-0 shadow-sm rounded-4 d-flex align-items-center justify-content-between text-start bg-white"
        >
          <div className="d-flex align-items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="fs-6 fw-bold text-dark">Review Detailed Answers & Solutions ({Object.keys(answers).length} Answered)</span>
          </div>
          {showAnswerKey ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
        </button>

        {showAnswerKey && (
          <div className="d-flex flex-column gap-3 mt-3 animate-fade-in">
            {Object.entries(answers).map(([qId, ansInfo]) => (
              <div
                key={qId}
                className={`p-4 rounded-3 border small ${
                  ansInfo.isCorrect
                    ? 'bg-success bg-opacity-10 border-success-subtle'
                    : 'bg-danger bg-opacity-10 border-danger-subtle'
                }`}
              >
                <div className="d-flex align-items-center justify-content-between fw-bold mb-2">
                  <span className="text-dark">Question #{qId}</span>
                  {ansInfo.isCorrect ? (
                    <span className="text-success d-flex align-items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Correct (+5 Marks)
                    </span>
                  ) : (
                    <span className="text-danger d-flex align-items-center gap-1">
                      <XCircle className="w-4 h-4" /> Incorrect (0 Marks)
                    </span>
                  )}
                </div>

                <div className="text-dark mb-1">
                  Selected Choice: <strong>{ansInfo.selected !== null ? String.fromCharCode(65 + ansInfo.selected) : 'Not Answered'}</strong>
                  {!ansInfo.isCorrect && (
                    <span className="ms-3 text-success">
                      Correct Choice: <strong>{String.fromCharCode(65 + ansInfo.correct)}</strong>
                    </span>
                  )}
                </div>

                {ansInfo.explanation && (
                  <div className="mt-2 pt-2 border-top text-muted small">
                    <strong className="text-dark">Explanation: </strong> {ansInfo.explanation}
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


