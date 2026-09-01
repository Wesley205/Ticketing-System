import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { LoginPage } = await vite.ssrLoadModule('/src/features/auth/pages/LoginPage.jsx');
  const { ActivationPage } = await vite.ssrLoadModule('/src/features/auth/pages/ActivationPage.jsx');
  const { ForbiddenPage } = await vite.ssrLoadModule('/src/features/auth/pages/ForbiddenPage.jsx');

  const loginHtml = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/login' },
      React.createElement(LoginPage)
    )
  );

  const activationHtml = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/activate?token=invite-token' },
      React.createElement(ActivationPage)
    )
  );

  const forbiddenHtml = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/forbidden' },
      React.createElement(ForbiddenPage)
    )
  );

  assert.match(loginHtml, /Sign in to your account/i);
  assert.match(activationHtml, /Accept invitation/i);
  assert.match(forbiddenHtml, /Access denied/i);

  console.log('Auth page smoke check passed.');
} finally {
  await vite.close();
}
