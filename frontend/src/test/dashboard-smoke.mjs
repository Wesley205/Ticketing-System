import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
  const { DashboardPage } = await vite.ssrLoadModule('/src/features/dashboard/pages/DashboardPage.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 38, full_name: 'Admin User', role: 'admin', user_type: 'employee' },
    accessProfile: {
      role_label: 'Administrator',
      primary_portal: 'administrator',
      scope: { organization_scope: true },
      permissions: {
        can_access_dashboard: true,
        can_view_reports: true,
      },
    },
  };

  const html = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/dashboard' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(DashboardPage)
      )
    )
  );

  assert.match(html, /Administrator command view/i);
  assert.match(html, /Dashboard Filters/i);

  console.log('Dashboard page smoke check passed.');
} finally {
  await vite.close();
}
