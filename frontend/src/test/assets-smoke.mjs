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
  const { AssetsPage } = await vite.ssrLoadModule('/src/features/assets/pages/AssetsPage.jsx');
  const { AssetDetailPage } = await vite.ssrLoadModule('/src/features/assets/pages/AssetDetailPage.jsx');
  const { AssetDetail } = await vite.ssrLoadModule('/src/features/assets/components/AssetDetail.jsx');

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 38, full_name: 'Admin User', role: 'admin' },
    accessProfile: {
      role_label: 'Administrator',
      permissions: {
        can_access_assets: true,
        can_access_dashboard: true,
        can_access_service_desk: true,
        can_manage_assets: true,
        can_access_notifications: true,
      },
    },
    logout: async () => {},
  };

  const listHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/assets' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(AssetsPage)
      )
    )
  );

  const detailHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/assets/7' },
      createElement(
        AuthContext.Provider,
        { value: authValue },
        createElement(AssetDetailPage)
      )
    )
  );

  const componentHtml = renderToStaticMarkup(
    createElement(
      StaticRouter,
      { location: '/assets/7' },
      createElement(AssetDetail, {
        asset: {
          asset_id: 7,
          asset_tag: 'NSC-PRN-0014',
          asset_type: 'Printer',
          brand: 'HP',
          model: 'LaserJet Pro M404',
          status: 'Assigned',
          condition: 'Good',
          department_name: 'Communications',
          assigned_staff_name: 'Col. Vance',
          linked_tickets: [{ request_id: 3, ticket_number: 'NSC-ICT-4902', subject: 'Printer not responding', status: 'In Progress' }],
          maintenance_history: [{ maintenance_id: 4, maintenance_type: 'Calibration', problem: 'Toner alignment', status: 'Completed', maintenance_date: '2026-03-01' }],
        },
        canManage: true,
        canDelete: true,
        onEdit: () => {},
        onAssign: () => {},
        onReturn: () => {},
        onDelete: () => {},
      })
    )
  );

  assert.match(listHtml, /Assets/i);
  assert.match(listHtml, /Asset Registry/i);
  assert.match(listHtml, /Register Asset/i);
  assert.match(detailHtml, /ICT Service Desk Workspace/i);
  assert.match(componentHtml, /Asset details/i);
  assert.match(componentHtml, /Maintenance history/i);
  assert.match(componentHtml, /Admin controls/i);

  console.log('Assets page smoke check passed.');
} finally {
  await vite.close();
}
