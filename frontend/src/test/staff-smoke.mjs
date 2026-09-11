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
  const { StaffPage } = await vite.ssrLoadModule('/src/features/staff/pages/StaffPage.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 38, full_name: 'Admin User', role: 'admin' },
    accessProfile: {
      role_label: 'Administrator',
        permissions: {
          can_access_dashboard: true,
          can_access_staff_portal: true,
          can_manage_users: true,
          can_create_invitation: true,
          can_access_notifications: true,
        },
      },
      logout: async () => {},
  };

  const html = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/staff' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(StaffPage)
      )
    )
  );

  assert.match(html, /Staff &amp; Access Control Hub/i);
  assert.match(html, /Staff Directory/i);
  assert.match(html, /Invite Staff/i);
  assert.match(html, /Pending Invitations/i);

  console.log('Staff page smoke check passed.');
} finally {
  await vite.close();
}
