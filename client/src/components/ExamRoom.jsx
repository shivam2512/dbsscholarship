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
    <div className="min-vh-100 bg-light exam-secure-shield position-relative user-select-none pb-5">

      {/* Full-screen Submission Loading Overlay */}
      {isSubmitting && (
        <div className="position-fixed top-0 start-0 w-100 h-100 z-3 bg-white bg-opacity-95 d-flex flex-column align-items-center justify-content-center gap-3 animate-fade-in">
          <div className="spinner-border text-primary" style={{ width: '3.5rem', height: '3.5rem' }} role="status"></div>
          <div className="text-center">
            <h2 className="fs-3 fw-bold text-dark mb-1">Evaluating Your Assessment</h2>
            <p className="text-muted small">Scoring answers &amp; generating your official scorecard…</p>
          </div>
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span className="pulse-indicator"></span>
            <span>Proctoring logs sealed • Do not close this window</span>
          </div>
        </div>
      )}
      {/* Hidden Canvas for Snapshots */}
      <canvas ref={canvasRef} className="d-none" />

      {/* Security Background Watermark */}
      <div className="security-watermark">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="p-4">
            {candidate?.fullName} • {candidate?.email} • {testId.slice(0, 8)}
          </div>
        ))}
      </div>

      {/* Floating Webcam Proctor Monitor */}
      <div className="floating-proctor-box shadow-sm rounded-3 overflow-hidden border bg-white">
        <div className="position-relative aspect-video bg-dark">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-100 h-100 object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <div className="position-absolute top-0 start-0 m-1.5 px-2 py-0.5 rounded bg-dark bg-opacity-75 text-success small fw-bold" style={{ fontSize: 10 }}>
            <span className="pulse-indicator me-1"></span>
            LIVE PROCTOR
          </div>
          <div className="position-absolute bottom-0 end-0 m-1.5 px-2 py-0.5 rounded bg-dark bg-opacity-75 text-light small d-flex align-items-center gap-1" style={{ fontSize: 10 }}>
            <Volume2 className="w-3 h-3" />
            <span>{audioLevel}%</span>
          </div>
        </div>
        <div className="p-2 bg-light d-flex align-items-center justify-content-between border-top small" style={{ fontSize: 11 }}>
          <span className="d-flex align-items-center gap-1 text-success fw-bold">
            <Eye className="w-3 h-3" /> Face In-Frame
          </span>
          <span className={`fw-bold font-monospace ${strikeCount > 0 ? 'text-danger' : 'text-muted'}`}>
            Strikes: {strikeCount}/3
          </span>
        </div>
      </div>

      {/* Main CBT Container */}
      <div className="container py-3">
        {/* Top Assessment Control Bar */}
        <div className="card border-0 shadow-sm rounded-3 p-3 mb-3 bg-white">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Candidate & Test Info */}
            <div className="d-flex align-items-center gap-3">
              <div className="p-2.5 rounded-3 bg-primary bg-opacity-10 text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="fs-6 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  {candidate?.fullName}
                  <span className="small text-muted font-monospace fw-normal">({candidate?.email})</span>
                </h2>
                <div className="d-flex align-items-center gap-2 small text-muted mt-0.5">
                  <span>Coach: <strong className="text-primary">{candidate?.coach || 'General'}</strong></span>
                  <span>•</span>
                  <span className="text-success d-flex align-items-center gap-1 fw-semibold">
                    <Lock className="w-3 h-3" /> Single Attempt Active
                  </span>
                </div>
              </div>
            </div>

            {/* Strikes & Countdown Timer */}
            <div className="d-flex align-items-center gap-3">
              {/* Strike Indicator */}
              {strikeCount > 0 && (
                <div className="px-3 py-1.5 rounded-3 bg-danger bg-opacity-10 border border-danger-subtle text-danger small fw-bold d-flex align-items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Strikes: {strikeCount}/3</span>
                </div>
              )}

              {/* Countdown Clock */}
              <div className={`d-flex align-items-center gap-2 px-3 py-1.5 rounded-3 border font-monospace fw-bold fs-5 ${
                timeLeft < 180
                  ? 'bg-danger text-white border-danger animate-pulse'
                  : 'bg-primary bg-opacity-10 text-primary border-primary-subtle'
              }`}>
                <Clock className="w-5 h-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={isSubmitting}
                className="btn btn-danger btn-sm fw-bold px-3 py-2"
              >
                <Send className="w-4 h-4 me-1" />
                <span>Submit</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column CBT Layout: Question Area (Left) + Question Palette (Right) */}
        <div className="row g-3 align-items-start">
          {/* Left: Active Question Viewer */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white min-h-[480px] d-flex flex-column justify-content-between">
              {/* Question Header */}
              <div>
                <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary px-3 py-1.5 rounded-pill fs-6">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="badge bg-light text-secondary border px-2.5 py-1.5 rounded-pill">
                      {currentQuestion.category || 'General'}
                    </span>
                  </div>
                  <span className="badge bg-success bg-opacity-10 text-success border border-success-subtle px-2.5 py-1.5 rounded-pill fw-bold">
                    +{currentQuestion.points || 5} Marks
                  </span>
                </div>

                {/* Question Text */}
                <div className="py-3">
                  <h3 className="fs-5 fw-bold text-dark lh-base mb-0">
                    {currentQuestion.question}
                  </h3>
                </div>

                {/* Options List */}
                <div className="d-flex flex-column gap-2.5 mt-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const isSelected = answers[currentQuestion.id] === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`cbt-option ${isSelected ? 'selected' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-circle d-flex align-items-center justify-content-center fw-bold small border flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white border-secondary text-muted'
                        }`} style={{ width: 32, height: 32 }}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`fs-6 ${isSelected ? 'text-primary fw-bold' : 'text-dark'}`}>
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-4 mt-4 border-top d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={handleToggleFlag}
                    className={`btn btn-sm ${
                      flagged[currentQuestion.id]
                        ? 'btn-warning text-dark'
                        : 'btn-outline-secondary'
                    } d-flex align-items-center gap-1.5`}
                  >
                    <Flag className="w-4 h-4" />
                    {flagged[currentQuestion.id] ? 'Flagged for Review' : 'Mark for Review'}
                  </button>

                  {answers[currentQuestion.id] !== undefined && (
                    <button
                      onClick={handleClearResponse}
                      className="btn btn-link btn-sm text-danger text-decoration-none d-flex align-items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear Choice
                    </button>
                  )}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    onClick={() => handleNavigate(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="btn btn-outline-secondary btn-sm px-3 py-2 fw-semibold"
                  >
                    <ChevronLeft className="w-4 h-4 me-1" />
                    Previous
                  </button>

                  <button
                    onClick={() => handleNavigate(currentIndex + 1)}
                    disabled={currentIndex === questions.length - 1}
                    className="btn btn-primary btn-sm px-4 py-2 fw-bold d-flex align-items-center gap-1"
                  >
                    Next Question
                    <ChevronRight className="w-4 h-4 ms-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Question Palette & Overview */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
              <h4 className="small fw-bold text-dark text-uppercase tracking-wider mb-3">
                Question Navigation Matrix
              </h4>

              {/* Status Legend */}
              <div className="row row-cols-2 g-2 small text-muted mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-success" style={{ width: 12, height: 12 }}></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-warning" style={{ width: 12, height: 12 }}></span>
                  <span>Review ({flaggedCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-light border" style={{ width: 12, height: 12 }}></span>
                  <span>Unanswered ({unansweredCount})</span>
                </div>
                <div className="d-flex align-items-center gap-1.5">
                  <span className="w-3 h-3 rounded border-2 border-primary" style={{ width: 12, height: 12 }}></span>
                  <span>Current</span>
                </div>
              </div>

              {/* Number Matrix */}
              <div className="row row-cols-5 g-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flagged[q.id];

                  let btnClass = 'btn-outline-secondary';
                  if (isAnswered) {
                    btnClass = 'btn-success text-white fw-bold';
                  } else if (isFlagged) {
                    btnClass = 'btn-warning text-dark fw-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleNavigate(idx)}
                      className={`btn btn-sm ${btnClass} ${
                        isCurrent ? 'border-primary border-3 shadow-sm scale-105' : ''
                      } py-2 fw-bold`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Quick Submit Block */}
              <div className="mt-4 pt-3 border-top">
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={isSubmitting}
                  className="btn btn-primary w-100 py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Review & Final Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Alert Modal */}
      {showViolationModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-warning shadow-lg text-center p-4 rounded-4">
              <div className="w-12 h-12 rounded-circle bg-warning bg-opacity-20 text-warning d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: 48, height: 48 }}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="fs-5 fw-bold text-dark">Security Violation Flagged</h3>
              <p className="small text-danger mt-2 fw-medium">
                {lastViolationMsg}
              </p>
              <div className="my-3 p-3 bg-light rounded-3 border">
                <div className="small text-dark">
                  Strike Count: <strong className="text-danger fs-6">{strikeCount} of 3</strong>
                </div>
                <div className="small text-muted mt-1" style={{ fontSize: 11 }}>
                  Accumulating 3 strikes results in immediate disqualification and auto-submission.
                </div>
              </div>

              <button
                onClick={requestReenterFullscreen}
                className="btn btn-primary w-100 py-2.5 fw-bold"
              >
                <Maximize2 className="w-4 h-4 me-1" />
                Return to Exam in Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg p-4 rounded-4">
              <h3 className="fs-5 fw-bold text-dark mb-1">Final Submission Confirmation</h3>
              <p className="small text-muted mb-4">
                Are you sure you want to submit your assessment? Once submitted, answers are permanently locked and scorecard will be generated.
              </p>

              <div className="row row-cols-3 g-2 p-3 bg-light rounded-3 border mb-4 text-center">
                <div>
                  <div className="fs-4 fw-extrabold text-success font-monospace">{answeredCount}</div>
                  <div className="small text-muted text-uppercase" style={{ fontSize: 10 }}>Answered</div>
                </div>
                <div>
                  <div className="fs-4 fw-extrabold text-warning font-monospace">{flaggedCount}</div>
                  <div className="small text-muted text-uppercase" style={{ fontSize: 10 }}>Review</div>
                </div>
                <div>
                  <div className="fs-4 fw-extrabold text-danger font-monospace">{unansweredCount}</div>
                  <div className="small text-muted text-uppercase" style={{ fontSize: 10 }}>Unanswered</div>
                </div>
              </div>

              <div className="d-flex align-items-center justify-content-end gap-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  className="btn btn-outline-secondary py-2 px-3 small"
                >
                  Continue Assessment
                </button>

                <button
                  onClick={handleManualSubmit}
                  disabled={isSubmitting}
                  className="btn btn-danger py-2 px-4 small fw-bold"
                >
                  {isSubmitting ? 'Evaluating...' : 'Confirm Submission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


