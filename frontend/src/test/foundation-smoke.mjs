import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

const originalError = console.error;
console.error = (...args) => {
  const [firstArg] = args;
  if (typeof firstArg === 'string' && firstArg.includes('useLayoutEffect does nothing on the server')) {
    return;
  }

  originalError(...args);
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { AppShell } = await vite.ssrLoadModule('/src/components/layout/AppShell.jsx');
  const { FoundationShowcase } = await vite.ssrLoadModule('/src/components/layout/FoundationShowcase.jsx');
  const { ToastProvider } = await vite.ssrLoadModule('/src/components/feedback/ToastProvider.jsx');

  const html = renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: '/foundation' },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          AppShell,
          {
            title: 'Shared Foundation',
            subtitle: 'Verification shell',
            eyebrow: 'Phase 2',
          },
          React.createElement(FoundationShowcase)
        )
      )
    )
  );

  assert.match(html, /ICT Service Desk/i);
  assert.match(html, /Shared React Component Library/i);
  assert.match(html, /Buttons, badges, and toasts/i);
  assert.match(html, /Detail panel, timeline, comments, and attachments/i);

  console.log('Foundation component smoke check passed.');
} finally {
  await vite.close();
  console.error = originalError;
}
