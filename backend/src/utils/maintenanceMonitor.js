const { withTransaction } = require('./transactions');
const { emitNotificationEvent } = require('./notificationService');
const { runExclusiveJob } = require('./jobRunner');

function parseIntervalMinutes(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function runMaintenanceMonitor({ pool, logAction }) {
  return withTransaction(async (client) => {
    const dueResult = await client.query(
      `SELECT ms.schedule_id, ms.asset_id, ms.title, ms.next_due_at, ms.reminder_days_before,
              ms.last_reminder_sent_at, ms.assigned_technician_id, ms.assigned_by_user_id,
              a.asset_tag
       FROM maintenance_schedules ms
       JOIN assets a ON a.asset_id = ms.asset_id
       WHERE ms.is_active = TRUE
         AND ms.next_due_at IS NOT NULL
         AND ms.next_due_at <= NOW() + (COALESCE(ms.reminder_days_before, 0) || ' days')::interval
         AND (
           ms.last_reminder_sent_at IS NULL
           OR ms.last_reminder_sent_at < DATE_TRUNC('day', NOW())
         )
       ORDER BY ms.next_due_at ASC`
    );

    for (const schedule of dueResult.rows) {
      await emitNotificationEvent(
        {
          type: 'maintenance_due',
          title: 'Maintenance due reminder',
          message: `Scheduled maintenance "${schedule.title}" for asset ${schedule.asset_tag} is due by ${new Date(schedule.next_due_at).toLocaleString()}.`,
          related_record_type: 'maintenance_schedule',
          related_record_id: schedule.schedule_id,
          recipient_user_ids: [schedule.assigned_technician_id, schedule.assigned_by_user_id].filter(Boolean),
          payload: {
            asset_id: schedule.asset_id,
            next_due_at: schedule.next_due_at,
          },
          action_url: `/maintenance.html#schedule-${schedule.schedule_id}`,
        },
        client
      );

      await client.query(
        `UPDATE maintenance_schedules
         SET last_reminder_sent_at = NOW()
         WHERE schedule_id = $1`,
        [schedule.schedule_id]
      );

      if (typeof logAction === 'function') {
        await logAction(
          null,
          'Maintenance reminder dispatched',
          'maintenance_schedule',
          schedule.schedule_id,
          `Reminder sent for asset ${schedule.asset_tag}`,
          client
        );
      }
    }

    return dueResult.rows.length;
  }, pool);
}

function startMaintenanceMonitor({ pool, logAction }) {
  const shouldRunOnStart = String(process.env.MAINTENANCE_MONITOR_ON_START || 'true').toLowerCase() !== 'false';
  const intervalMinutes = parseIntervalMinutes(process.env.MAINTENANCE_MONITOR_INTERVAL_MINUTES, 60);

  const execute = async () => {
    try {
      const outcome = await runExclusiveJob({
        pool,
        jobName: 'maintenance_monitor',
        task: () => runMaintenanceMonitor({ pool, logAction }),
      });
      const count = Number(outcome.result || 0);
      if (!outcome.skipped && count > 0) {
        console.log(`[maintenance-monitor] Processed ${count} due maintenance reminders.`);
      }
    } catch (err) {
      console.error('[maintenance-monitor] Failed:', err.message);
    }
  };

  if (shouldRunOnStart) {
    execute();
  }

  return setInterval(execute, intervalMinutes * 60 * 1000);
}

module.exports = {
  runMaintenanceMonitor,
  runExclusiveJob,
  startMaintenanceMonitor,
};
