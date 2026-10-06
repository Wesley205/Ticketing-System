import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { MaintenancePage } = await vite.ssrLoadModule('/src/features/maintenance/pages/MaintenancePage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');

    const authValue = {
      isReady: true,
      isAuthenticated: true,
      user: { user_id: 2, full_name: 'A. Nwosu', role: 'ict_officer' },
      accessProfile: {
        role: 'ict_officer',
        role_label: 'ICT Officer',
        permissions: {
          can_access_dashboard: true,
          can_access_service_desk: true,
          can_access_assets: true,
          can_manage_maintenance: true,
          can_manage_assets: true,
          can_access_notifications: true,
        },
      },
      logout: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/maintenance' },
        createElement(
          AuthContext.Provider,
          { value: authValue },
          createElement(MaintenancePage),
        ),
      ),
    );

    assert.match(html, /Maintenance/i);
    assert.match(html, /Maintenance Records/i);
    assert.match(html, /Records/i);
    assert.match(html, /Schedules/i);
    assert.match(html, /Log Maintenance/i);
    assert.match(html, /Create Schedule/i);
    console.log('Maintenance page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[maintenance-smoke] Failed:', error);
  process.exitCode = 1;
});
