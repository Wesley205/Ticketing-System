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
  const { TechnicianDashboardPage } = await vite.ssrLoadModule('/src/features/technician/pages/TechnicianDashboardPage.jsx');
  const { TechnicianWorkItemPage } = await vite.ssrLoadModule('/src/features/technician/pages/TechnicianWorkItemPage.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 11, full_name: 'Technician User', role: 'technician' },
    accessProfile: {
      role_label: 'Technician',
      permissions: {
        can_access_technician_portal: true,
        can_access_service_desk: true,
      },
    },
  };

  const dashboardHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/technician' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(TechnicianDashboardPage)
      )
    )
  );

  const ticketHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/technician/work/ticket/7' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(TechnicianWorkItemPage)
      )
    )
  );

  assert.match(dashboardHtml, /Technician Workspace/i);
  assert.match(dashboardHtml, /Assigned Tickets/i);
  assert.match(ticketHtml, /Technician Ticket Detail|Work item not found/i);

  console.log('Technician workspace smoke check passed.');
} finally {
  await vite.close();
}
