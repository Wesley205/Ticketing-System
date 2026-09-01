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
          can_access_departments: true,
          can_manage_departments: false,
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(DepartmentsPage),
      ),
    );

    assert.match(html, /Departments/i);
    assert.match(html, /Loading departments/i);
    assert.doesNotMatch(html, /Add Department/i);
    console.log('Departments page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[departments-smoke] Failed:', error);
  process.exitCode = 1;
});
