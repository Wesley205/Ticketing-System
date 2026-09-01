const express = require('express');
const { configureTrustProxy, createSecurityMiddleware } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');
const { configureFrontendServing } = require('./middleware/frontendServing');
const notFound = require('./middleware/notFound');

const healthRoutes = require('./routes/health');
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

function createApp(options = {}) {
  const app = express();

  app.disable('x-powered-by');
  configureTrustProxy(app, options.env);
  app.use(createSecurityMiddleware(options.env));

  app.use('/api/health', healthRoutes);
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

  configureFrontendServing(app, options);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
