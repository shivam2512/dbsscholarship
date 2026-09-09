/**
 * Background Task Queue System for High Concurrency (1000+ Students)
 * Non-blocking execution for external Google Sheets sync & Email dispatches in persistent server environment,
 * with synchronous fallback in serverless (Netlify/Lambda) environment.
 */

const googleSheets = require('./googleSheets');
const mailer = require('./mailer');

const isServerless = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

const googleSheetsQueue = [];
const emailQueue = [];

let activeSheetsWorkers = 0;
let activeEmailWorkers = 0;

const MAX_SHEETS_CONCURRENCY = 5;
const MAX_EMAIL_CONCURRENCY = 3;

/**
 * Enqueue or synchronously execute a Google Sheets sync task
 */
async function enqueueGoogleSheets(taskType, payload) {
  if (isServerless) {
    try {
      if (taskType === 'CANDIDATE') {
        return await googleSheets.appendCandidate(payload);
      } else if (taskType === 'SUBMISSION') {
        return await googleSheets.appendSubmission(payload.candidate, payload.submission, payload.test);
      } else if (taskType === 'VIOLATION') {
        return await googleSheets.appendViolation(payload.violation, payload.candidate);
      }
    } catch (err) {
      console.warn(`⚠️ [Serverless Direct Sync] Google Sheets Task (${taskType}) error:`, err.message);
      return { success: false, error: err.message };
    }
  }

  googleSheetsQueue.push({ taskType, payload, retries: 0, addedAt: Date.now() });
  processGoogleSheetsQueue();
}

/**
 * Enqueue or synchronously execute an Email dispatch task
 */
async function enqueueEmail(candidate, submission, test) {
  if (isServerless) {
    try {
      return await mailer.sendScorecardEmail(candidate, submission, test);
    } catch (err) {
      console.warn(`⚠️ [Serverless Direct Email] Dispatch error for ${candidate?.email}:`, err.message);
      return { success: false, error: err.message };
    }
  }

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
