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
    <div className="d-flex flex-column min-vh-100" style={{ background: '#f0f4ff', color: '#0f172a', WebkitUserSelect: 'auto' }}>
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setView={setView}
        isExamActive={currentView === 'exam'}
        candidate={candidate}
      />

      {/* Main View Area */}
      <main className="flex-grow-1">
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
        <footer style={{
          borderTop: '1.5px solid #dce8fb',
          background: 'rgba(255,255,255,0.8)',
          padding: '18px 0',
          textAlign: 'center',
          fontSize: 12,
          color: '#94a3b8'
        }}>
          <div className="container d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
              <span>Proctored CBT Engine &bull; DBS IT Scholarship &bull; v2.0</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              &copy; {new Date().getFullYear()} DBS IT Scholarship Test. All Rights Reserved.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
