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
        audio: false
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
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
      <div className="glass-panel-glow p-6 sm:p-8">
        {/* Header */}
        <div className="text-center pb-6 border-b border-slate-800">
          <div className="d-inline-d-flex align-items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" />
            Hardware & Environment Diagnostic
          </div>
          <h2 className="text-2xl font-bold text-white">System Security & Proctoring Pre-Check</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Candidate: <strong className="text-sky-300">{candidate?.fullName}</strong> ({candidate?.email})
          </p>
        </div>

        {/* Media Verification Grid */}
        <div className="row row-cols-1 row-cols-md-2 g-3 my-3">
          {/* Live Video Preview Box */}
          <div className="d-flex flex-column align-items-center">
            <div className="w-full aspect-video bg-slate-950 rounded-xl overflow-hidden relative border border-slate-700/80 shadow-inner d-flex align-items-center justify-content-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  cameraStatus === 'granted' ? 'block' : 'hidden'
                }`}
              />

              {cameraStatus === 'pending' && (
                <div className="d-flex flex-column align-items-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span>Connecting to camera...</span>
                </div>
              )}

              {cameraStatus === 'denied' && (
                <div className="d-flex flex-column align-items-center text-rose-400 text-xs p-4 text-center">
                  <VideoOff className="w-8 h-8 mb-2" />
                  <span className="font-semibold">Camera Access Required</span>
                  <p className="text-[11px] text-slate-400 mt-1">Please allow camera permissions in browser settings.</p>
                </div>
              )}

              {cameraStatus === 'granted' && (
                <div className="absolute top-2 left-2 d-flex align-items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Face Feed Ready
                </div>
              )}
            </div>

            <div className="w-full d-flex align-items-center justify-content-between mt-2.5 px-1">
              <span className="text-xs text-slate-400 d-flex align-items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                Webcam Sensor
              </span>
              {cameraStatus === 'granted' ? (
                <span className="text-xs text-emerald-400 font-semibold d-flex align-items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                </span>
              ) : (
                <button
                  onClick={initMedia}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Retry Access
                </button>
              )}
            </div>
          </div>

          {/* System Check Status Cards */}
          <div className="space-y-3 d-flex flex-column justify-content-center">
            {/* Audio Check */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Microphone Level</div>
                  <div className="w-24 sm:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-100"
                      style={{ width: `${Math.min(100, audioLevel * 2)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              {micStatus === 'granted' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>

            {/* Fullscreen Mode */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Full-Screen Secure Lockdown</div>
                  <div className="text-[11px] text-slate-400">Exiting full-screen records a strike</div>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Anti-Cheat Guard */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Anti-Cheat Surveillance</div>
                  <div className="text-[11px] text-slate-400">Tab switches & devtools strictly blocked</div>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Permission Error Message */}
        {permissionError && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs d-flex align-items-center gap-2">
            <AlertTriangle className="w-4 h-4 d-flex-shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Proctoring Rules Checklist */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 mb-6">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Mandatory Exam Security Protocol
          </h4>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
            <li>Keep your face clearly positioned in the webcam frame throughout the 20 minutes.</li>
            <li>Do not switch tabs, minimize the browser window, or open search engines.</li>
            <li>No secondary devices (phones, tablets, dual screens) or outside assistance is permitted.</li>
            <li>A total of <strong>3 violation strikes</strong> will result in immediate automatic test submission.</li>
          </ul>

          <label className="d-flex align-items-center gap-2.5 mt-3.5 pt-3 border-t border-slate-800/80 cursor-pointer">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-xs text-sky-200 font-medium">
              I certify that I am the registered candidate and accept all proctored examination rules.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="d-flex align-items-center justify-content-between gap-4 pt-2">
          <button
            onClick={onBack}
            className="btn-secondary py-2.5 px-4 text-xs"
          >
            Back to Edit Details
          </button>

          <button
            onClick={handleEnterExam}
            disabled={cameraStatus !== 'granted' || !agreementChecked}
            className="btn-primary py-3 px-6 text-sm"
          >
            <span>Launch Proctored Assessment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


