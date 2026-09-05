const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const apiRouter = require('./routes/api');
const googleSheets = require('./googleSheets');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static directory for proctoring webcam snapshots
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api', apiRouter);

// Fallback for root
app.get('/', (req, res) => {
  res.json({
    name: 'Scholarship CBT Proctored Engine API',
    mode: 'Google Sheets Operating Mode (No Database)',
    version: '2.0.0',
    status: 'online',
    googleSheets: googleSheets.getStatus(),
    endpoints: {
      health: '/api/health',
      coaches: '/api/coaches',
      register: '/api/register',
      startTest: '/api/start-test',
      submitTest: '/api/submit-test',
      adminCandidates: '/api/admin/candidates'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Scholarship CBT Engine Server running on http://localhost:${PORT}`);
  const sheetStatus = googleSheets.getStatus();
  if (sheetStatus.isConfigured) {
    console.log(`📊 Google Sheets Sync: Active -> ${sheetStatus.webhookUrl}`);
  } else {
    console.log(`📊 Google Sheets Sync: Ready for Webhook URL in .env (see GOOGLE_SHEETS_SETUP.md)`);
  }
});
