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
  const { AccountHelpPage } = await vite.ssrLoadModule('/src/features/auth/pages/AccountHelpPage.jsx');
  const { ForbiddenPage } = await vite.ssrLoadModule('/src/features/auth/pages/ForbiddenPage.jsx');
  const { NotFoundPage } = await vite.ssrLoadModule('/src/features/auth/pages/NotFoundPage.jsx');

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

  const helpHtml = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/help' },
      React.createElement(AccountHelpPage)
    )
  );

  const notFoundHtml = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/missing-page' },
      React.createElement(NotFoundPage)
    )
  );

  assert.match(loginHtml, /ICT Service Management/i);
  assert.match(loginHtml, /Sign In/i);
  assert.match(loginHtml, /Activate an invitation/i);
  assert.match(activationHtml, /Activate Invitation/i);
  assert.match(activationHtml, /Token \/ Invitation Code/i);
  assert.match(forbiddenHtml, /access to this page/i);
  assert.match(helpHtml, /Need help with your account/i);
  assert.match(helpHtml, /Automated password reset is not currently available/i);
  assert.match(notFoundHtml, /Page not found/i);

  console.log('Auth page smoke check passed.');
} finally {
  await vite.close();
}
