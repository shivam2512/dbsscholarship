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

/** Remove entries from the local CSV fallback matching candidate email */
function removeLocalCSV(email) {
  try {
    if (!fs.existsSync(CSV_PATH) || !email) return;
    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.split('\n');
    const lowerEmail = email.trim().toLowerCase();
    const filtered = lines.filter(line => {
      if (!line.trim()) return false;
      if (line.startsWith('Type,') || line.startsWith('"Type",')) return true;
      return !line.toLowerCase().includes(lowerEmail);
    });
    fs.writeFileSync(CSV_PATH, filtered.join('\n') + '\n', 'utf8');
    console.log(`💾 [Local CSV] Removed records matching ${email}`);
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
  }
};
