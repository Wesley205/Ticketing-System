import { useMemo, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { ArticleDetail } from '../components/ArticleDetail.jsx';
import { ArticleFilters } from '../components/ArticleFilters.jsx';
import { ArticleFormModal } from '../components/ArticleFormModal.jsx';
import { ArticleList } from '../components/ArticleList.jsx';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase.js';

export function KnowledgeBasePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(auth.accessProfile, 'can_manage_knowledge_base');
  const canFeedback = hasPermission(auth.accessProfile, 'can_provide_knowledge_base_feedback');
  const kb = useKnowledgeBase({
    canManage,
    enabled: auth.isReady && auth.isAuthenticated,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);

  const meta = useMemo(() => {
    const selectedLabel = kb.selectedArticle?.title
      ? `Selected: ${kb.selectedArticle.title}`
      : 'No article selected';
    return [
      auth.accessProfile?.role_label || auth.user?.role || 'User',
      `${kb.articles.length} visible articles`,
      canManage ? 'Article management enabled' : 'Read-only article access',
      selectedLabel,
    ];
  }, [auth.accessProfile?.role_label, auth.user?.role, canManage, kb.articles.length, kb.selectedArticle?.title]);

  async function handleSubmit(payload) {
    const saved = await kb.submitArticle(payload, editingArticle?.article_id || null);
    showToast({
      tone: 'success',
      title: editingArticle ? 'Article updated' : 'Article created',
      message: saved?.title || payload.title,
    });
    setEditingArticle(null);
    return saved;
  }

  async function handleFeedback(isHelpful) {
    if (!kb.selectedArticle) return;
    await kb.sendFeedback(isHelpful);
    showToast({
      tone: 'success',
      title: 'Feedback recorded',
      message: 'Your article feedback has been saved.',
    });
  }

  return (
    <div className="kb-page-react ui-stack-lg">
      <PageHero
        eyebrow="Phase 8"
        title="Knowledge Base"
        description="Search support articles, review article history, submit usefulness feedback, and manage published ICT guidance where permitted."
        meta={meta}
      />

      <Panel
        title="Article Search"
        actions={(
          <div className="ui-inline-actions">
            <Button variant="secondary" onClick={() => kb.loadArticles(kb.filters)}>Refresh</Button>
            <a href="/knowledge-base">
              <Button variant="secondary">Refresh Knowledge Base</Button>
            </a>
          </div>
        )}
      >
        <ArticleFilters
          filters={kb.filters}
          canManage={canManage}
          onChange={kb.updateFilter}
          onCreate={() => {
            setEditingArticle(null);
            setFormOpen(true);
          }}
        />
      </Panel>

      {kb.error ? (
        <ErrorState
          title="Knowledge base unavailable"
          description={kb.error}
          onRetry={() => kb.loadArticles(kb.filters)}
        />
      ) : null}

      <div className="kb-layout-react">
        <Panel title="Articles">
          {kb.isLoading ? (
            <LoadingState description="Loading knowledge-base articles..." />
          ) : (
            <ArticleList
              articles={kb.articles}
              selectedArticleId={kb.selectedArticle?.article_id}
              onSelect={(articleId) => kb.selectArticle(articleId)}
            />
          )}
        </Panel>

        <ArticleDetail
          article={kb.selectedArticle}
          isLoading={kb.isDetailLoading}
          error={kb.detailError}
          canManage={canManage}
          canFeedback={canFeedback}
          onRetry={() => kb.selectedArticle?.article_id && kb.selectArticle(kb.selectedArticle.article_id)}
          onEdit={() => {
            setEditingArticle(kb.selectedArticle);
            setFormOpen(true);
          }}
          onFeedback={handleFeedback}
        />
      </div>

      {canManage ? (
        <ArticleFormModal
          open={formOpen}
          article={editingArticle}
          onClose={() => {
            setFormOpen(false);
            setEditingArticle(null);
          }}
          isSubmitting={kb.isSubmitting}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}
