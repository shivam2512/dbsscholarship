import React, { useState } from 'react';
import Navbar from './components/Navbar';
import RegistrationForm from './components/RegistrationForm';
import SystemCheckModal from './components/SystemCheckModal';
import ExamRoom from './components/ExamRoom';
import Scorecard from './components/Scorecard';
import AdminDashboard from './components/AdminDashboard';
import { api } from './services/api';

export default function App() {
  const [currentView, setView] = useState('register'); // 'register', 'system-check', 'exam', 'scorecard', 'admin'
  const [candidate, setCandidate] = useState(null);
  const [testId, setTestId] = useState(null);
  const [token, setToken] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Candidate Registration Callback
  const handleRegistered = ({ candidate, testId, token, isResume }) => {
    setCandidate(candidate);
    setTestId(testId);
    setToken(token);
    setView('system-check');
  };

  // Launch Exam after System Pre-Check
  const handleStartExam = () => {
    setView('exam');
  };

  // Exam Completed (Score Evaluated)
  const handleExamCompleted = (result) => {
    setSubmissionResult(result);
    setView('scorecard');
  };

  // Resume / View Previous Scorecard by Submission ID
  const handleResumeScorecard = async (submissionId) => {
    try {
      const data = await api.fetchScorecard(submissionId);
      setSubmissionResult(data);
      setCandidate(data.candidate);
      setView('scorecard');
    } catch (err) {
      console.error('Error fetching scorecard:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setView={setView}
        isExamActive={currentView === 'exam'}
        candidate={candidate}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'register' && (
          <RegistrationForm
            onRegistered={handleRegistered}
            onResumeScorecard={handleResumeScorecard}
          />
        )}

        {currentView === 'system-check' && (
          <SystemCheckModal
            candidate={candidate}
            onStartExam={handleStartExam}
            onBack={() => setView('register')}
          />
        )}

        {currentView === 'exam' && (
          <ExamRoom
            candidate={candidate}
            testId={testId}
            token={token}
            onExamCompleted={handleExamCompleted}
          />
        )}

        {currentView === 'scorecard' && (
          <Scorecard
            submissionData={submissionResult}
            candidateData={candidate}
            onRestart={() => {
              setCandidate(null);
              setTestId(null);
              setToken(null);
              setSubmissionResult(null);
              setView('register');
            }}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Footer (hidden during active exam) */}
      {currentView !== 'exam' && (
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Proctored CBT Engine &bull; Version 1.0</span>
            </div>
            <div>
              &copy; {new Date().getFullYear()} IT Career Readiness & Scholarship Assessment. All Rights Reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
