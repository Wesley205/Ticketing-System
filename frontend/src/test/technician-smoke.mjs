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
  const { TechnicianAssignedWorkPage } = await vite.ssrLoadModule('/src/features/technician/pages/TechnicianAssignedWorkPage.jsx');
  const { TechnicianTicketExecution } = await vite.ssrLoadModule('/src/features/technician/components/TechnicianTicketExecution.jsx');
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

  const assignedWorkHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/technician/assigned-work' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(TechnicianAssignedWorkPage)
      )
    )
  );

  const executionHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/technician/work/ticket/7' },
      createElement(TechnicianTicketExecution, {
        ticket: {
          request_id: 7,
          ticket_number: 'NSC-ICT-4902',
          subject: 'Network printer not responding on 3rd floor secure desk briefing link',
          status: 'In Progress',
          priority: 'High',
          description: 'Secure printer cannot transmit spooler protocols.',
          requester_name: 'Col. Adamu Vance',
          department_name: 'Communications Division',
          affected_asset_tag: 'PRNT-3F-SECURE-01',
          sla_resolution_due_at: '2026-09-11T16:00:00Z',
          attachments: [],
        },
        onStatusSubmit: async () => {},
        onCommentSubmit: async () => {},
        onAttachmentUpload: async () => {},
        onAttachmentDownload: async () => {},
      })
    )
  );

  assert.match(dashboardHtml, /Technician Dashboard/i);
  assert.match(dashboardHtml, /Next Actionable Work/i);
  assert.match(dashboardHtml, /Priority queue/i);
  assert.match(dashboardHtml, /Maintenance Due Today/i);
  assert.match(dashboardHtml, /Assigned Work/i);
  assert.match(dashboardHtml, /Log out/i);
  assert.match(assignedWorkHtml, /Technician Work Center/i);
  assert.match(assignedWorkHtml, /Create Ticket/i);
  assert.match(assignedWorkHtml, /My Assigned Active Tickets/i);
  assert.match(ticketHtml, /Ticket Execution|Work item not found/i);
  assert.match(executionHtml, /Ticket Context &amp; Assets/i);
  assert.match(executionHtml, /Update Ticket Status/i);
  assert.match(executionHtml, /Evidence Files/i);
  assert.match(executionHtml, /Resolution Details/i);

  console.log('Technician workspace smoke check passed.');
} finally {
  await vite.close();
}
