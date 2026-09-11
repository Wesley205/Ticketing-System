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
    const { DepartmentsPage } = await vite.ssrLoadModule('/src/features/departments/pages/DepartmentsPage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');

    const authValue = {
      isReady: true,
      isAuthenticated: true,
      user: { role: 'staff', user_id: 9 },
      accessProfile: {
        role: 'staff',
        role_label: 'Staff/User',
        permissions: {
          can_access_dashboard: true,
          can_access_departments: true,
          can_manage_departments: false,
          can_access_knowledge_base: true,
          can_access_notifications: true,
        },
      },
      logout: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        StaticRouter,
        { location: '/departments' },
        createElement(
          AuthContext.Provider,
          { value: authValue },
          createElement(DepartmentsPage),
        ),
      ),
    );

    assert.match(html, /NSC Departments Hub/i);
    assert.match(html, /Departments Directory/i);
    assert.match(html, /Loading departments/i);
    assert.doesNotMatch(html, /New Department/i);
    console.log('Departments page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[departments-smoke] Failed:', error);
  process.exitCode = 1;
});
