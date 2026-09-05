/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT FOR SCHOLARSHIP CBT ASSESSMENT (ZERO-DATABASE BACKEND)
 * =========================================================================================
 * 
 * Instructions to deploy:
 * 1. Open your Google Sheet: https://sheets.new
 * 2. Rename the sheet tab to "Submissions" (or it will auto-create tabs).
 * 3. Click Extensions -> Apps Script.
 * 4. Paste this entire code into `Code.gs`.
 * 5. Click "Deploy" -> "New deployment".
 * 6. Select type: "Web app".
 * 7. Description: "Scholarship Assessment Engine".
 * 8. Execute as: "Me" (your Google account).
 * 9. Who has access: "Anyone".
 * 10. Click "Deploy", copy the Web App URL, and paste it in `server/.env` as:
 *     GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
 * =========================================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "REGISTER_CANDIDATE") {
      var regSheet = getOrCreateSheet(ss, "Registrations", [
        "Timestamp", "Candidate ID", "Full Name", "Email", "Phone", "Coach/Counsellor", "College", "Experience", "Status"
      ]);
      
      regSheet.appendRow([
        new Date(),
        data.candidateId || "",
        data.fullName || "",
        data.email || "",
        data.phone || "",
        data.coach || "Direct / None",
        data.college || "",
        data.experience || "",
        data.status || "registered"
      ]);

      return ContentService.createTextOutput(JSON.stringify({ result: "success", type: "registration_logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "SUBMIT_SCORECARD") {
      var subSheet = getOrCreateSheet(ss, "Scorecards & Results", [
        "Timestamp", "Certificate ID", "Candidate Name", "Email", "Phone", "Coach / Counsellor",
        "Score", "Max Score", "Percentage", "Scholarship Tier Awarded", "Scholarship %",
        "Time Spent", "Violations Count", "College", "Experience"
      ]);

      subSheet.appendRow([
        new Date(),
        data.certificateId || "",
        data.fullName || "",
        data.email || "",
        data.phone || "",
        data.coach || "Direct / None",
        data.totalScore || 0,
        data.maxScore || 50,
        (data.percentage || 0) + "%",
        data.scholarshipTier || "Certificate of Participation",
        (data.scholarshipPercentage || 0) + "%",
        data.timeSpentFormatted || (data.timeSpentSeconds + "s"),
        data.violationsCount || 0,
        data.college || "",
        data.experience || ""
      ]);

      // Highlight top scholarship winners with colors
      var lastRow = subSheet.getLastRow();
      var percentageVal = Number(data.percentage || 0);
      var range = subSheet.getRange(lastRow, 1, 1, 15);
      
      if (percentageVal >= 90) {
        range.setBackground("#f3e8ff"); // Platinum / Purple tint
      } else if (percentageVal >= 75) {
        range.setBackground("#fef3c7"); // Gold / Yellow tint
      } else if (percentageVal >= 60) {
        range.setBackground("#e0f2fe"); // Silver / Blue tint
      }

      return ContentService.createTextOutput(JSON.stringify({ result: "success", type: "scorecard_logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "LOG_VIOLATION") {
      var violSheet = getOrCreateSheet(ss, "Proctor Violations", [
        "Timestamp", "Violation ID", "Candidate Name", "Candidate Email", "Test ID", "Violation Type", "Details"
      ]);

      violSheet.appendRow([
        new Date(),
        data.violationId || "",
        data.candidateName || "",
        data.candidateEmail || "",
        data.testId || "",
        data.violationType || "",
        data.details || ""
      ]);

      return ContentService.createTextOutput(JSON.stringify({ result: "success", type: "violation_logged" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "DELETE_CANDIDATE") {
      var targetEmail = (data.email || "").trim().toLowerCase();
      var targetId = (data.candidateId || "").trim().toLowerCase();
      var totalDeleted = 0;

      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sheet = allSheets[s];
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        if (lastRow <= 1 || lastCol < 1) continue;

        var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

        // Loop from bottom to top so row deletions don't alter indices of preceding rows
        for (var r = lastRow - 1; r >= 1; r--) { // r=1 is row 2 (skips header row 1)
          var rowValues = values[r];
          var matchFound = false;

          for (var c = 0; c < rowValues.length; c++) {
            var cellVal = String(rowValues[c] || "").trim().toLowerCase();
            if (targetEmail && cellVal === targetEmail) {
              matchFound = true;
              break;
            }
            if (targetId && cellVal === targetId) {
              matchFound = true;
              break;
            }
          }

          if (matchFound) {
            sheet.deleteRow(r + 1); // 1-indexed for SpreadsheetApp
            totalDeleted++;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        result: "success",
        type: "candidate_deleted",
        email: targetEmail,
        rowsDeleted: totalDeleted
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "unknown_action", received: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Scholarship Assessment Google Sheet Hub",
    timestamp: new Date()
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}
