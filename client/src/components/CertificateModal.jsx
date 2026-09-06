import React, { useRef, useState } from 'react';
import { Award, Download, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function CertificateModal({ candidate, submission, onClose }) {
  const certRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const fullName = candidate?.fullName || 'Candidate Name';
  const score = submission?.totalScore || 0;
  const maxScore = submission?.maxScore || 50;
  const percentage = submission?.percentage || 0;
  const tier = submission?.scholarshipTier || 'Certificate of Participation';
  const certId = submission?.id || 'CERT-OFFICIAL';
  const coach = candidate?.coach || 'Direct / None';
  const issueDate = submission?.submittedAt
    ? new Date(submission.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Get accent color based on tier
  const getBadgeStyle = (t) => {
    if (t.includes('Platinum')) return { bg: 'from-purple-600 to-indigo-700', border: 'border-purple-400', text: '#e9d5ff' };
    if (t.includes('Gold')) return { bg: 'from-amber-500 to-yellow-600', border: 'border-amber-400', text: '#fef08a' };
    if (t.includes('Silver')) return { bg: 'from-cyan-600 to-sky-700', border: 'border-cyan-400', text: '#cffafe' };
    return { bg: 'from-slate-700 to-slate-800', border: 'border-slate-500', text: '#e2e8f0' };
  };

  const badgeInfo = getBadgeStyle(tier);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('official-a4-certificate');
    if (!element) return;
    setIsExporting(true);
    try {
      // Capture exact 1123px x 794px A4 node using native browser canvas
      const dataUrl = await toPng(element, {
        width: 1123,
        height: 794,
        pixelRatio: 2,
        cacheBust: true,
      });

      // Create Landscape A4 PDF (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Fit PNG exactly onto 297mm x 210mm A4 canvas with 0 margins
      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(`Scholarship_Certificate_${fullName.replace(/\s+/g, '_')}_${certId}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Error generating PDF: ' + (err.message || 'Please try again.'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', zIndex: 1050 }} tabIndex="-1">
      <div className="container-fluid min-vh-100 d-flex flex-column align-items-center justify-content-start py-4 overflow-y-auto">
        {/* Top Modal Control Header */}
        <div className="w-100 d-flex align-items-center justify-content-between gap-3 mb-3 text-white px-2" style={{ maxWidth: 1123 }}>
          <div className="d-flex align-items-center gap-2">
            <Award className="w-6 h-6 text-warning" />
            <h2 className="fs-5 fw-bold text-white mb-0">DBS IT PUNE — A4 Official Scholarship Certificate</h2>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="btn btn-warning py-2 px-4 fw-bold shadow-sm d-flex align-items-center gap-2 text-dark"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Downloading PDF...' : 'Download Certificate PDF'}
            </button>

            <button
              onClick={onClose}
              className="btn btn-outline-light btn-sm p-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal A4 Landscape Certificate Template Container (LIGHT THEME) */}
        <div className="w-100 d-flex justify-content-center align-items-center overflow-x-auto py-2">
          <div
            ref={certRef}
            id="official-a4-certificate"
            className="bg-white text-dark border-4 position-relative overflow-hidden shadow-2xl d-flex flex-column justify-content-between align-items-center text-center box-border shrink-0"
            style={{
              width: '1123px',
              height: '794px', // Exact 96 DPI A4 Landscape (297mm x 210mm)
              padding: '38px 48px',
              borderColor: '#1d4ed8',
              backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(29, 78, 216, 0.05) 0%, transparent 70%), radial-gradient(ellipse at 50% 100%, rgba(217, 119, 6, 0.04) 0%, transparent 70%), #ffffff'
            }}
          >
            {/* Triple Ornate Inner Gold & Blue Borders */}
            <div className="position-absolute" style={{ inset: '12px', border: '2px solid #d97706', borderRadius: '8px', pointerEvents: 'none' }}></div>
            <div className="position-absolute" style={{ inset: '18px', border: '1px solid #93c5fd', borderRadius: '6px', pointerEvents: 'none' }}></div>

            {/* Decorative Corner Ornaments */}
            <div className="position-absolute" style={{ top: 22, left: 22, width: 36, height: 36, borderTop: '3px solid #1d4ed8', borderLeft: '3px solid #1d4ed8', pointerEvents: 'none' }}></div>
            <div className="position-absolute" style={{ top: 22, right: 22, width: 36, height: 36, borderTop: '3px solid #1d4ed8', borderRight: '3px solid #1d4ed8', pointerEvents: 'none' }}></div>
            <div className="position-absolute" style={{ bottom: 22, left: 22, width: 36, height: 36, borderBottom: '3px solid #1d4ed8', borderLeft: '3px solid #1d4ed8', pointerEvents: 'none' }}></div>
            <div className="position-absolute" style={{ bottom: 22, right: 22, width: 36, height: 36, borderBottom: '3px solid #1d4ed8', borderRight: '3px solid #1d4ed8', pointerEvents: 'none' }}></div>

            {/* Header Banner */}
            <div className="w-100 text-center position-relative z-1 pt-1">
              <div className="d-flex align-items-center justify-content-center gap-2.5 mb-1">
                <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', color: '#ffffff' }}>
                  <Award style={{ width: 22, height: 22 }} />
                </div>
                <div className="text-start">
                  <span className="fw-black text-primary text-uppercase d-block" style={{ fontSize: 20, letterSpacing: '0.12em', fontFamily: '"Outfit", sans-serif', lineHeight: 1.1 }}>
                    DBS IT PUNE
                  </span>
                  <span className="fw-bold text-warning text-uppercase font-monospace d-block" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
                    IT Career Readiness &amp; Scholarship Assessment
                  </span>
                </div>
              </div>

              <div className="my-2" style={{ borderBottom: '2px solid #d97706', width: '280px', margin: '0 auto' }}></div>

              <h1 className="fw-extrabold uppercase text-dark font-serif mt-2" style={{ fontSize: 32, letterSpacing: '0.04em', color: '#0f172a' }}>
                Certificate of Scholarship &amp; Excellence
              </h1>
              <p className="small text-muted uppercase font-monospace mt-1 mb-0" style={{ letterSpacing: '0.15em', fontSize: 11 }}>
                Proctored Computer-Based Assessment • IT Carrier Transition Program
              </p>
            </div>

            {/* Candidate Recipient Section */}
            <div className="w-100 text-center my-2 position-relative z-1 d-flex flex-column align-items-center">
              <p className="small text-muted italic font-serif" style={{ fontSize: 14, letterSpacing: '0.1em' }}>
                This is to officially certify that
              </p>

              <div className="py-1 border-bottom border-primary border-3 inline-block px-5 mb-2">
                <h2 className="display-6 fw-black text-primary font-serif tracking-wide mb-0" style={{ fontSize: 40, color: '#1d4ed8', fontFamily: '"Outfit", serif' }}>
                  {fullName}
                </h2>
              </div>

              <p className="small text-secondary max-w-2xl mx-auto leading-relaxed pt-1 text-center" style={{ maxWidth: 740, fontSize: 13.5 }}>
                has successfully qualified in the national proctored assessment conducted by <strong className="text-primary fw-bold">DBS IT PUNE</strong> for <strong className="text-dark fw-bold">IT Carrier Transition Program</strong>, demonstrating verified technical proficiency and domain excellence across required competency modules.
              </p>
            </div>

            {/* Award Tier & Performance Ribbon Box (Clean Light Theme) */}
            <div className="w-100 rounded-3 p-3 d-flex align-items-center justify-content-between gap-4 position-relative z-1 shadow-sm border" style={{ maxWidth: 880, backgroundColor: '#f8faff', borderColor: '#dce8fb' }}>
              {/* Left: Honor Tier */}
              <div className="d-flex align-items-center gap-3 text-start min-w-[260px]">
                <div className="p-2.5 rounded-3 bg-primary text-white shadow-sm flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: 9, letterSpacing: '0.08em' }}>Awarded Honor Tier</div>
                  <div className="fs-6 fw-bold text-primary">{tier}</div>
                </div>
              </div>

              <div className="vr bg-secondary opacity-25" style={{ height: 36 }}></div>

              {/* Center: Marks Scored */}
              <div className="text-center min-w-[180px]">
                <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: 9, letterSpacing: '0.08em' }}>Score Scored</div>
                <div className="fs-6 fw-bold text-dark font-monospace mt-0.5">
                  {score} / {maxScore} <span className="small text-success font-normal">({percentage}%)</span>
                </div>
              </div>

              <div className="vr bg-secondary opacity-25" style={{ height: 36 }}></div>

              {/* Right: Security Audit */}
              <div className="text-end min-w-[180px]">
                <div className="small text-muted text-uppercase fw-bold" style={{ fontSize: 9, letterSpacing: '0.08em' }}>Security Audit</div>
                <div className="small fw-bold text-success d-flex align-items-center justify-content-end gap-1 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" /> AI Proctor Verified
                </div>
              </div>
            </div>

            {/* Footer Metadata & Dual Signatures */}
            <div className="w-100 pt-3 pb-1 border-top d-flex align-items-end justify-content-between small position-relative z-1" style={{ borderColor: '#e2e8f0' }}>
              {/* Left: Certificate Metadata */}
              <div className="text-start text-muted" style={{ width: 270, fontSize: 10.5 }}>
                <div>Certificate ID: <strong className="text-primary font-monospace">{certId}</strong></div>
                <div>Issue Date: <strong className="text-dark">{issueDate}</strong></div>
                <div>Career Coach: <strong className="text-dark">{coach}</strong></div>
                <div>Institute Code: <strong className="text-dark">DBS-IT-INST-2025</strong></div>
              </div>

              {/* Center: Official Golden/Blue Stamp Seal */}
              <div className="d-flex flex-column align-items-center justify-content-center">
                <div className="rounded-circle border border-primary bg-primary bg-opacity-10 d-flex flex-column align-items-center justify-content-center text-primary shadow-sm" style={{ width: 56, height: 56 }}>
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  <span className="fw-bold font-monospace text-uppercase" style={{ fontSize: 6.5, letterSpacing: '0.05em' }}>DBS VERIFIED</span>
                </div>
              </div>

              {/* Right: Signature Lines */}
              <div className="d-flex align-items-center gap-4 text-center" style={{ width: 320 }}>
                <div className="flex-fill">
                    <div className="font-serif italic fs-6 fw-bold text-dark border-bottom border-dark pb-1 px-2">
                      Biplob Mandal
                    </div>
                    <div className="text-muted mt-1 uppercase fw-semibold" style={{ fontSize: 9, letterSpacing: '0.05em' }}>
                      Head of Evaluation
                    </div>
                    <div className="text-primary fw-bold" style={{ fontSize: 8 }}>DBS IT PUNE</div>
                </div>

                <div className="flex-fill">
                  <div className="font-serif italic fs-6 fw-bold text-primary border-bottom border-primary pb-1 px-2">
                    Scholarship Board
                  </div>
                  <div className="text-muted mt-1 uppercase fw-semibold" style={{ fontSize: 9, letterSpacing: '0.05em' }}>Authorized Signatory</div>
                  <div className="text-primary fw-bold" style={{ fontSize: 8 }}>DBS IT PUNE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
