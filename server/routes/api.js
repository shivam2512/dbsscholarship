const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const store = require('../store');
const googleSheets = require('../googleSheets');
const { questions, coaches } = require('../data/questions');
const { sendScorecardEmail } = require('../mailer');

// Multer Storage Configuration for Webcam Proctor Snapshots
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
      ? path.join('/tmp', 'uploads')
      : path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'proctor-' + uniqueSuffix + '.jpg');
  }
});
const upload = multer({ storage: storage });

// 1. Health check & Coaches List
router.get('/health', (req, res) => {
  const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
  res.json({
    status: 'ok',
    mode: 'Google Sheets (Zero Database)',
    questionsCount: questions.length,
    maxScore,
    coachesCount: coaches.length,
    googleSheets: googleSheets.getStatus(),
    timestamp: new Date()
  });
});

router.get('/coaches', (req, res) => {
  res.json({ coaches });
});

router.get('/google-sheets/status', (req, res) => {
  res.json(googleSheets.getStatus());
});

// 2. Candidate Registration & Strict One-Time Attempt Enforcement
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, college, experience, coach } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: 'Name, Email, and Phone number are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if candidate exists and has already completed test
    const existingCandidate = store.getCandidateByEmail(normalizedEmail);

    if (existingCandidate) {
      const completedTest = store.getCompletedTestByCandidateId(existingCandidate.id);

      if (completedTest) {
        const submission = store.getSubmissionByTestId(completedTest.id);
        return res.status(403).json({
          error: 'One-Time Attempt Limit Reached. You have already completed this scholarship assessment.',
          isAttempted: true,
          candidate: existingCandidate,
          testId: completedTest.id,
          submissionId: submission ? submission.id : null
        });
      }

      // Check if there is an active incomplete test to resume
      let activeTest = store.getActiveTestByCandidateId(existingCandidate.id);

      if (!activeTest) {
        const testId = uuidv4();
        const token = uuidv4();
        activeTest = store.saveTest({
          id: testId,
          candidateId: existingCandidate.id,
          token,
          status: 'in_progress',
          timeSpentSeconds: 0,
          currentAnswers: {}
        });
      }

      return res.json({
        success: true,
        candidate: existingCandidate,
        testId: activeTest.id,
        token: activeTest.token,
        isResume: true
      });
    }

    // Register new candidate
    const candidateId = uuidv4();
    const newCandidate = store.saveCandidate({
      id: candidateId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      college: college ? college.trim() : '',
      experience: experience || 'Fresher / Student',
      coach: coach || coaches[0] || 'Direct / None',
      status: 'registered'
    });

    const testId = uuidv4();
    const token = uuidv4();
    store.saveTest({
      id: testId,
      candidateId: candidateId,
      token,
      status: 'in_progress',
      timeSpentSeconds: 0,
      currentAnswers: {}
    });

    // Log registration directly to Google Sheet
    try {
      await googleSheets.appendCandidate(newCandidate);
    } catch (err) {
      console.warn('Google Sheet Registration Sync Notice:', err.message);
    }

    res.json({
      success: true,
      candidate: newCandidate,
      testId,
      token,
      isResume: false
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

// 3. Start Assessment Session & Fetch Cleaned Questions (No client-side answer leaking)
router.post('/start-test', (req, res) => {
  try {
    const { token, testId } = req.body;
    if (!token || !testId) {
      return res.status(400).json({ error: 'Token and testId are required.' });
    }

    const test = store.getTestByIdAndToken(testId, token);
    if (!test) {
      return res.status(404).json({ error: 'Test session not found or invalid token.' });
    }

    if (test.status === 'completed') {
      return res.status(403).json({ error: 'This test has already been completed.' });
    }

    const candidate = store.getCandidateById(test.candidateId);

    // Strip answers from questions payload sent to client
    const safeQuestions = questions.map(q => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options,
      points: q.points
    }));

    const currentAnswers = test.currentAnswers || {};
    const violations = store.getViolationsByTestId(testId);

    res.json({
      success: true,
      candidate,
      questions: safeQuestions,
      currentAnswers,
      startedAt: test.startedAt,
      timeLimitMinutes: 20,
      violationsCount: violations.length
    });
  } catch (error) {
    console.error('Start Test Error:', error);
    res.status(500).json({ error: 'Error starting test: ' + error.message });
  }
});

// 4. Autosave Progress
router.post('/save-progress', (req, res) => {
  try {
    const { token, testId, answers, timeSpentSeconds } = req.body;
    if (!token || !testId) {
      return res.status(400).json({ error: 'Token and testId required.' });
    }

    const test = store.getTestByIdAndToken(testId, token);
    if (!test || test.status === 'completed') {
      return res.status(403).json({ error: 'Invalid test session or already completed.' });
    }

    store.updateTest(testId, {
      currentAnswers: answers || {},
      timeSpentSeconds: timeSpentSeconds || 0
    });

    res.json({ success: true, message: 'Progress saved' });
  } catch (error) {
    console.error('Autosave Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Record Security / Proctoring Violation
router.post('/violation', async (req, res) => {
  try {
    const { token, testId, violationType, details } = req.body;
    if (!token || !testId) {
      return res.status(400).json({ error: 'Token and testId required.' });
    }

    const test = store.getTestByIdAndToken(testId, token);
    if (!test) {
      return res.status(404).json({ error: 'Test session not found.' });
    }

    const violation = store.addViolation({
      candidateId: test.candidateId,
      testId,
      violationType,
      details: details || ''
    });

    const candidate = store.getCandidateById(test.candidateId);
    try {
      await googleSheets.appendViolation(violation, candidate);
    } catch (err) {
      console.warn('Google Sheet Violation Sync Notice:', err.message);
    }

    const violations = store.getViolationsByTestId(testId);
    const strikeCount = violations.length;
    const maxStrikes = 3;
    const shouldDisqualify = strikeCount >= maxStrikes;

    res.json({
      success: true,
      violationId: violation.id,
      strikeCount,
      maxStrikes,
      shouldDisqualify,
      message: `Security violation recorded (${strikeCount}/${maxStrikes})`
    });
  } catch (error) {
    console.error('Violation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Upload Proctor Webcam Snapshot
router.post('/upload-snapshot', upload.single('snapshot'), (req, res) => {
  try {
    const { testId, candidateId, reason } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    const snapshot = store.addSnapshot({
      candidateId: candidateId || 'unknown',
      testId: testId || 'unknown',
      filename: req.file.filename,
      reason: reason || 'proctor_audit'
    });

    res.json({
      success: true,
      snapshotId: snapshot.id,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Snapshot Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Test Submission & Server-Side Scoring
router.post('/submit-test', async (req, res) => {
  try {
    const { token, testId, answers, timeSpentSeconds, isAutoSubmit, submitReason } = req.body;
    if (!token || !testId) {
      return res.status(400).json({ error: 'Token and testId required.' });
    }

    const test = store.getTestByIdAndToken(testId, token);
    if (!test) {
      return res.status(404).json({ error: 'Test session not found.' });
    }

    if (test.status === 'completed') {
      const existingSubmission = store.getSubmissionByTestId(testId);
      return res.json({
        success: true,
        alreadySubmitted: true,
        submission: existingSubmission
      });
    }

    const candidate = store.getCandidateById(test.candidateId);

    // Calculate score against official answers
    let totalScore = 0;
    const maxScore = questions.reduce((acc, q) => acc + q.points, 0); // 10 * 5 = 50
    const categoryStats = {};
    const detailedAnswers = {};

    questions.forEach(q => {
      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { totalQuestions: 0, correct: 0, totalPoints: 0, pointsScored: 0, percentage: 0 };
      }
      categoryStats[q.category].totalQuestions += 1;
      categoryStats[q.category].totalPoints += q.points;

      const candidateChoice = answers ? answers[q.id] : undefined;
      const isCorrect = candidateChoice !== undefined && Number(candidateChoice) === q.correctAnswer;

      if (isCorrect) {
        totalScore += q.points;
        categoryStats[q.category].correct += 1;
        categoryStats[q.category].pointsScored += q.points;
      }

      detailedAnswers[q.id] = {
        questionText: q.question,
        selected: candidateChoice !== undefined ? Number(candidateChoice) : null,
        selectedOptionText: candidateChoice !== undefined && q.options[candidateChoice] ? q.options[candidateChoice] : 'Not Answered',
        correct: q.correctAnswer,
        correctOptionText: q.options[q.correctAnswer],
        isCorrect,
        pointsAwarded: isCorrect ? q.points : 0,
        explanation: q.explanation
      };
    });

    // Compute category percentages
    Object.keys(categoryStats).forEach(cat => {
      const stat = categoryStats[cat];
      stat.percentage = Math.round((stat.pointsScored / stat.totalPoints) * 100);
    });

    const percentage = Math.round((totalScore / maxScore) * 100);

    // Determine Scholarship Tier
    let scholarshipTier = 'Certificate of Participation';
    let scholarshipPercentage = 0;
    if (percentage >= 90) {
      scholarshipTier = 'Platinum (100% Scholarship)';
      scholarshipPercentage = 100;
    } else if (percentage >= 75) {
      scholarshipTier = 'Gold (50% Scholarship)';
      scholarshipPercentage = 50;
    } else if (percentage >= 60) {
      scholarshipTier = 'Silver (25% Scholarship)';
      scholarshipPercentage = 25;
    }

    const submissionId = 'CERT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const violations = store.getViolationsByTestId(testId);

    // Update test & candidate status
    store.updateTest(testId, {
      status: 'completed',
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: timeSpentSeconds || 0,
      currentAnswers: answers || {}
    });

    store.saveCandidate({
      ...candidate,
      status: 'completed'
    });

    const submissionPayload = {
      id: submissionId,
      candidateId: candidate.id,
      testId,
      totalScore,
      maxScore,
      percentage,
      scholarshipTier,
      scholarshipPercentage,
      categoryScores: categoryStats,
      answers: detailedAnswers,
      violationsCount: violations.length,
      submittedAt: new Date().toISOString(),
      isAutoSubmit: !!isAutoSubmit,
      submitReason: submitReason || 'normal_submission'
    };

    store.saveSubmission(submissionPayload);

    // 📊 Sync Final Submission & Scorecard to Google Sheet
    try {
      await googleSheets.appendSubmission(candidate, submissionPayload, test);
    } catch (err) {
      console.warn('Google Sheet Submission Sync Notice:', err.message);
    }

    // Email Dispatch (Scorecard & Scholarship Certificate)
    try {
      const emailResult = await sendScorecardEmail(candidate, submissionPayload, test);
      if (emailResult && emailResult.success) {
        submissionPayload.emailSent = 1;
        store.saveSubmission(submissionPayload);
      }
    } catch (err) {
      console.error('Email Dispatch Error:', err);
    }

    res.json({
      success: true,
      submission: submissionPayload,
      candidate,
      message: 'Assessment submitted, scored, and synced to Google Sheets successfully'
    });
  } catch (error) {
    console.error('Submit Test Error:', error);
    res.status(500).json({ error: 'Submission error: ' + error.message });
  }
});

// 8. Fetch Scorecard by Submission/Test ID
router.get('/scorecard/:id', (req, res) => {
  try {
    const { id } = req.params;
    const submission = store.getSubmissionById(id) || store.getSubmissionByTestId(id);

    if (!submission) {
      return res.status(404).json({ error: 'Scorecard not found.' });
    }

    const candidate = store.getCandidateById(submission.candidateId);
    const violations = store.getViolationsByTestId(submission.testId);

    res.json({
      submission,
      candidate,
      violationsCount: violations.length
    });
  } catch (error) {
    console.error('Fetch Scorecard Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Admin: All Candidates & Proctoring Summary (Synced with Google Sheets)
router.get('/admin/candidates', async (req, res) => {
  try {
    const candidatesList = await googleSheets.fetchUnifiedCandidates(store);

    res.json({
      candidates: candidatesList,
      googleSheets: googleSheets.getStatus()
    });
  } catch (error) {
    console.error('Admin Candidates Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Admin: Detailed Candidate View with Proctor Violations & Webcam Snapshots
router.get('/admin/candidate-detail/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    let candidate = store.getCandidateById(candidateId);
    if (!candidate) {
      await googleSheets.fetchUnifiedCandidates(store);
      candidate = store.getCandidateById(candidateId);
    }
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const test = store.getCompletedTestByCandidateId(candidateId) || store.getActiveTestByCandidateId(candidateId);
    const submission = test ? store.getSubmissionByTestId(test.id) : null;
    const violations = test ? store.getViolationsByTestId(test.id) : [];
    const snapshots = test ? store.getSnapshotsByTestId(test.id) : [];

    res.json({
      candidate,
      test,
      submission,
      violations,
      snapshots
    });
  } catch (error) {
    console.error('Admin Detail Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. Admin: Export CSV (Synced with Google Sheets)
router.get('/admin/export-csv', async (req, res) => {
  try {
    const candidatesList = await googleSheets.fetchUnifiedCandidates(store);
    let csv = 'Candidate Name,Email,Phone,Coach,College,Experience,Cert ID,Score,Max Score,Percentage,Scholarship Tier,Violations,Time Spent (s),Submission Date\n';

    candidatesList.forEach(c => {
      csv += `"${c.fullName || ''}","${c.email || ''}","${c.phone || ''}","${c.coach || ''}","${c.college || ''}","${c.experience || ''}","${c.submissionId || 'N/A'}",${c.totalScore || 0},${c.maxScore || 50},"${c.percentage || 0}%","${c.scholarshipTier || 'Not Completed'}",${c.violationsCount || 0},${c.timeSpentSeconds || 0},"${c.submittedAt || c.createdAt || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scholarship_cbt_results.csv"');
    res.send(csv);
  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).send('Error generating CSV');
  }
});

// 12. Admin: Delete Candidate Entry & Allow Retest
router.delete('/admin/candidate/:id', async (req, res) => {
  try {
    const candidateId = req.params.id;
    const candidate = store.getCandidateById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    const candidateName = candidate.fullName;
    const candidateEmail = candidate.email;

    // 1. Delete from in-memory and local JSON store
    const success = store.deleteCandidateAndResetTest(candidateId);
    if (success) {
      console.log(`🗑️ [Admin Action] Candidate entry deleted and reset for retest: ${candidateName} (${candidateEmail})`);

      // 2. Synchronously notify Google Sheets and Local CSV
      try {
        await googleSheets.deleteCandidate(candidateEmail, candidateId);
      } catch (sheetErr) {
        console.warn('⚠️ Google Sheet deletion sync warning:', sheetErr.message);
      }

      return res.json({
        success: true,
        message: `Candidate ${candidateName} (${candidateEmail}) has been removed and synchronized with Google Sheets. Retest is now allowed.`
      });
    } else {
      return res.status(500).json({ error: 'Failed to delete candidate entry.' });
    }
  } catch (error) {
    console.error('Delete Candidate Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
