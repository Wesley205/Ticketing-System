import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

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
      user: { role: 'ict_officer' },
      accessProfile: {
        role: 'ict_officer',
        role_label: 'ICT Officer',
        permissions: {
          can_manage_maintenance: true,
          can_manage_assets: true,
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(MaintenancePage),
      ),
    );

    assert.match(html, /Maintenance/i);
    assert.match(html, /Loading maintenance records/i);
    console.log('Maintenance page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[maintenance-smoke] Failed:', error);
  process.exitCode = 1;
});
