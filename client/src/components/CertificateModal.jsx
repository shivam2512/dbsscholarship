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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 animate-fade-in">
      {/* Top Modal Control Header */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-white">
          <Award className="w-6 h-6 text-amber-400" />
          <h2 className="text-base sm:text-lg font-bold">A4 Official Scholarship Certificate Preview</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="btn-primary py-2.5 px-6 text-sm font-bold shadow-lg flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110"
          >
            <Download className="w-4 h-4 text-slate-950" />
            {isExporting ? 'Downloading PDF...' : 'Download Certificate PDF'}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Formal A4 Landscape Certificate Template Container */}
      <div className="w-full max-w-5xl flex justify-center items-center overflow-x-auto py-2">
        <div
          ref={certRef}
          id="official-a4-certificate"
          className="bg-slate-950 text-white border-4 border-amber-500 relative overflow-hidden shadow-2xl flex flex-col justify-between items-center text-center box-border shrink-0"
          style={{
            width: '1123px',
            height: '794px', // Exact 96 DPI A4 Landscape (297mm x 210mm)
            padding: '40px 48px',
            backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.12) 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, rgba(56, 189, 248, 0.08) 0%, transparent 65%), linear-gradient(135deg, #070b14 0%, #0d1527 100%)'
          }}
        >
          {/* Double Ornate Inner Gold Borders */}
          <div className="absolute inset-4 border-2 border-amber-400/40 rounded-lg pointer-events-none"></div>
          <div className="absolute inset-7 border border-amber-400/20 rounded pointer-events-none"></div>

          {/* Decorative Corner Ornaments */}
          <div className="absolute top-5 left-5 w-11 h-11 border-t-2 border-l-2 border-amber-400 pointer-events-none"></div>
          <div className="absolute top-5 right-5 w-11 h-11 border-t-2 border-r-2 border-amber-400 pointer-events-none"></div>
          <div className="absolute bottom-5 left-5 w-11 h-11 border-b-2 border-l-2 border-amber-400 pointer-events-none"></div>
          <div className="absolute bottom-5 right-5 w-11 h-11 border-b-2 border-r-2 border-amber-400 pointer-events-none"></div>

          {/* Header Banner */}
          <div className="w-full text-center relative z-10 pt-2">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-inner">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-mono font-bold tracking-[0.3em] text-amber-400 uppercase">
                NATIONAL IT CAREER READINESS & SCHOLARSHIP BOARD
              </span>
            </div>

            <h1 className="text-4xl font-black uppercase tracking-wider text-amber-200 font-serif mt-2">
              Certificate of Scholarship & Achievement
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-[0.2em] font-mono mt-1">
              Proctored Computer-Based Assessment &bull; L1 IT Support Role Competency
            </p>
          </div>

          {/* Candidate Recipient Section */}
          <div className="w-full text-center my-2 relative z-10 space-y-2 flex flex-col items-center">
            <p className="text-xs text-slate-300 italic font-serif tracking-widest">This is to officially certify that</p>

            <div className="py-1 border-b-2 border-amber-400/60 inline-block px-14">
              <h2 className="text-4xl sm:text-5xl font-black text-amber-100 font-serif tracking-wide" style={{ color: '#fef08a' }}>
                {fullName}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed pt-2 text-center">
              has successfully qualified in the national proctored assessment for <strong className="text-sky-300 font-semibold">L1 IT Support & Technical Operations</strong>, demonstrating verified excellence across required domain competencies.
            </p>
          </div>

          {/* Award Tier & Performance Ribbon Box (Perfectly Centered) */}
          <div className="w-[860px] bg-slate-900/95 border border-amber-500/50 rounded-xl p-4 flex items-center justify-between gap-6 relative z-10 shadow-xl" style={{ backgroundColor: '#0f172a' }}>
            {/* Left: Honor Tier */}
            <div className="flex items-center gap-3.5 text-left min-w-[280px]">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${badgeInfo.bg} border ${badgeInfo.border} text-white shadow-md shrink-0`}>
                <Award className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <div className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400">Awarded Honor Tier</div>
                <div className="text-base font-black text-amber-300">{tier}</div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-700 shrink-0"></div>

            {/* Center: Marks Scored */}
            <div className="text-center min-w-[180px]">
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Marks Scored</div>
              <div className="text-base font-extrabold text-sky-400 font-mono mt-0.5">
                {score} / {maxScore} <span className="text-xs text-emerald-400 font-normal">({percentage}%)</span>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-700 shrink-0"></div>

            {/* Right: Security Audit */}
            <div className="text-right min-w-[180px]">
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Security Audit</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> AI Verified
              </div>
            </div>
          </div>

          {/* Footer Metadata & Dual Signatures */}
          <div className="w-full pt-4 pb-1 border-t border-slate-800 flex items-end justify-between text-xs relative z-10">
            {/* Left: Certificate Metadata */}
            <div className="text-left space-y-1 text-[10px] text-slate-400" style={{ width: '260px' }}>
              <div>Certificate ID: <strong className="text-sky-300 font-mono">{certId}</strong></div>
              <div>Issue Date: <strong className="text-slate-200">{issueDate}</strong></div>
              <div>Assigned Coach: <strong className="text-slate-200">{coach}</strong></div>
            </div>

            {/* Center: Golden Embossed Seal */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-amber-400 bg-amber-500/15 flex flex-col items-center justify-center text-amber-300 shadow-md">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
                <span className="text-[7px] font-bold font-mono tracking-tighter uppercase mt-0.5">AUTHENTIC</span>
              </div>
            </div>

            {/* Right: Signature Lines */}
            <div className="flex items-center gap-8 text-center" style={{ width: '300px', justifySelf: 'end' }}>
              <div className="flex-1">
                <div className="font-serif italic text-sm font-bold text-slate-200 border-b border-slate-700 pb-0.5 px-2">
                  Sadanand B.
                </div>
                <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Head of Evaluation</div>
              </div>

              <div className="flex-1">
                <div className="font-serif italic text-xs font-bold text-amber-300 border-b border-slate-700 pb-0.5 px-2">
                  Scholarship Board
                </div>
                <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Authorized Signatory</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
