/**
 * Google Sheets Integration Module
 * Communicates via Google Apps Script Web App Webhook.
 * Falls back to a local CSV file when the webhook is not yet configured.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Read env vars lazily so they're always loaded after dotenv.config()
function getWebhookUrl() { return process.env.GOOGLE_SHEET_WEBHOOK_URL || ''; }
function getSheetViewUrl() { return process.env.GOOGLE_SHEET_VIEW_URL || ''; }

// Local CSV fallback — every submission is written here regardless of webhook status
const CSV_PATH = (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY)
  ? path.join('/tmp', 'submissions_local.csv')
  : path.join(__dirname, '..', 'submissions_local.csv');

/** Write a row to the local CSV log */
function writeLocalCSV(type, data) {
  try {
    const timestamp = new Date().toISOString();
    let row = '';

    if (type === 'REGISTER') {
      if (!fs.existsSync(CSV_PATH)) {
        fs.writeFileSync(CSV_PATH,
          'Type,Timestamp,Name,Email,Phone,College,Experience,Coach,Status\n', 'utf8');
      }
      row = `"REGISTER","${timestamp}","${data.fullName}","${data.email}","${data.phone || ''}","${data.college || ''}","${data.experience || ''}","${data.coach || ''}","registered"\n`;
    } else if (type === 'SCORECARD') {
      if (!fs.existsSync(CSV_PATH)) {
        fs.writeFileSync(CSV_PATH,
          'Type,Timestamp,CertID,Name,Email,Phone,Coach,College,Score,MaxScore,Percentage,ScholarshipTier,Violations,TimeSpent\n', 'utf8');
      }
      const { candidate, submission, timeSpent } = data;
      row = `"SCORECARD","${timestamp}","${submission.id}","${candidate.fullName}","${candidate.email}","${candidate.phone || ''}","${candidate.coach || ''}","${candidate.college || ''}",${submission.totalScore},${submission.maxScore},${submission.percentage},"${submission.scholarshipTier}",${submission.violationsCount || 0},${timeSpent || 0}\n`;
    }

    if (row) {
      fs.appendFileSync(CSV_PATH, row, 'utf8');
      console.log(`💾 [Local CSV] Saved → ${CSV_PATH}`);
    }
  } catch (e) {
    console.warn('Local CSV write warning:', e.message);
  }
}

/** Remove entries from all local CSV fallback files matching candidate email */
function removeLocalCSV(email) {
  try {
    if (!email) return;
    const lowerEmail = email.trim().toLowerCase();
    const paths = [
      CSV_PATH,
      path.join(__dirname, 'submissions_local.csv'),
      path.join(__dirname, '..', 'submissions_local.csv'),
      path.join('/tmp', 'submissions_local.csv')
    ];
    paths.forEach(p => {
      try {
        if (!fs.existsSync(p)) return;
        const content = fs.readFileSync(p, 'utf8');
        const lines = content.split('\n');
        const filtered = lines.filter(line => {
          if (!line.trim()) return false;
          if (line.startsWith('Type,') || line.startsWith('"Type",')) return true;
          return !line.toLowerCase().includes(lowerEmail);
        });
        fs.writeFileSync(p, filtered.join('\n') + '\n', 'utf8');
        console.log(`💾 [Local CSV] Removed records matching ${email} from ${p}`);
      } catch (e) {
        // Ignored
      }
    });
  } catch (e) {
    console.warn('Local CSV removal warning:', e.message);
  }
}

/** Returns true if the webhook URL is still a placeholder / unset */
function isWebhookPlaceholder(url) {
  return !url || !url.startsWith('http') || url.includes('YOUR_DEPLOYMENT_ID');
}

/**
 * Follow a redirect URL with GET (standard 302 behaviour).
 * Google Apps Script redirects POST to a GET-only endpoint.
 */
function getRedirectTarget(redirectUrl) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(redirectUrl);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET'
      };
      const req = protocol.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return getRedirectTarget(res.headers.location).then(resolve);
        }
        let body = '';
        res.on('data', c => { body += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body.substring(0, 200) }); }
        });
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'Redirect GET timeout' }); });
      req.end();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

/**
 * POST payload to Google Apps Script.
 * On 302 redirect, follows with GET (GAS pattern).
 */
function postToGoogleSheets(payload, targetUrl) {
  const url = targetUrl || getWebhookUrl();
  return new Promise((resolve) => {
    if (isWebhookPlaceholder(url)) {
      console.log('ℹ️  Google Sheet Webhook not configured — data saved to local CSV only.');
      return resolve({ success: true, localOnly: true });
    }

    try {
      const urlObj = new URL(url);
      const dataString = JSON.stringify(payload);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
        }
      };

      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(options, (res) => {
        // Google Apps Script returns 302 — follow with GET (not POST)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log('↪️  Following GAS redirect with GET...');
          return getRedirectTarget(res.headers.location).then(resolve);
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body.substring(0, 200) }); }
        });
      });

      req.on('error', (err) => {
        console.error('Google Sheet Sync Warning:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.setTimeout(12000, () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout connecting to Google Sheets' });
      });

      req.write(dataString);
      req.end();
    } catch (err) {
      console.error('Error posting to Google Sheet:', err.message);
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = {
  getStatus() {
    const url = getWebhookUrl();
    return {
      isConfigured: !isWebhookPlaceholder(url),
      webhookUrl: isWebhookPlaceholder(url)
        ? 'Not set — running in local CSV fallback mode'
        : url.substring(0, 35) + '...',
      sheetViewUrl: getSheetViewUrl() || 'Not set',
      localCSV: CSV_PATH
    };
  },

  async appendCandidate(candidate) {
    console.log(`📊 [Google Sheet] Logging Registration for ${candidate.fullName} (${candidate.email})...`);
    writeLocalCSV('REGISTER', candidate);
    return postToGoogleSheets({
      action: 'REGISTER_CANDIDATE',
      timestamp: new Date().toISOString(),
      candidateId: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      college: candidate.college || 'N/A',
      experience: candidate.experience || 'N/A',
      coach: candidate.coach || 'Direct / None',
      status: candidate.status || 'registered'
    });
  },

  async appendSubmission(candidate, submission, test) {
    console.log(`📊 [Google Sheet] Scorecard for ${candidate.fullName}: ${submission.totalScore}/${submission.maxScore} (${submission.percentage}%) — ${submission.scholarshipTier}`);
    writeLocalCSV('SCORECARD', { candidate, submission, timeSpent: test?.timeSpentSeconds || 0 });
    return postToGoogleSheets({
      action: 'SUBMIT_SCORECARD',
      timestamp: new Date().toISOString(),
      certificateId: submission.id,
      candidateId: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      coach: candidate.coach || 'Direct / None',
      college: candidate.college || 'N/A',
      experience: candidate.experience || 'N/A',
      totalScore: submission.totalScore,
      maxScore: submission.maxScore || 50,
      percentage: submission.percentage,
      scholarshipTier: submission.scholarshipTier,
      scholarshipPercentage: submission.scholarshipPercentage,
      timeSpentSeconds: test?.timeSpentSeconds || 0,
      timeSpentFormatted: `${Math.floor((test?.timeSpentSeconds || 0) / 60)}m ${(test?.timeSpentSeconds || 0) % 60}s`,
      violationsCount: submission.violationsCount || 0,
      categoryScores: submission.categoryScores
    });
  },

  async appendViolation(violation, candidate) {
    return postToGoogleSheets({
      action: 'LOG_VIOLATION',
      timestamp: new Date().toISOString(),
      violationId: violation.id,
      candidateId: violation.candidateId,
      candidateName: candidate?.fullName || 'Unknown',
      candidateEmail: candidate?.email || 'Unknown',
      testId: violation.testId,
      violationType: violation.violationType,
      details: violation.details || ''
    });
  },

  async deleteCandidate(email, candidateId) {
    console.log(`📊 [Google Sheet] Requesting deletion for ${email} (ID: ${candidateId})...`);
    removeLocalCSV(email);
    return postToGoogleSheets({
      action: 'DELETE_CANDIDATE',
      email: email,
      candidateId: candidateId,
      timestamp: new Date().toISOString()
    });
  },

  /**
   * Fetch live data directly from Google Apps Script Web App (with 5s timeout guard)
   */
  async fetchSheetData() {
    const url = getWebhookUrl();
    if (isWebhookPlaceholder(url)) {
      return { success: false, error: 'Google Sheet Webhook not configured' };
    }

    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => resolve({ success: false, timeout: true }), 5000);
    });

    const fetchPromise = (async () => {
      try {
        // Try GET request with redirect following
        const getResult = await getRedirectTarget(url);
        if (getResult && Array.isArray(getResult.registrations)) {
          return { success: true, data: getResult };
        }

        // If doGet returned default status, try POST with action 'FETCH_ALL_DATA'
        const postResult = await postToGoogleSheets({ action: 'FETCH_ALL_DATA' }, url);
        if (postResult && Array.isArray(postResult.registrations)) {
          return { success: true, data: postResult };
        }

        return { success: false, raw: getResult || postResult };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })();

    return Promise.race([fetchPromise, timeoutPromise]);
  },

  /**
   * Read fallback rows from local CSV files
   */
  readLocalCSVRecords() {
    const pathsToTry = [
      CSV_PATH,
      path.join(__dirname, 'submissions_local.csv'),
      path.join(__dirname, '..', 'submissions_local.csv'),
      path.join('/tmp', 'submissions_local.csv')
    ];

    for (const p of pathsToTry) {
      try {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          if (content && content.trim().length > 50) {
            return content;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    return '';
  },

  /**
   * Returns unified candidates list synced between Google Sheets, Local CSV, and In-Memory Store
   */
  clearCacheForCandidate(email, candidateId) {
    // Invalidate the full cache so next fetch won't include the deleted candidate
    global.__candidatesCache = null;
    global.__candidatesCacheTime = 0;
    console.log(`🗑️ [Cache] Cleared candidates cache after deletion of ${email || candidateId}`);
  },

  clearCache() {
    global.__candidatesCache = null;
    global.__candidatesCacheTime = 0;
  },

  async fetchUnifiedCandidates(store, forceRefresh = false) {
    // Check in-memory cache (5s TTL — short enough to reflect recent deletions/registrations)
    if (!forceRefresh && global.__candidatesCache && (Date.now() - global.__candidatesCacheTime < 5000)) {
      return global.__candidatesCache;
    }

    const candidatesMap = new Map();

    // Helper: check if email/id is deleted
    const isDeleted = (email, id) => {
      if (store && typeof store.isCandidateDeleted === 'function') {
        return store.isCandidateDeleted(email, id);
      }
      return false;
    };

    // Step B: Pre-populate with in-memory store (live source of truth)
    if (store && typeof store.getAllCandidates === 'function') {
      const memoryCandidates = store.getAllCandidates();
      memoryCandidates.forEach(c => {
        const lowerEmail = (c.email || '').toLowerCase();
        if (!lowerEmail) return;

        // Skip deleted candidates
        if (isDeleted(lowerEmail, c.id)) return;

        const test = store.getCompletedTestByCandidateId(c.id) || store.getActiveTestByCandidateId(c.id) || {};
        const submission = test.id ? (store.getSubmissionByTestId(test.id) || {}) : {};
        const violations = test.id ? store.getViolationsByTestId(test.id) : [];
        const snapshots = test.id ? store.getSnapshotsByTestId(test.id) : [];

        candidatesMap.set(lowerEmail, {
          id: c.id,
          fullName: c.fullName,
          email: lowerEmail,
          phone: c.phone,
          college: c.college,
          experience: c.experience,
          coach: c.coach,
          createdAt: c.createdAt,
          candidateStatus: c.status,
          testId: test.id || null,
          startedAt: test.startedAt || null,
          submittedAt: test.submittedAt || null,
          timeSpentSeconds: test.timeSpentSeconds || 0,
          testStatus: test.status || 'registered',
          submissionId: submission.id || null,
          totalScore: submission.totalScore !== undefined ? submission.totalScore : null,
          maxScore: submission.maxScore || 50,
          percentage: submission.percentage !== undefined ? submission.percentage : null,
          scholarshipTier: submission.scholarshipTier || null,
          emailSent: submission.emailSent || 0,
          violationsCount: violations.length,
          snapshotsCount: snapshots.length
        });
      });
    }

    // Step C: Pre-populate with local CSV fallback records
    const csvContent = this.readLocalCSVRecords();
    if (csvContent) {
      const lines = csvContent.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Type,') || trimmed.startsWith('"Type",')) return;

        const cells = [];
        let inQuote = false;
        let current = '';
        for (let i = 0; i < trimmed.length; i++) {
          const char = trimmed[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());

        const type = cells[0]?.replace(/^"|"$/g, '');
        if (type === 'REGISTER') {
          const [, timestamp, name, email, phone, college, experience, coach] = cells.map(c => c.replace(/^"|"$/g, ''));
          const lowerEmail = (email || '').toLowerCase();
          // Skip deleted candidates
          if (lowerEmail && !candidatesMap.has(lowerEmail) && !isDeleted(lowerEmail, '')) {
            candidatesMap.set(lowerEmail, {
              id: lowerEmail,
              fullName: name,
              email: lowerEmail,
              phone: phone || '',
              college: college || '',
              experience: experience || '',
              coach: coach || 'Direct / None',
              createdAt: timestamp || new Date().toISOString(),
              candidateStatus: 'registered',
              testId: null,
              startedAt: null,
              submittedAt: null,
              timeSpentSeconds: 0,
              testStatus: 'registered',
              submissionId: null,
              totalScore: null,
              maxScore: 50,
              percentage: null,
              scholarshipTier: null,
              emailSent: 0,
              violationsCount: 0,
              snapshotsCount: 0
            });
          }
        } else if (type === 'SCORECARD') {
          const [, timestamp, certId, name, email, phone, coach, college, score, maxScore, pct, tier, viol, timeSpent] = cells.map(c => c.replace(/^"|"$/g, ''));
          const lowerEmail = (email || '').toLowerCase();
          // Skip deleted candidates
          if (lowerEmail && !isDeleted(lowerEmail, '')) {
            let cand = candidatesMap.get(lowerEmail);
            if (!cand) {
              cand = {
                id: lowerEmail,
                fullName: name,
                email: lowerEmail,
                phone: phone || '',
                college: college || '',
                experience: '',
                coach: coach || 'Direct / None',
                createdAt: timestamp || new Date().toISOString(),
                candidateStatus: 'completed',
                snapshotsCount: 0
              };
              candidatesMap.set(lowerEmail, cand);
            }
            cand.testStatus = 'completed';
            cand.submissionId = certId;
            cand.totalScore = Number(score) || 0;
            cand.maxScore = Number(maxScore) || 50;
            cand.percentage = Number(pct) || 0;
            cand.scholarshipTier = tier || 'Certificate of Participation';
            cand.submittedAt = timestamp;
            cand.violationsCount = Number(viol) || 0;
            cand.timeSpentSeconds = Number(timeSpent) || 0;
          }
        }
      });
    }

    // Step D: Fetch fresh live data from Google Sheets Web App and overlay
    try {
      const sheetRes = await this.fetchSheetData();
      if (sheetRes.success && sheetRes.data) {
        const { registrations, scorecards, violations } = sheetRes.data;

        (registrations || []).forEach(r => {
          const email = (r.email || '').trim().toLowerCase();
          if (!email) return;
          // Skip deleted candidates
          if (isDeleted(email, r.candidateId)) return;

          let cand = candidatesMap.get(email);
          if (!cand) {
            cand = {
              id: r.candidateId || email,
              fullName: r.fullName,
              email: email,
              phone: r.phone,
              college: r.college,
              experience: r.experience,
              coach: r.coach,
              createdAt: r.timestamp,
              candidateStatus: r.status || 'registered',
              testId: null,
              startedAt: null,
              submittedAt: null,
              timeSpentSeconds: 0,
              testStatus: 'registered',
              submissionId: null,
              totalScore: null,
              maxScore: 50,
              percentage: null,
              scholarshipTier: null,
              emailSent: 0,
              violationsCount: 0,
              snapshotsCount: 0
            };
            candidatesMap.set(email, cand);
          } else {
            // Update fields from Google Sheet
            if (r.fullName) cand.fullName = r.fullName;
            if (r.phone) cand.phone = r.phone;
            if (r.coach) cand.coach = r.coach;
            if (r.college) cand.college = r.college;
            if (r.experience) cand.experience = r.experience;
          }
        });

        (scorecards || []).forEach(s => {
          const email = (s.email || '').trim().toLowerCase();
          if (!email) return;
          // Skip deleted candidates
          if (isDeleted(email, s.candidateId)) return;

          let cand = candidatesMap.get(email);
          if (!cand) {
            cand = {
              id: email,
              fullName: s.fullName,
              email: email,
              phone: s.phone,
              college: s.college,
              experience: s.experience,
              coach: s.coach,
              createdAt: s.timestamp,
              candidateStatus: 'completed',
              snapshotsCount: 0
            };
            candidatesMap.set(email, cand);
          }

          cand.testStatus = 'completed';
          cand.submissionId = s.certificateId;
          cand.totalScore = s.totalScore !== null && s.totalScore !== undefined ? Number(s.totalScore) : null;
          cand.maxScore = s.maxScore ? Number(s.maxScore) : 50;
          cand.percentage = s.percentage !== null && s.percentage !== undefined ? Number(s.percentage) : null;
          cand.scholarshipTier = s.scholarshipTier;
          cand.submittedAt = s.timestamp;
          cand.violationsCount = Number(s.violationsCount) || 0;

          if (s.timeSpent) {
            const mMatch = s.timeSpent.match(/(\d+)m/);
            const sMatch = s.timeSpent.match(/(\d+)s/);
            const sec = (mMatch ? parseInt(mMatch[1]) * 60 : 0) + (sMatch ? parseInt(sMatch[1]) : 0);
            cand.timeSpentSeconds = sec || parseInt(s.timeSpent) || 0;
          }
        });

        if (violations && Array.isArray(violations)) {
          violations.forEach(v => {
            const email = (v.candidateEmail || '').trim().toLowerCase();
            if (email && candidatesMap.has(email)) {
              const cand = candidatesMap.get(email);
              const matchCount = violations.filter(x => (x.candidateEmail || '').trim().toLowerCase() === email).length;
              cand.violationsCount = Math.max(cand.violationsCount || 0, matchCount);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Google Sheet live sync notice:', err.message);
    }

    // Convert map to sorted array (newest first)
    const result = Array.from(candidatesMap.values());
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Update in-memory cache
    global.__candidatesCache = result;
    global.__candidatesCacheTime = Date.now();

    // NOTE: We intentionally do NOT hydrate the in-memory store from Google Sheets data here.
    // Hydrating the store from Sheets would cause deleted candidates to re-appear after reset,
    // because the Sheets still have their rows until explicitly deleted there.
    // The store is the write-authoritative source; Google Sheets is append-log + read-display.

    return result;
  }
};
