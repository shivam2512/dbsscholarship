import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Maximize2, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, ArrowRight, VideoOff } from 'lucide-react';

export default function SystemCheckModal({ candidate, onStartExam, onBack }) {
  const [cameraStatus, setCameraStatus] = useState('pending'); // 'pending', 'granted', 'denied'
  const [micStatus, setMicStatus] = useState('pending');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFullscreenReady, setIsFullscreenReady] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    // Request webcam and microphone
    initMedia();

    return () => {
      // Clean up media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const initMedia = async () => {
    try {
      setPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('granted');
      setMicStatus('granted');

      // Setup Web Audio Analyser for mic volume feedback
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudio);
        };
        updateAudio();
      } catch (audioErr) {
        console.warn('Audio analyser error:', audioErr);
      }
    } catch (err) {
      console.error('Media permission error:', err);
      setCameraStatus('denied');
      setMicStatus('denied');
      setPermissionError('Camera or Microphone access was denied. Please allow permissions in your browser address bar and retry.');
    }
  };

  const handleEnterExam = async () => {
    try {
      // Trigger fullscreen
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request bypassed or blocked:', err);
        });
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
    onStartExam({ stream: streamRef.current });
  };

  return (
    <div className="container py-4" style={{ maxWidth: 840 }}>
      <div className="card border-0 shadow-sm rounded-4 p-4 p-md-5 bg-white">
        {/* Header */}
        <div className="text-center pb-4 mb-4 border-bottom">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary bg-opacity-10 border border-primary-subtle text-primary small fw-bold text-uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" />
            Hardware & Environment Diagnostic
          </div>
          <h2 className="fs-3 fw-bold text-dark mb-1">System Security & Proctoring Pre-Check</h2>
          <p className="text-muted small mb-0">
            Candidate: <strong className="text-primary">{candidate?.fullName}</strong> ({candidate?.email})
          </p>
        </div>

        {/* Media Verification Grid */}
        <div className="row g-4 mb-4">
          {/* Live Video Preview Box */}
          <div className="col-md-6 d-flex flex-column align-items-center">
            <div className="w-100 aspect-video bg-dark rounded-3 overflow-hidden position-relative border shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: 220 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-100 h-100 object-cover ${
                  cameraStatus === 'granted' ? 'd-block' : 'd-none'
                }`}
                style={{ transform: 'scaleX(-1)' }}
              />

              {cameraStatus === 'pending' && (
                <div className="d-flex flex-column align-items-center text-light small">
                  <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                  <span>Connecting to camera...</span>
                </div>
              )}

              {cameraStatus === 'denied' && (
                <div className="d-flex flex-column align-items-center text-danger small p-4 text-center">
                  <VideoOff className="w-8 h-8 mb-2" />
                  <span className="fw-semibold">Camera Access Required</span>
                  <p className="small text-muted mt-1 mb-0">Please allow camera permissions in browser settings.</p>
                </div>
              )}

              {cameraStatus === 'granted' && (
                <div className="position-absolute top-0 start-0 m-2 d-flex align-items-center gap-1.5 px-2 py-1 rounded bg-dark bg-opacity-75 text-success small fw-bold text-uppercase">
                  <span className="pulse-indicator"></span>
                  Face Feed Ready
                </div>
              )}
            </div>

            <div className="w-100 d-flex align-items-center justify-content-between mt-2.5 px-1">
              <span className="small text-muted d-flex align-items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" />
                Webcam Sensor
              </span>
              {cameraStatus === 'granted' ? (
                <span className="small text-success fw-bold d-flex align-items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </span>
              ) : (
                <button
                  onClick={initMedia}
                  className="btn btn-link btn-sm text-primary p-0"
                >
                  Retry Access
                </button>
              )}
            </div>
          </div>

          {/* System Check Status Cards */}
          <div className="col-md-6 d-flex flex-column justify-content-center gap-3">
            {/* Audio Check */}
            <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="small fw-bold text-dark">Microphone Level</div>
                  <div className="progress mt-1.5" style={{ width: 140, height: 6 }}>
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${Math.min(100, audioLevel * 2)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {micStatus === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-danger" />
              )}
            </div>

            {/* Fullscreen Mode */}
            <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="small fw-bold text-dark">Full-Screen Secure Lockdown</div>
                  <div className="small text-muted">Exiting full-screen records a strike</div>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>

            {/* Anti-Cheat Guard */}
            <div className="p-3 rounded-3 bg-light border d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="small fw-bold text-dark">Anti-Cheat Surveillance</div>
                  <div className="small text-muted">Tab switches & devtools strictly blocked</div>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
          </div>
        </div>

        {/* Permission Error Message */}
        {permissionError && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 p-3 rounded-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="small">{permissionError}</span>
          </div>
        )}

        {/* Proctoring Rules Checklist */}
        <div className="bg-light p-4 rounded-3 border mb-4">
          <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-2">
            Mandatory Exam Security Protocol
          </h6>
          <ul className="small text-muted mb-0 ps-3">
            <li className="mb-1">Keep your face clearly positioned in the webcam frame throughout the 20 minutes.</li>
            <li className="mb-1">Do not switch tabs, minimize the browser window, or open search engines.</li>
            <li className="mb-1">No secondary devices (phones, tablets, dual screens) or outside assistance is permitted.</li>
            <li>A total of <strong className="text-danger">3 violation strikes</strong> will result in immediate automatic test submission.</li>
          </ul>

          <div className="form-check mt-3 pt-3 border-top">
            <input
              type="checkbox"
              id="agreeCheck"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="form-check-input"
            />
            <label htmlFor="agreeCheck" className="form-check-label small fw-semibold text-dark cursor-pointer">
              I certify that my camera and mic are working and I agree to adhere to all exam security rules.
            </label>
          </div>
        </div>

        {/* Navigation / Action Buttons */}
        <div className="d-flex align-items-center justify-content-between gap-3 pt-2">
          <button
            onClick={onBack}
            className="btn btn-outline-secondary py-2.5 px-4 fw-semibold"
          >
            &larr; Back to Details
          </button>

          <button
            onClick={handleEnterExam}
            disabled={cameraStatus !== 'granted' || !agreementChecked}
            className="btn btn-primary py-2.5 px-5 fw-bold d-flex align-items-center gap-2 shadow"
          >
            Start Exam in Fullscreen <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
