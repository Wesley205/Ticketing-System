import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { createServer } from 'vite';

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { AuditLogsPage } = await vite.ssrLoadModule('/src/features/audit-logs/pages/AuditLogsPage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
    const { buildAuditLogCsv } = await vite.ssrLoadModule('/src/features/audit-logs/services/audit-logs-api.js');

    const adminAuth = {
      isReady: true,
      isAuthenticated: true,
      user: { user_id: 1, full_name: 'Admin User', role: 'admin' },
      accessProfile: {
        role: 'admin',
        role_label: 'Administrator',
        permissions: {
          can_access_dashboard: true,
          can_access_service_desk: true,
          can_access_assets: true,
          can_manage_maintenance: true,
          can_access_knowledge_base: true,
          can_view_reports: true,
          can_view_audit_logs: true,
          can_access_notifications: true,
        },
      },
      logout: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/audit-logs' },
        createElement(
          AuthContext.Provider,
          { value: adminAuth },
          createElement(AuditLogsPage),
        ),
      ),
    );

    const csv = buildAuditLogCsv([
      {
        created_at: '2026-03-01T10:00:00Z',
        user_name: 'A. Nwosu',
        user_role: 'admin',
        action: 'Exported audit report',
        record_type: 'report',
        record_id: 9,
        details: 'Exported filtered audit log',
        ip_address: '10.10.2.12',
      },
    ]);

    assert.match(html, /Audit Trail/i);
    assert.match(html, /System Audit Trail/i);
    assert.match(html, /Export Audit Report/i);
    assert.match(html, /Loading read-only audit records/i);
    assert.match(csv, /"Exported audit report"/i);
    assert.match(csv, /"report #9"/i);
    console.log('Audit logs secure workspace smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[audit-logs-smoke] Failed:', error);
  process.exitCode = 1;
});
