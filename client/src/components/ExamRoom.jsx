import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Clock, ShieldAlert, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight,
  Flag, RotateCcw, Send, Maximize2, Camera, Eye, Lock, Volume2, User
} from 'lucide-react';

export default function ExamRoom({ candidate, testId, token, onExamCompleted }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [visited, setVisited] = useState({ 0: true });

  // Timer State (20 mins = 1200 seconds)
  const [timeLeft, setTimeLeft] = useState(1200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Anti-Cheat & Proctoring State
  const [strikeCount, setStrikeCount] = useState(0);
  const [lastViolationMsg, setLastViolationMsg] = useState('');
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // References
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  // Ref mirror of isSubmitting so anti-cheat closures can read current value synchronously
  const isSubmittingRef = useRef(false);

  // 1. Initial Load & Start Test
  useEffect(() => {
    let isMounted = true;

    api.startTest(token, testId)
      .then(data => {
        if (!isMounted) return;
        setQuestions(data.questions || []);
        if (data.currentAnswers) {
          setAnswers(data.currentAnswers);
        }
        if (data.violationsCount) {
          setStrikeCount(data.violationsCount);
        }
      })
      .catch(err => {
        console.error('Error starting test:', err);
        if (err.error && err.error.includes('already been completed')) {
          onExamCompleted({ testId });
        }
      });

    // Start Timer
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleAutoSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Initialize Webcam
    initProctorMedia();

    // Setup Anti-Cheat Listeners
    setupAntiCheatListeners();

    // Periodic Snapshot Uploader (Every 90s)
    snapshotIntervalRef.current = setInterval(() => {
      captureAndUploadSnapshot('routine_audit');
    }, 90000);

    return () => {
      isMounted = false;
      clearInterval(timerIntervalRef.current);
      clearInterval(snapshotIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      removeAntiCheatListeners();
    };
  }, []);

  // 2. Initialize Proctor Media (Camera Only)
  const initProctorMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 360 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsWebcamActive(true);
    } catch (err) {
      console.warn('Webcam initialization failed in exam room:', err);
    }
  };

  // 3. Snapshot Capture Helper
  const captureAndUploadSnapshot = (reason = 'proctor_audit') => {
    if (isSubmittingRef.current || !videoRef.current || !canvasRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob && !isSubmittingRef.current) {
          api.uploadSnapshot(testId, candidate.id, blob, reason);
        }
      }, 'image/jpeg', 0.8);
    } catch (e) {
      console.warn('Snapshot capture error:', e);
    }
  };

  // 4. Record Cheat Violation
  const recordCheatViolation = async (violationType, details) => {
    if (isSubmittingRef.current) return;
    captureAndUploadSnapshot(violationType);
    try {
      const res = await api.recordViolation(token, testId, violationType, details);
      if (res && res.strikeCount) {
        setStrikeCount(res.strikeCount);
        setLastViolationMsg(details || violationType);
        setShowViolationModal(true);

        if (res.shouldDisqualify) {
          handleAutoSubmit('disqualified_excess_violations');
        }
      }
    } catch (e) {
      console.warn('Violation record error:', e);
    }
  };

  // 5. Anti-Cheat Handlers
  const setupAntiCheatListeners = () => {
    // Visibility / Tab Switch
    const handleVisibilityChange = () => {
      if (isSubmittingRef.current) return;
      if (document.hidden) {
        recordCheatViolation('tab_switch', 'Focus lost: Tab switch or window minimized detected');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window Blur
    const handleBlur = () => {
      if (isSubmittingRef.current) return;
      recordCheatViolation('window_blur', 'Window focus lost / multi-tasking attempt');
    };
    window.addEventListener('blur', handleBlur);

    // Fullscreen Exit
    const handleFullscreenChange = () => {
      if (isSubmittingRef.current) return;
      if (!document.fullscreenElement) {
        recordCheatViolation('fullscreen_exit', 'Candidate exited full-screen lockdown mode');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Context Menu (Right Click) Blocker
    const handleContextMenu = (e) => {
      if (isSubmittingRef.current) return;
      e.preventDefault();
      recordCheatViolation('right_click', 'Right-click context menu attempt');
      return false;
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // Keyboard Shortcuts Blocker (F12, Devtools, Copy, Paste)
    const handleKeyDown = (e) => {
      if (isSubmittingRef.current) return;
      // F12 or Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        recordCheatViolation('devtools_attempt', 'Attempted to open Developer Inspection Tools');
        return false;
      }

      // Copy / Paste / Cut / Select All
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Save listeners to window object for cleanup
    window._antiCheatCleanups = {
      handleVisibilityChange,
      handleBlur,
      handleFullscreenChange,
      handleContextMenu,
      handleKeyDown
    };
  };

  const removeAntiCheatListeners = () => {
    if (window._antiCheatCleanups) {
      document.removeEventListener('visibilitychange', window._antiCheatCleanups.handleVisibilityChange);
      window.removeEventListener('blur', window._antiCheatCleanups.handleBlur);
      document.removeEventListener('fullscreenchange', window._antiCheatCleanups.handleFullscreenChange);
      document.removeEventListener('contextmenu', window._antiCheatCleanups.handleContextMenu);
      window.removeEventListener('keydown', window._antiCheatCleanups.handleKeyDown);
    }
  };

  // Re-enter Fullscreen Helper
  const requestReenterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setShowViolationModal(false);
    } catch (e) {
      console.warn('Re-enter fullscreen warning:', e);
      setShowViolationModal(false);
    }
  };

  // 6. Navigation & Question Answers
  const currentQuestion = questions[currentIndex] || {};

  const handleSelectOption = (optionIndex) => {
    const updated = { ...answers, [currentQuestion.id]: optionIndex };
    setAnswers(updated);
    // Autosave
    api.saveProgress(token, testId, updated, 1200 - timeLeft);
  };

  const handleClearResponse = () => {
    const updated = { ...answers };
    delete updated[currentQuestion.id];
    setAnswers(updated);
    api.saveProgress(token, testId, updated, 1200 - timeLeft);
  };

  const handleToggleFlag = () => {
    setFlagged(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  };

  const handleNavigate = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setVisited(prev => ({ ...prev, [index]: true }));
    }
  };

  // 7. Test Submission
  const handleAutoSubmit = async (reason) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);
    removeAntiCheatListeners();
    clearInterval(timerIntervalRef.current);
    clearInterval(snapshotIntervalRef.current);
    try {
      const res = await api.submitTest({
        token,
        testId,
        answers,
        timeSpentSeconds: 1200 - timeLeft,
        isAutoSubmit: true,
        submitReason: reason
      });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      onExamCompleted(res);
    } catch (err) {
      console.error('Submission error:', err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);
    removeAntiCheatListeners();
    clearInterval(timerIntervalRef.current);
    clearInterval(snapshotIntervalRef.current);
    try {
      const res = await api.submitTest({
        token,
        testId,
        answers,
        timeSpentSeconds: 1200 - timeLeft,
        isAutoSubmit: false,
        submitReason: 'candidate_submitted'
      });
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      onExamCompleted(res);
    } catch (err) {
      console.error('Manual submission error:', err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      alert('Submission failed: ' + (err.error || err.message || 'Network error. Please try again.'));
    }
  };

  // Format Time
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stats for palette & confirmation
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="vh-100 bg-slate-950 exam-secure-shield position-relative user-select-none">

      {/* Full-screen Submission Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[200] bg-dark bg-opacity-95 backdrop-blur-xl d-flex flex-column align-items-center justify-content-center gap-3 animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin"></div>
            <div className="absolute inset-0 d-flex align-items-center justify-content-center">
              <Send className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-white">Evaluating Your Assessment</h2>
            <p className="text-slate-400 mt-2 text-sm">Scoring answers &amp; generating your official scorecardâ€¦</p>
          </div>
          <div className="d-flex align-items-center gap-3 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Proctoring logs sealed &bull; Do not close this window</span>
          </div>
        </div>
      )}
      {/* Hidden Canvas for Snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Security Background Watermark */}
      <div className="security-watermark">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="p-4">
            {candidate?.fullName} &bull; {candidate?.email} &bull; {testId.slice(0, 8)}
          </div>
        ))}
      </div>

      {/* Floating Webcam Proctor Monitor */}
      <div className="floating-proctor-box">
        <div className="relative aspect-video bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <div className="absolute top-2 left-2 d-flex align-items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE PROCTOR
          </div>
          <div className="absolute bottom-2 right-2 d-flex align-items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-sky-300">
            <Volume2 className="w-3 h-3" />
            <span>{audioLevel}%</span>
          </div>
        </div>
        <div className="p-2 bg-dark d-flex align-items-center justify-content-between text-[11px] text-muted">
          <span className="d-flex align-items-center gap-1 text-emerald-400 font-medium">
            <Eye className="w-3 h-3" /> Face In-Frame
          </span>
          <span className={`font-bold font-mono ${strikeCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            Strikes: {strikeCount}/3
          </span>
        </div>
      </div>

      {/* Main CBT Container */}
      <div className="container mx-auto px-4 py-4">
        {/* Top Assessment Control Bar */}
        <div className="glass-panel p-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          {/* Candidate & Test Info */}
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white d-flex align-items-center gap-2">
                {candidate?.fullName}
                <span className="text-[11px] font-normal text-slate-400 font-mono">({candidate?.email})</span>
              </h2>
              <div className="d-flex align-items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Coach: <strong className="text-sky-300">{candidate?.coach || 'General'}</strong></span>
                <span>&bull;</span>
                <span className="text-emerald-400 d-flex align-items-center gap-1">
                  <Lock className="w-3 h-3" /> CBT Single-Attempt Active
                </span>
              </div>
            </div>
          </div>

          {/* Strikes & Countdown Timer */}
          <div className="d-flex align-items-center gap-4">
            {/* Strike Indicator */}
            {strikeCount > 0 && (
              <div className="d-flex align-items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Security Strikes: {strikeCount}/3</span>
              </div>
            )}

            {/* Countdown Clock */}
            <div className={`d-flex align-items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-lg shadow-lg ${
              timeLeft < 180
                ? 'bg-rose-950/50 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-900 border-sky-500/30 text-sky-300'
            }`}>
              <Clock className="w-5 h-5" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="btn btn-danger btn-sm fw-bold shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Test</span>
            </button>
          </div>
        </div>

        {/* 2-Column CBT Layout: Question Area (Left) + Question Palette (Right) */}
        <div className="row gx-3 align-items-start">
          {/* Left: Active Question Viewer */}
          <div className="col-lg-8 mb-3">
            <div className="glass-panel-glow p-6 sm:p-8 min-h-[480px] d-flex flex-column justify-content-between">
              {/* Question Header */}
              <div>
                <div className="d-flex align-items-center justify-content-between pb-4 border-b border-slate-800">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/20">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {currentQuestion.category || 'General'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    +{currentQuestion.points || 2} Marks
                  </span>
                </div>

                {/* Question Text */}
                <div className="py-6">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed">
                    {currentQuestion.question}
                  </h3>
                </div>

                {/* Options List */}
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const isSelected = answers[currentQuestion.id] === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`cbt-option ${isSelected ? 'selected' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-full d-flex align-items-center justify-content-center font-bold text-xs border ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-6 mt-6 border-t border-slate-800/80 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={handleToggleFlag}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border d-flex align-items-center gap-1.5 transition-all ${
                      flagged[currentQuestion.id]
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {flagged[currentQuestion.id] ? 'Flagged for Review' : 'Mark for Review'}
                  </button>

                  {answers[currentQuestion.id] !== undefined && (
                    <button
                      onClick={handleClearResponse}
                      className="text-xs text-slate-400 hover:text-rose-400 px-3 py-2 d-flex align-items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear Choice
                    </button>
                  )}
                </div>

                <div className="d-flex align-items-center gap-3">
                  <button
                    onClick={() => handleNavigate(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    onClick={() => handleNavigate(currentIndex + 1)}
                    disabled={currentIndex === questions.length - 1}
                    className="btn-primary py-2 px-4 text-xs"
                  >
                    Next Question
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Question Palette & Overview */}
          <div className="col-lg-4 mb-3">
            <div className="glass-panel p-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Question Navigation Matrix
              </h4>

              {/* Status Legend */}
              <div className="row row-cols-2 g-2 text-muted mb-3 pb-3 border-bottom border-secondary">
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span>Review ({flaggedCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700"></span>
                  <span>Unanswered ({unansweredCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded border-2 border-sky-400"></span>
                  <span>Current</span>
                </div>
              </div>

              {/* Number Matrix */}
              <div className="row row-cols-5 g-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flagged[q.id];

                  let bgClass = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
                  if (isAnswered) {
                    bgClass = 'bg-emerald-600 text-white font-bold border-emerald-500';
                  } else if (isFlagged) {
                    bgClass = 'bg-amber-600 text-white font-bold border-amber-500';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleNavigate(idx)}
                      className={`h-10 rounded-lg text-xs font-semibold d-flex align-items-center justify-content-center border transition-all ${bgClass} ${
                        isCurrent ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950 scale-105' : 'hover:brightness-125'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Quick Submit Block */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={isSubmitting}
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                >
                  <Send className="w-3.5 h-3.5" />
                  Review & Final Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Alert Modal */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md d-flex align-items-center justify-content-center p-4">
          <div className="glass-panel-glow border-amber-500 max-w-md w-full p-6 text-center animate-fade-in bg-amber-950/40">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 d-flex align-items-center justify-content-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Security Violation Flagged</h3>
            <p className="text-xs text-amber-200 mt-2 font-medium">
              {lastViolationMsg}
            </p>
            <div className="my-4 p-3 bg-black/40 rounded-xl border border-amber-500/30">
              <div className="text-xs text-slate-300">
                Strike Count: <strong className="text-amber-400 text-sm">{strikeCount} of 3</strong>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Accumulating 3 strikes results in immediate disqualification and auto-submission.
              </div>
            </div>

            <button
              onClick={requestReenterFullscreen}
              className="btn-primary w-full py-2.5 text-xs font-bold"
            >
              <Maximize2 className="w-4 h-4" />
              Return to Exam in Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Final Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md d-flex align-items-center justify-content-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-2">Final Submission Confirmation</h3>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to submit your assessment? Once submitted, answers are permanently locked and scorecard will be generated.
            </p>

            <div className="row row-cols-3 g-3 p-4 bg-dark bg-opacity-80 rounded border border-secondary mb-6 text-center">
              <div>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">{answeredCount}</div>
                <div className="text-[11px] text-slate-400 uppercase">Answered</div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-amber-400 font-mono">{flaggedCount}</div>
                <div className="text-[11px] text-slate-400 uppercase">Review</div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-rose-400 font-mono">{unansweredCount}</div>
                <div className="text-[11px] text-slate-400 uppercase">Unanswered</div>
              </div>
            </div>

            <div className="d-flex align-items-center justify-end gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                disabled={isSubmitting}
                className="btn-secondary py-2.5 px-4 text-xs"
              >
                Continue Assessment
              </button>

              <button
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="btn-danger py-2.5 px-6 text-xs font-bold"
              >
                {isSubmitting ? 'Evaluating & Generating...' : 'Confirm & Finalize Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


