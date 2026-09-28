import { useState } from "react";
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
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const hasArticles = kb.articles.length > 0;
  const showDetailPanel = Boolean(kb.selectedArticle) || !hasArticles;

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
    <SecureWorkspaceLayout title="Knowledge Base" subtitle="ICT Service Hub">
      <div className="kb-page-react secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Standard Operating Procedures</h2>
            <p>
              Find step-by-step guides for secure operations, hardware setup,
              and network troubleshooting.
            </p>
          </div>
          <div className="service-desk-secure-actions responsive-action-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => kb.loadArticles(kb.filters)}
            >
              Refresh
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setEditingArticle(null);
                  setFormOpen(true);
                }}
              >
                Edit Library
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

        <div className={`kb-layout-react ${showDetailPanel ? '' : 'kb-layout-list-only'}`.trim()}>
          <section className="secure-data-panel">
            <ArticleFilters
              filters={kb.filters}
              canManage={canManage}
              onChange={kb.updateFilter}
              onCreate={() => {
                setEditingArticle(null);
                setFormOpen(true);
              }}
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
                onSelect={(articleId) => kb.selectArticle(articleId)}
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
