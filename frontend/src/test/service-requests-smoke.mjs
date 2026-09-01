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
  const { ServiceRequestsPage } = await vite.ssrLoadModule('/src/features/service-requests/pages/ServiceRequestsPage.jsx');
  const { TicketDetailPage } = await vite.ssrLoadModule('/src/features/service-requests/pages/TicketDetailPage.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 1, full_name: 'Admin User', role: 'admin' },
    accessProfile: {
      role_label: 'Administrator',
      permissions: {
        can_access_service_desk: true,
        can_manage_service_request_assignments: true,
      },
    },
  };

  const listHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/service-requests' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(ServiceRequestsPage)
      )
    )
  );

  const detailHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/service-requests/7' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(TicketDetailPage)
      )
    )
  );

  assert.match(listHtml, /Service Desk/i);
  assert.match(listHtml, /Ticket Workspace/i);
  assert.match(detailHtml, /Ticket Detail/i);

  console.log('Service-request page smoke check passed.');
} finally {
  await vite.close();
}
