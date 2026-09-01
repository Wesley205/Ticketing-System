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

  const authValue = {
    isReady: true,
    isAuthenticated: true,
    user: { user_id: 38, full_name: 'Admin User', role: 'admin' },
    accessProfile: {
      role_label: 'Administrator',
      permissions: {
        can_access_assets: true,
        can_manage_assets: true,
      },
    },
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

  assert.match(listHtml, /Assets/i);
  assert.match(listHtml, /Asset Registry/i);
  assert.match(detailHtml, /Asset Detail/i);

  console.log('Assets page smoke check passed.');
} finally {
  await vite.close();
}
