const fs = require('fs');
const path = require('path');

const isServerless = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const dataDir = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, '..', 'data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  // Ignored in read-only serverless filesystem environments
}
const storeFilePath = path.join(dataDir, 'app_store.json');

// In-memory data structures
let store = {
  candidates: {},   // email -> candidate object
  tests: {},        // testId -> test session object
  submissions: {},  // submissionId / testId -> submission object
  violations: [],   // list of proctor violations
  snapshots: []     // list of webcam audit snapshots
};

// Load existing state from file on boot if exists
try {
  if (fs.existsSync(storeFilePath)) {
    const raw = fs.readFileSync(storeFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    store = { ...store, ...parsed };
  }
} catch (err) {
  console.warn('Note: Initializing fresh in-memory data store.');
}

// Persist memory store to JSON file asynchronously
function persist() {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing store JSON:', err.message);
  }
}

module.exports = {
  // Candidate Operations
  getCandidateByEmail(email) {
    if (!email) return null;
    return store.candidates[email.trim().toLowerCase()] || null;
  },

  getCandidateById(id) {
    return Object.values(store.candidates).find(c => c.id === id) || null;
  },

  saveCandidate(candidate) {
    const emailKey = candidate.email.trim().toLowerCase();
    store.candidates[emailKey] = {
      ...candidate,
      createdAt: candidate.createdAt || new Date().toISOString()
    };
    persist();
    return store.candidates[emailKey];
  },

  getAllCandidates() {
    return Object.values(store.candidates);
  },

  deleteCandidateAndResetTest(candidateId) {
    const candidate = Object.values(store.candidates).find(c => c.id === candidateId);
    if (!candidate) return false;

    const emailKey = candidate.email.trim().toLowerCase();

    // 1. Delete Candidate Registration Record
    delete store.candidates[emailKey];

    // 2. Delete Associated Test Sessions & Submissions
    Object.keys(store.tests).forEach(testId => {
      const test = store.tests[testId];
      if (test.candidateId === candidateId) {
        delete store.tests[testId];
        delete store.submissions[testId];
      }
    });

    Object.keys(store.submissions).forEach(subId => {
      const sub = store.submissions[subId];
      if (sub.candidateId === candidateId) {
        delete store.submissions[subId];
      }
    });

    // 3. Delete Violations & Snapshots
    store.violations = store.violations.filter(v => v.candidateId !== candidateId);
    store.snapshots = store.snapshots.filter(s => s.candidateId !== candidateId);

    persist();
    return true;
  },

  // Test Session Operations
  getTestByIdAndToken(testId, token) {
    const test = store.tests[testId];
    if (test && test.token === token) {
      return test;
    }
    return null;
  },

  getTestById(testId) {
    return store.tests[testId] || null;
  },

  getCompletedTestByCandidateId(candidateId) {
    return Object.values(store.tests).find(t => t.candidateId === candidateId && t.status === 'completed') || null;
  },

  getActiveTestByCandidateId(candidateId) {
    return Object.values(store.tests).find(t => t.candidateId === candidateId && t.status === 'in_progress') || null;
  },

  saveTest(test) {
    store.tests[test.id] = {
      ...test,
      startedAt: test.startedAt || new Date().toISOString()
    };
    persist();
    return store.tests[test.id];
  },

  updateTest(testId, updates) {
    if (!store.tests[testId]) return null;
    store.tests[testId] = {
      ...store.tests[testId],
      ...updates
    };
    persist();
    return store.tests[testId];
  },

  // Submissions & Scorecards
  saveSubmission(submission) {
    store.submissions[submission.id] = submission;
    store.submissions[submission.testId] = submission;
    persist();
    return submission;
  },

  getSubmissionByTestId(testId) {
    return store.submissions[testId] || null;
  },

  getSubmissionById(id) {
    return store.submissions[id] || null;
  },

  getAllSubmissions() {
    return Object.values(store.submissions);
  },

  // Violations
  addViolation(violation) {
    const item = {
      ...violation,
      id: violation.id || 'v-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    store.violations.push(item);
    persist();
    return item;
  },

  getViolationsByTestId(testId) {
    return store.violations.filter(v => v.testId === testId);
  },

  // Snapshots
  addSnapshot(snapshot) {
    const item = {
      ...snapshot,
      id: snapshot.id || 'snap-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    store.snapshots.push(item);
    persist();
    return item;
  },

  getSnapshotsByTestId(testId) {
    return store.snapshots.filter(s => s.testId === testId);
  }
};
