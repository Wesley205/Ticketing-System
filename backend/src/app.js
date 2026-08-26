const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const invitationRoutes = require('./routes/invitations');
const dashboardRoutes = require('./routes/dashboard');
const assetRoutes = require('./routes/assets');
const serviceRequestRoutes = require('./routes/serviceRequests');
const maintenanceRoutes = require('./routes/maintenance');
const notificationRoutes = require('./routes/notifications');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const staffRoutes = require('./routes/staff');
const departmentRoutes = require('./routes/departments');
const auditLogRoutes = require('./routes/auditLogs');
const reportRoutes = require('./routes/reports');

function createApp() {
  const app = express();
  const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '6mb';

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: jsonBodyLimit }));

  app.use('/api/auth', authRoutes);
  app.use('/api/invitations', invitationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/service-requests', serviceRequestRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/knowledge-base', knowledgeBaseRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/audit-logs', auditLogRoutes);
  app.use('/api/reports', reportRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NSC ICT Service Desk API is running' });
  });

  const frontendPath = path.join(__dirname, '..', '..', 'frontend');
  app.use(express.static(frontendPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}

module.exports = { createApp };
