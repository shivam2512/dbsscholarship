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

// Statically bundle seed store so esbuild inlines all data into Lambda
let seedData = { candidates: {}, tests: {}, submissions: {}, violations: [], snapshots: [] };
try {
  seedData = require('./seed_store.json');
} catch (e) {
  // Seed store optional
}

// In-memory data structures initialized with seed data
let store = {
  candidates: { ...(seedData.candidates || {}) },
  tests: { ...(seedData.tests || {}) },
  submissions: { ...(seedData.submissions || {}) },
  violations: [ ...(seedData.violations || []) ],
  snapshots: [ ...(seedData.snapshots || []) ],
  deletedEmails: [],
  deletedCandidateIds: []
};

// Overlay any dynamic runtime updates from /tmp or disk
try {
  if (fs.existsSync(storeFilePath)) {
    const raw = fs.readFileSync(storeFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    store.candidates = { ...store.candidates, ...(parsed.candidates || {}) };
    store.tests = { ...store.tests, ...(parsed.tests || {}) };
    store.submissions = { ...store.submissions, ...(parsed.submissions || {}) };
    // Restore tombstones
    store.deletedEmails = Array.isArray(parsed.deletedEmails) ? parsed.deletedEmails : [];
    store.deletedCandidateIds = Array.isArray(parsed.deletedCandidateIds) ? parsed.deletedCandidateIds : [];
  }
} catch (err) {
  // Continue with in-memory store
}

// Sync tombstone globals from persisted store on startup
global.__deletedEmails = new Set(store.deletedEmails);
global.__deletedCandidateIds = new Set(store.deletedCandidateIds);

// Remove any pre-seeded candidates that were later deleted
store.deletedEmails.forEach(email => { delete store.candidates[email]; });

// Persist memory store to JSON file asynchronously
let persistTimer = null;
function persist() {
  // Sync globals back to store before persisting
  store.deletedEmails = Array.from(global.__deletedEmails || []);
  store.deletedCandidateIds = Array.from(global.__deletedCandidateIds || []);
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  // Batch writes to reduce filesystem I/O; write after 200ms of inactivity
  persistTimer = setTimeout(() => {
    fs.promises.writeFile(storeFilePath, JSON.stringify(store, null, 2), 'utf8')
      .catch(err => {
        console.error('Error writing store JSON:', err.message);
      });
    persistTimer = null;
  }, 200);
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
    
    // Clear tombstone if candidate is re-registering
    global.__deletedEmails = global.__deletedEmails || new Set();
    global.__deletedCandidateIds = global.__deletedCandidateIds || new Set();
    global.__deletedEmails.delete(emailKey);
    if (candidate.id) global.__deletedCandidateIds.delete(candidate.id);

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

  markCandidateDeleted(email, id) {
    global.__deletedEmails = global.__deletedEmails || new Set();
    global.__deletedCandidateIds = global.__deletedCandidateIds || new Set();
    if (email) global.__deletedEmails.add(email.trim().toLowerCase());
    if (id) global.__deletedCandidateIds.add(id);
  },

  isCandidateDeleted(email, id) {
    global.__deletedEmails = global.__deletedEmails || new Set();
    global.__deletedCandidateIds = global.__deletedCandidateIds || new Set();
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    return (cleanEmail && global.__deletedEmails.has(cleanEmail)) || (id && global.__deletedCandidateIds.has(id));
  },

  deleteCandidateAndResetTest(candidateId) {
    const candidate = Object.values(store.candidates).find(c => c.id === candidateId || c.email === candidateId);
    const emailKey = candidate ? candidate.email.trim().toLowerCase() : (candidateId.includes('@') ? candidateId.trim().toLowerCase() : '');

    // 1. Mark as tombstone so sync never resurrects them
    this.markCandidateDeleted(emailKey, candidateId);

    // 2. Delete Candidate Registration Record
    if (emailKey) {
      delete store.candidates[emailKey];
    }
    const realId = candidate ? candidate.id : candidateId;

    // 3. Delete Associated Test Sessions & Submissions
    Object.keys(store.tests).forEach(testId => {
      const test = store.tests[testId];
      if (test.candidateId === realId || (emailKey && test.candidateId === emailKey)) {
        delete store.tests[testId];
        delete store.submissions[testId];
      }
    });

    Object.keys(store.submissions).forEach(subId => {
      const sub = store.submissions[subId];
      if (sub.candidateId === realId || (emailKey && sub.candidateId === emailKey)) {
        delete store.submissions[subId];
      }
    });

    // 4. Delete Violations & Snapshots
    store.violations = store.violations.filter(v => v.candidateId !== realId && v.candidateId !== emailKey);
    store.snapshots = store.snapshots.filter(s => s.candidateId !== realId && s.candidateId !== emailKey);

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
