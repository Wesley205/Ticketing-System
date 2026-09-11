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
  const isAdmin = role === 'admin';
  const isOfficer = role === 'ict_officer';
  return {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 38, full_name: isAdmin ? 'Dr. C. Eze' : isOfficer ? 'A. Nwosu' : 'Marcus Andrew', role, user_type: 'employee' },
    accessProfile: {
      role,
      role_label: isAdmin ? 'Administrator' : isOfficer ? 'ICT Officer' : 'Staff/User',
      primary_portal: isAdmin ? 'administrator' : isOfficer ? 'ict_officer' : 'staff',
      scope: { organization_scope: isAdmin || isOfficer },
      permissions: {
        can_access_dashboard: true,
        can_access_service_desk: true,
        can_access_assets: true,
        can_manage_maintenance: isAdmin || isOfficer,
        can_access_staff_portal: isAdmin || isOfficer,
        can_access_departments: isAdmin || isOfficer,
        can_access_knowledge_base: true,
        can_view_reports: isAdmin || isOfficer,
        can_view_audit_logs: isAdmin || isOfficer,
        can_access_notifications: true,
      },
    },
  };
}

function renderDashboard(AuthContext, DashboardPage, role) {
  return renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/dashboard' },
      createElement(
        AuthContext.Provider,
        { value: authValue(role) },
        createElement(DashboardPage)
      )
    )
  );
}

try {
  const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
  const { DashboardPage } = await vite.ssrLoadModule('/src/features/dashboard/pages/DashboardPage.jsx');

  const staffHtml = renderDashboard(AuthContext, DashboardPage, 'staff');
  const officerHtml = renderDashboard(AuthContext, DashboardPage, 'ict_officer');
  const adminHtml = renderDashboard(AuthContext, DashboardPage, 'admin');

  assert.match(staffHtml, /Staff dashboard/i);
  assert.match(staffHtml, /Welcome back/i);
  assert.match(staffHtml, /Your recent requests/i);

  assert.match(officerHtml, /ICT Officer Dashboard/i);
  assert.match(officerHtml, /ICT Operations/i);
  assert.match(officerHtml, /Technician Workload/i);

  assert.match(adminHtml, /Admin Dashboard/i);
  assert.match(adminHtml, /Administrator Command Dashboard/i);
  assert.match(adminHtml, /Recent Audit Activity/i);

  console.log('Dashboard role-aware smoke check passed.');
} finally {
  await vite.close();
}
