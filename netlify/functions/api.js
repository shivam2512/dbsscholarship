const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'server', '.env') });

const apiRouter = require('../../server/routes/api');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle routes under /.netlify/functions/api and /api seamlessly
app.use('/.netlify/functions/api', apiRouter);
app.use('/api', apiRouter);

module.exports.handler = serverless(app);
