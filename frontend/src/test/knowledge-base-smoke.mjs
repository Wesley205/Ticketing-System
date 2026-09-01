import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { KnowledgeBasePage } = await vite.ssrLoadModule('/src/features/knowledge-base/pages/KnowledgeBasePage.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
    const { ToastProvider } = await vite.ssrLoadModule('/src/components/feedback/ToastProvider.jsx');

    const authValue = {
      isReady: true,
      isAuthenticated: true,
      user: { role: 'staff', user_id: 9 },
      accessProfile: {
        role: 'staff',
        role_label: 'Staff/User',
        permissions: {
          can_access_knowledge_base: true,
          can_manage_knowledge_base: false,
          can_provide_knowledge_base_feedback: true,
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(
        ToastProvider,
        null,
        createElement(
          AuthContext.Provider,
          { value: authValue },
          createElement(KnowledgeBasePage),
        ),
      ),
    );

    assert.match(html, /Knowledge Base/i);
    assert.match(html, /Loading knowledge-base articles/i);
    assert.doesNotMatch(html, /New Article/i);
    console.log('Knowledge Base page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[knowledge-base-smoke] Failed:', error);
  process.exitCode = 1;
});
