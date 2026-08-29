const TICKET_TYPES = Object.freeze([
  'Incident',
  'Service Request',
  'Access Request',
  'Maintenance Request',
  'Change Request',
]);

const TICKET_STATUSES = Object.freeze([
  'New',
  'Pending',
  'Assigned',
  'Accepted',
  'In Progress',
  'Waiting for User',
  'Waiting for Parts',
  'Resolved',
  'Closed',
  'Reopened',
  'Cancelled',
]);

const TICKET_PRIORITIES = Object.freeze(['Low', 'Medium', 'High', 'Critical']);
const TICKET_SOURCE_CHANNELS = Object.freeze(['portal', 'email', 'phone', 'walk-in', 'system']);

const TICKET_HISTORY_EVENT_TYPES = Object.freeze([
  'created',
  'assigned',
  'reassigned',
  'unassigned',
  'accepted',
  'status_changed',
  'resolved',
  'closed',
  'reopened',
  'comment_added',
  'archived',
  'imported',
  'sla_breached',
  'escalated',
]);

const ASSET_STATUSES = Object.freeze([
  'Active',
  'Available',
  'Assigned',
  'Under Maintenance',
  'Damaged',
  'Retired',
]);

const ASSET_CONDITIONS = Object.freeze(['New', 'Good', 'Fair', 'Poor']);
const ASSET_RETURN_CONDITIONS = Object.freeze(['Good', 'Fair', 'Poor', 'Damaged']);

const MAINTENANCE_TYPES = Object.freeze(['Corrective', 'Preventive', 'Inspection']);
const MAINTENANCE_SCHEDULE_TYPES = Object.freeze(['Preventive', 'Inspection']);
const MAINTENANCE_STATUSES = Object.freeze(['Scheduled', 'In Progress', 'Completed', 'Cancelled']);
const MAINTENANCE_FREQUENCY_UNITS = Object.freeze(['days', 'weeks', 'months']);

const USER_ROLES = Object.freeze(['admin', 'ict_officer', 'technician', 'staff']);
const USER_TYPES = Object.freeze(['employee', 'intern', 'corper', 'contractor', 'guest']);
const TEMPORARY_USER_TYPES = Object.freeze(['intern', 'corper', 'contractor', 'guest']);
const ACCOUNT_STATUSES = Object.freeze(['active', 'deactivated', 'suspended']);
const INVITATION_STATUSES = Object.freeze(['pending', 'accepted', 'revoked', 'expired']);

const NOTIFICATION_TYPES = Object.freeze([
  'ticket_assigned',
  'ticket_updated',
  'ticket_resolved',
  'ticket_comment',
  'ticket_attachment',
  'ticket_overdue',
  'ticket_escalated',
  'maintenance_created',
  'maintenance_completed',
  'maintenance_due',
  'invitation_created',
  'account_expiry',
  'system',
]);

const NOTIFICATION_SEVERITIES = Object.freeze(['info', 'success', 'warning', 'critical']);
const NOTIFICATION_CHANNELS = Object.freeze(['email', 'sms', 'whatsapp']);
const NOTIFICATION_DELIVERY_STATUSES = Object.freeze([
  'pending',
  'processing',
  'sent',
  'failed',
  'deferred',
  'cancelled',
]);

const KNOWLEDGE_BASE_STATUSES = Object.freeze(['draft', 'in_review', 'published', 'archived']);
const KNOWLEDGE_BASE_VISIBILITY_SCOPES = Object.freeze([
  'all_users',
  'department',
  'operational_only',
]);
const KNOWLEDGE_BASE_RELATION_TYPES = Object.freeze(['asset', 'asset_type', 'ticket_category']);

const OPERATIONAL_JOB_STATUSES = Object.freeze(['running', 'succeeded', 'failed', 'skipped']);

module.exports = {
  ACCOUNT_STATUSES,
  ASSET_CONDITIONS,
  ASSET_RETURN_CONDITIONS,
  ASSET_STATUSES,
  INVITATION_STATUSES,
  KNOWLEDGE_BASE_RELATION_TYPES,
  KNOWLEDGE_BASE_STATUSES,
  KNOWLEDGE_BASE_VISIBILITY_SCOPES,
  MAINTENANCE_FREQUENCY_UNITS,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_DELIVERY_STATUSES,
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
  OPERATIONAL_JOB_STATUSES,
  TEMPORARY_USER_TYPES,
  TICKET_HISTORY_EVENT_TYPES,
  TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES,
  TICKET_TYPES,
  USER_ROLES,
  USER_TYPES,
};
