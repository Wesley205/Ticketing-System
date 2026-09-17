import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { StaticRouter } from 'react-router-dom/server.js';

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { KnowledgeBasePage } = await vite.ssrLoadModule('/src/features/knowledge-base/pages/KnowledgeBasePage.jsx');
    const { ArticleDetail } = await vite.ssrLoadModule('/src/features/knowledge-base/components/ArticleDetail.jsx');
    const { AuthContext } = await vite.ssrLoadModule('/src/features/auth/hooks/useAuth.js');
    const { ToastProvider } = await vite.ssrLoadModule('/src/components/feedback/ToastProvider.jsx');

    const authValue = {
      isReady: true,
      isAuthenticated: true,
      user: { role: 'staff', user_id: 9, full_name: 'Staff User' },
      accessProfile: {
        role: 'staff',
        role_label: 'Staff/User',
        permissions: {
          can_access_dashboard: true,
          can_access_knowledge_base: true,
          can_manage_knowledge_base: false,
          can_provide_knowledge_base_feedback: true,
          can_access_notifications: true,
        },
      },
      logout: async () => {},
    };

    const html = renderToStaticMarkup(
      createElement(
        ToastProvider,
        null,
        createElement(
          StaticRouter,
          { location: '/knowledge-base' },
          createElement(
            AuthContext.Provider,
            { value: authValue },
            createElement(KnowledgeBasePage),
          ),
        ),
      ),
    );

    assert.match(html, /Knowledge Base/i);
    assert.match(html, /Standard Operating Procedures/i);
    assert.match(html, /Loading knowledge-base articles/i);
    assert.doesNotMatch(html, /Edit Library/i);

    const withArticles = renderToStaticMarkup(
      createElement(ArticleDetail, { article: null, hasArticles: true }),
    );
    const withoutArticles = renderToStaticMarkup(
      createElement(ArticleDetail, { article: null, hasArticles: false }),
    );

    assert.doesNotMatch(withArticles, /Select an article/i);
    assert.match(withoutArticles, /Select an article/i);
    console.log('Knowledge Base page smoke check passed.');
  } finally {
    await vite.close();
  }
}

main().catch((error) => {
  console.error('[knowledge-base-smoke] Failed:', error);
  process.exitCode = 1;
});
