const express = require('express');
const { configureTrustProxy, createSecurityMiddleware } = require('./middleware/security');
const { errorHandler } = require('./middleware/errorHandler');
const { configureFrontendServing } = require('./middleware/frontendServing');
const notFound = require('./middleware/notFound');

const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const invitationRoutes = require('./modules/invitations/invitation.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const assetRoutes = require('./modules/assets/asset.routes');
const serviceRequestRoutes = require('./modules/serviceRequests/serviceRequest.routes');
const serviceCatalogRoutes = require('./modules/serviceCatalog/serviceCatalog.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const knowledgeBaseRoutes = require('./modules/knowledgeBase/knowledgeBase.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const departmentRoutes = require('./modules/departments/department.routes');
const floorRoutes = require('./modules/floors/floor.routes');
const auditLogRoutes = require('./modules/auditLogs/auditLog.routes');
const reportRoutes = require('./modules/reports/report.routes');
const systemRoutes = require('./modules/system/system.routes');

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
  app.use('/api/service-catalog', serviceCatalogRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/knowledge-base', knowledgeBaseRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/floors', floorRoutes);
  app.use('/api/audit-logs', auditLogRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/system', systemRoutes);

  if (options.serveFrontend !== false) {
    configureFrontendServing(app, options);
  }

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
