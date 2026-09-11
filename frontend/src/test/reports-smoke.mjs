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
    const { ReportsPage } = await vite.ssrLoadModule('/src/features/reports/pages/ReportsPage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');

    const authValue = {
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
          can_access_notifications: true,
        },
      },
      logout: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/reports' },
        createElement(
          AuthContext.Provider,
          { value: authValue },
          createElement(ReportsPage),
        ),
      ),
    );

    assert.match(html, /Analytical Reports Hub/i);
    assert.match(html, /Loading reports/i);
    console.log('Reports page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[reports-smoke] Failed:', error);
  process.exitCode = 1;
});
