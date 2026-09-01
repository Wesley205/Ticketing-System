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
    const { ReportsPage } = await vite.ssrLoadModule('/src/features/reports/pages/ReportsPage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');

    const authValue = {
      isReady: true,
      isAuthenticated: true,
      accessProfile: {
        role: 'admin',
        permissions: {
          can_view_reports: true,
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(ReportsPage),
      ),
    );

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
