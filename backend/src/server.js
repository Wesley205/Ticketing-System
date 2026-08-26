require('dotenv').config();

const { createApp } = require('./app');
const pool = require('./config/db');
const { isConfiguredForSecureAccess, isStrongJwtSecret } = require('./config/authPolicy');
const { startExpirySweep } = require('./utils/accountExpiry');
const { logAction } = require('./utils/audit');
const { startNotificationQueue } = require('./utils/notificationProcessor');
const { startMaintenanceMonitor } = require('./utils/maintenanceMonitor');
const { startSlaMonitor } = require('./utils/slaMonitor');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

if (process.env.NODE_ENV === 'production' && !isStrongJwtSecret(process.env.JWT_SECRET)) {
  throw new Error('JWT_SECRET must be a strong non-default value in production.');
}

if (!isConfiguredForSecureAccess()) {
  throw new Error('ORGANIZATION_EMAIL_DOMAINS must be configured for secure internal access.');
}

const app = createApp();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`NSC ICT Service Desk API running on http://localhost:${PORT}`);
});

startExpirySweep({ pool, logAction });
startNotificationQueue({ pool });
startMaintenanceMonitor({ pool, logAction });
startSlaMonitor({ pool, logAction });
