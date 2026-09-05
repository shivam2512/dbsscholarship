const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRouter = require('../../server/routes/api');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Seamlessly handle /.netlify/functions/api, /api, and root routes
app.use('/.netlify/functions/api', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

module.exports.handler = serverless(app);
