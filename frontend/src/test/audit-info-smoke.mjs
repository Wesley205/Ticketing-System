import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

async function renderWithAuth(vite, modulePath, exportName, authValue) {
  const mod = await vite.ssrLoadModule(modulePath);
  const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
  const Component = mod[exportName];

  return renderToStaticMarkup(
    createElement(
      AuthContext.Provider,
      { value: authValue },
      createElement(Component),
    ),
  );
}

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const adminAuth = {
      isReady: true,
      isAuthenticated: true,
      user: { role: 'admin', user_id: 1 },
      accessProfile: {
        role: 'admin',
        role_label: 'Administrator',
        permissions: { can_view_audit_logs: true },
      },
    };
    const staffAuth = {
      isReady: true,
      isAuthenticated: true,
      user: { role: 'staff', user_id: 9 },
      accessProfile: {
        role: 'staff',
        role_label: 'Staff/User',
        permissions: { can_view_audit_logs: false },
      },
    };

    const adminAudit = await renderWithAuth(vite, '/src/features/audit-logs/pages/AuditLogsPage.jsx', 'AuditLogsPage', adminAuth);
    const staffAudit = await renderWithAuth(vite, '/src/features/audit-logs/pages/AuditLogsPage.jsx', 'AuditLogsPage', staffAuth);
    const about = await renderWithAuth(vite, '/src/features/info/pages/AboutPage.jsx', 'AboutPage', staffAuth);

    assert.match(adminAudit, /Audit Logs/i);
    assert.match(adminAudit, /Loading read-only audit records/i);
    assert.match(adminAudit, /Refresh Audit Logs/i);
    assert.match(staffAudit, /does not have permission/i);
    assert.doesNotMatch(staffAudit, /<h3>Audit Records<\/h3>/i);
    assert.match(about, /About the System/i);
    assert.match(about, /React frontend/i);
    console.log('Audit logs and informational pages smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[audit-info-smoke] Failed:', error);
  process.exitCode = 1;
});
