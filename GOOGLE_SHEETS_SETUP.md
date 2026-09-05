# 📊 Operating from Google Sheets (Zero Database Setup)

This application has been configured to operate **100% database-free**, directly logging and storing all student registrations, proctored test sessions, scorecards, scholarship tiers, and security audits into your **Google Sheet**.

---

## 🚀 2-Minute Google Sheet Connection Guide

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it e.g.: `IT Scholarship Exam Candidates & Results`.

---

### Step 2: Open Apps Script
1. In the Google Sheets menu, click **Extensions** -> **Apps Script**.
2. Delete any existing code in the editor (`Code.gs`).
3. Open [`server/google-apps-script.js`](file:///c:/Users/hp/Documents/Projects/Scholarship%20Test/server/google-apps-script.js), copy the entire code, and paste it into `Code.gs`.
4. Click the **Save** icon (diskette).

---

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button at the top right -> **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the fields:
   - **Description**: `Scholarship CBT Engine`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial so the server can push results without OAuth prompt)*
4. Click **Deploy**.
5. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Add URL to `.env`
In `server/.env` (or root `.env`), set:
```env
GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
GOOGLE_SHEET_VIEW_URL="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit"
```

---

## 📈 Auto-Generated Sheet Tabs & Real-Time Sync

Once a candidate registers or completes an exam, the Apps Script will automatically format and create:
1. **Registrations**: Logs full name, email, phone, selected counselor/coach, college, and timestamp.
2. **Scorecards & Results**: Logs score (out of 50), percentage, scholarship tier (Platinum / Gold / Silver / Participation), time spent, violations, and color highlights winners.
3. **Proctor Violations**: Logs tab switches, fullscreen escapes, or face detection warnings.
4. **Real-time Admin Deletions & Retest Sync**: When an admin clicks **"Allow Retest"** on any candidate, the system automatically removes their entries from all Google Sheet tabs and local logs, ensuring real-time synchronization.

> 💡 **Important:** If you already deployed your Google Apps Script earlier, simply open your spreadsheet's **Extensions -> Apps Script**, replace the code in `Code.gs` with the updated [`server/google-apps-script.js`](file:///c:/Users/hp/Documents/Projects/Scholarship%20Test/server/google-apps-script.js), click **Deploy** -> **Manage deployments** -> edit icon -> choose **Version: New version** -> click **Deploy**.
