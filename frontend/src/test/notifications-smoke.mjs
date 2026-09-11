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
  const { NotificationInboxPage } = await vite.ssrLoadModule('/src/features/notifications/pages/NotificationInboxPage.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 12, full_name: 'A. Nwosu', role: 'ict_officer' },
    accessProfile: {
      role_label: 'ICT Officer',
      permissions: {
        can_access_dashboard: true,
        can_access_service_desk: true,
        can_access_assets: true,
        can_manage_maintenance: true,
        can_access_staff_portal: true,
        can_access_departments: true,
        can_access_knowledge_base: true,
        can_view_reports: true,
        can_view_audit_logs: true,
        can_access_notifications: true,
      },
    },
  };

  const html = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/notifications' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(NotificationInboxPage)
      )
    )
  );

  assert.match(html, /Notification System Workspace/i);
  assert.match(html, /Notification Feed/i);
  assert.match(html, /All Notifications/i);
  assert.match(html, /Unread/i);
  assert.match(html, /Mark All Read/i);
  assert.match(html, /Open notifications/i);

  console.log('Notification inbox smoke check passed.');
} finally {
  await vite.close();
}
