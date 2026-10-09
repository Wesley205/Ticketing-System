import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppIcon } from "../../../components/icons/AppIcon.jsx";
import { EmptyState } from "../../../components/feedback/EmptyState.jsx";
import { Button } from "../../../components/forms/Button.jsx";
import { ErrorState } from "../../../components/feedback/ErrorState.jsx";
import { LoadingState } from "../../../components/feedback/LoadingState.jsx";
import { SecureWorkspaceLayout } from "../../../components/layout/SecureWorkspaceLayout.jsx";
import { useToast } from "../../../hooks/useToast.js";
import { hasPermission } from "../../../permissions/access.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { ArticleDetail } from "../components/ArticleDetail.jsx";
import { ArticleFilters } from "../components/ArticleFilters.jsx";
import { ArticleFormModal } from "../components/ArticleFormModal.jsx";
import { ArticleList } from "../components/ArticleList.jsx";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase.js";

export function KnowledgeBasePage() {
  const navigate = useNavigate();
  const { articleId } = useParams();
  const auth = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(
    auth.accessProfile,
    "can_manage_knowledge_base",
  );
  const canFeedback = hasPermission(
    auth.accessProfile,
    "can_provide_knowledge_base_feedback",
  );
  const kb = useKnowledgeBase({
    canManage,
    enabled: auth.isReady && auth.isAuthenticated,
    routeArticleId: articleId,
    onArticleSelected: (selectedId) => navigate(`/knowledge-base/${selectedId}`),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const hasArticles = kb.articles.length > 0;
  const hasActiveFilters = Boolean(kb.filters.search || kb.filters.category || (canManage && kb.filters.status));
  const showEmptyLibrary = !kb.isLoading && !kb.error && !hasArticles && !hasActiveFilters;

  async function handleSubmit(payload) {
    const saved = await kb.submitArticle(
      payload,
      editingArticle?.article_id || null,
    );
    showToast({
      tone: "success",
      title: editingArticle ? "Article updated" : "Article created",
      message: saved?.title || payload.title,
    });
    setEditingArticle(null);
    return saved;
  }

  async function handleFeedback(isHelpful) {
    if (!kb.selectedArticle) return;
    await kb.sendFeedback(isHelpful);
    showToast({
      tone: "success",
      title: "Feedback recorded",
      message: "Your article feedback has been saved.",
    });
  }

  return (
    <SecureWorkspaceLayout
      title="Knowledge Base"
      subtitle="ICT Service Hub"
      breadcrumbs={articleId ? [{ label: 'Knowledge Base', to: '/knowledge-base' }, { label: kb.selectedArticle?.title || 'Article detail' }] : []}
    >
      <div className="kb-page-react secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Knowledge Base</h2>
            <p>
              Find answers to common ICT problems.
            </p>
          </div>
          <div className="service-desk-secure-actions responsive-action-row">
            <Button
              variant="secondary"
              size="sm"
              className="ui-icon-button"
              aria-label="Refresh articles"
              title="Refresh articles"
              onClick={() => kb.loadArticles(kb.filters)}
            >
              <AppIcon name="refresh" size={17} />
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setEditingArticle(null);
                  setFormOpen(true);
                }}
              >
                <AppIcon name="plus" size={17} />
                New Article
              </Button>
            ) : null}
          </div>
        </div>

        {kb.error ? (
          <ErrorState
            title="Knowledge base unavailable"
            description={kb.error}
            onRetry={() => kb.loadArticles(kb.filters)}
          />
        ) : null}

        {showEmptyLibrary ? (
          <EmptyState
            title="No knowledge articles yet"
            description="Create the first approved guide for common ICT tasks and support issues."
            actionLabel={canManage ? 'Create article' : ''}
            onAction={() => {
              setEditingArticle(null);
              setFormOpen(true);
            }}
          />
        ) : (
        <div className={`kb-layout-react ${articleId ? 'kb-has-selection' : ''}`.trim()}>
          <section className="secure-data-panel">
            <ArticleFilters
              filters={kb.filters}
              canManage={canManage}
              resultCount={kb.articles.length}
              onChange={kb.updateFilter}
              onClear={kb.clearFilters}
            />
            {kb.isLoading ? (
              <LoadingState
                variant="table"
                description="Loading knowledge-base articles..."
              />
            ) : (
              <ArticleList
                articles={kb.articles}
                selectedArticleId={kb.selectedArticle?.article_id}
                hasActiveFilters={hasActiveFilters}
                onSelect={(selectedId) => navigate(`/knowledge-base/${selectedId}`)}
              />
            )}
          </section>

          <ArticleDetail
            article={kb.selectedArticle}
            isLoading={kb.isDetailLoading}
            error={kb.detailError}
            canManage={canManage}
            canFeedback={canFeedback}
            hasArticles={hasArticles}
            onBack={() => navigate('/knowledge-base')}
            onRetry={() =>
              kb.selectedArticle?.article_id &&
              kb.selectArticle(kb.selectedArticle.article_id)
            }
            onEdit={() => {
              setEditingArticle(kb.selectedArticle);
              setFormOpen(true);
            }}
            onFeedback={handleFeedback}
          />
        </div>
        )}
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
    </SecureWorkspaceLayout>
  );
}
