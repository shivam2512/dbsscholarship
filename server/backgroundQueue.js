/**
 * Background Task Queue System for High Concurrency (1000+ Students)
 * Non-blocking execution for external Google Sheets sync & Email dispatches.
 */

const googleSheets = require('./googleSheets');
const mailer = require('./mailer');

const googleSheetsQueue = [];
const emailQueue = [];

let isProcessingSheets = false;
let isProcessingEmail = false;

// Concurrency limits to prevent hitting rate limits
const MAX_SHEETS_CONCURRENCY = 5;
const MAX_EMAIL_CONCURRENCY = 3;

let activeSheetsWorkers = 0;
let activeEmailWorkers = 0;

/**
 * Enqueue a Google Sheets sync task
 */
function enqueueGoogleSheets(taskType, payload) {
  googleSheetsQueue.push({ taskType, payload, retries: 0, addedAt: Date.now() });
  processGoogleSheetsQueue();
}

/**
 * Enqueue an Email dispatch task
 */
function enqueueEmail(candidate, submission, test) {
  emailQueue.push({ candidate, submission, test, retries: 0, addedAt: Date.now() });
  processEmailQueue();
}

function processGoogleSheetsQueue() {
  while (googleSheetsQueue.length > 0 && activeSheetsWorkers < MAX_SHEETS_CONCURRENCY) {
    const task = googleSheetsQueue.shift();
    activeSheetsWorkers++;

    (async () => {
      try {
        if (task.taskType === 'CANDIDATE') {
          await googleSheets.appendCandidate(task.payload);
        } else if (task.taskType === 'SUBMISSION') {
          await googleSheets.appendSubmission(task.payload.candidate, task.payload.submission, task.payload.test);
        } else if (task.taskType === 'VIOLATION') {
          await googleSheets.appendViolation(task.payload.violation, task.payload.candidate);
        }
      } catch (err) {
        console.warn(`⚠️ [Background Queue] Google Sheets Sync Task (${task.taskType}) retry warning:`, err.message);
        if (task.retries < 2) {
          task.retries++;
          googleSheetsQueue.push(task);
        }
      } finally {
        activeSheetsWorkers--;
        if (googleSheetsQueue.length > 0) {
          setImmediate(processGoogleSheetsQueue);
        }
      }
    })();
  }
}

function processEmailQueue() {
  while (emailQueue.length > 0 && activeEmailWorkers < MAX_EMAIL_CONCURRENCY) {
    const task = emailQueue.shift();
    activeEmailWorkers++;

    (async () => {
      try {
        await mailer.sendScorecardEmail(task.candidate, task.submission, task.test);
      } catch (err) {
        console.warn(`⚠️ [Background Queue] Email Dispatch retry warning for ${task.candidate?.email}:`, err.message);
        if (task.retries < 2) {
          task.retries++;
          emailQueue.push(task);
        }
      } finally {
        activeEmailWorkers--;
        if (emailQueue.length > 0) {
          setImmediate(processEmailQueue);
        }
      }
    })();
  }
}

module.exports = {
  enqueueGoogleSheets,
  enqueueEmail,
  getQueueStats() {
    return {
      googleSheetsQueueLength: googleSheetsQueue.length,
      activeSheetsWorkers,
      emailQueueLength: emailQueue.length,
      activeEmailWorkers
    };
  }
};
