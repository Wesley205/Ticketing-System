import assert from 'node:assert/strict';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

function authValue(role) {
  const operational = role === 'admin' || role === 'ict_officer';
  return {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 1, full_name: operational ? 'Admin User' : 'Staff User', role },
    accessProfile: {
      role_label: operational ? 'Administrator' : 'Staff/User',
      permissions: {
        can_access_service_desk: true,
        can_access_dashboard: true,
        can_access_knowledge_base: true,
        can_manage_service_request_assignments: operational,
        can_access_notifications: true,
      },
    },
  };
}

function renderWithAuth(AuthContext, element, role, location) {
  return renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location },
      createElement(
        AuthContext.Provider,
        { value: authValue(role) },
        element
      )
    )
  );
}

try {
  const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
  const { ServiceRequestsPage } = await vite.ssrLoadModule('/src/features/service-requests/pages/ServiceRequestsPage.jsx');
  const { OperationalTicketDetail } = await vite.ssrLoadModule('/src/features/service-requests/components/OperationalTicketDetail.jsx');
  const { RequesterTicketDetail } = await vite.ssrLoadModule('/src/features/service-requests/components/RequesterTicketDetail.jsx');
  const { TicketActionCenter } = await vite.ssrLoadModule('/src/features/service-requests/components/TicketActionCenter.jsx');

  const listHtml = renderWithAuth(AuthContext, createElement(ServiceRequestsPage), 'admin', '/service-requests');
  const operationalDetailHtml = renderWithAuth(
    AuthContext,
    createElement(OperationalTicketDetail, {
      ticket: { request_id: 7, ticket_number: 'NSC-ICT-4902', subject: 'Secure briefing link', status: 'In Progress', priority: 'High', permissions: { allowed_status_transitions: ['Resolved'] } },
      isAdmin: true,
      onAssignOpen: () => {},
      onStatusSubmit: async () => {},
      onCommentSubmit: async () => {},
    }),
    'admin',
    '/service-requests/7'
  );
  const requesterDetailHtml = renderWithAuth(
    AuthContext,
    createElement(RequesterTicketDetail, {
      ticket: { request_id: 7, ticket_number: 'NSC-ICT-4902', subject: 'Secure briefing link', status: 'Resolved', priority: 'High', permissions: { allowed_status_transitions: ['Closed'] }, comments: [], attachments: [] },
      onStatusSubmit: async () => {},
      onCommentSubmit: async () => {},
      onAttachmentDownload: async () => {},
    }),
    'staff',
    '/service-requests/7'
  );

  assert.match(listHtml, /Service requests/i);
  assert.match(listHtml, /Operational Queue/i);
  assert.match(listHtml, /New Ticket/i);
  assert.doesNotMatch(listHtml, /Open full details/i);
  assert.match(operationalDetailHtml, /Internal Notes/i);
  assert.match(operationalDetailHtml, /SLA Status/i);
  assert.match(operationalDetailHtml, /Admin Override Controls/i);
  assert.match(requesterDetailHtml, /Confirm resolved/i);
  assert.match(requesterDetailHtml, /Messages/i);

  const assignedActionsHtml = renderWithAuth(
    AuthContext,
    createElement(TicketActionCenter, {
      ticket: { status: 'Assigned', technician_name: 'Aisha Lawal', permissions: { allowed_status_transitions: ['Accepted', 'Pending', 'In Progress'] } },
      onStatusSubmit: async () => {},
    }),
    'technician',
    '/technician/work/ticket/7'
  );
  assert.match(assignedActionsHtml, /Accept/i);
  assert.match(assignedActionsHtml, /Unavailable/i);
  assert.doesNotMatch(assignedActionsHtml, /Start work/i);

  const acceptedActionsHtml = renderWithAuth(
    AuthContext,
    createElement(TicketActionCenter, {
      ticket: { status: 'Accepted', technician_name: 'Aisha Lawal', permissions: { allowed_status_transitions: ['In Progress'] } },
      onStatusSubmit: async () => {},
    }),
    'technician',
    '/technician/work/ticket/7'
  );
  assert.match(acceptedActionsHtml, /Start work/i);
  assert.doesNotMatch(acceptedActionsHtml, /Resolve ticket/i);

  const inProgressActionsHtml = renderWithAuth(
    AuthContext,
    createElement(TicketActionCenter, {
      ticket: { status: 'In Progress', technician_name: 'Aisha Lawal', permissions: { allowed_status_transitions: ['Waiting for User', 'Waiting for Parts', 'Resolved'] } },
      onStatusSubmit: async () => {},
    }),
    'technician',
    '/technician/work/ticket/7'
  );
  assert.match(inProgressActionsHtml, /Waiting for user/i);
  assert.match(inProgressActionsHtml, /Waiting for parts/i);
  assert.match(inProgressActionsHtml, /Resolve ticket/i);
  assert.doesNotMatch(inProgressActionsHtml, /Accept/i);

  console.log('Service-request secure workspace smoke check passed.');
} finally {
  await vite.close();
}
