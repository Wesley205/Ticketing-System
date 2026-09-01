import { useEffect, useState } from 'react';
import {
  DEFAULT_KB_FILTERS,
  createArticle,
  fetchArticleDetail,
  fetchArticles,
  submitArticleFeedback,
  updateArticle,
} from '../services/knowledge-base-api.js';

export function useKnowledgeBase({ canManage = false, enabled = true } = {}) {
  const [filters, setFilters] = useState(DEFAULT_KB_FILTERS);
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  async function loadArticles(nextFilters = filters) {
    if (!enabled) return [];

    setIsLoading(true);
    setError('');
    try {
      const rows = await fetchArticles(nextFilters, canManage);
      setArticles(rows);
      return rows;
    } catch (err) {
      setError(err.message || 'Failed to load knowledge-base articles.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  async function selectArticle(articleId, { updateHash = true } = {}) {
    if (!articleId) return null;

    setIsDetailLoading(true);
    setDetailError('');
    try {
      const detail = await fetchArticleDetail(articleId);
      setSelectedArticle(detail);
      if (updateHash && typeof window !== 'undefined') {
        window.location.hash = `article-${articleId}`;
      }
      return detail;
    } catch (err) {
      setDetailError(err.message || 'Failed to load the selected article.');
      throw err;
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function submitArticle(payload, articleId = null) {
    setIsSubmitting(true);
    try {
      const saved = articleId
        ? await updateArticle(articleId, payload)
        : await createArticle(payload);
      setSelectedArticle(saved);
      if (typeof window !== 'undefined') {
        window.location.hash = `article-${saved.article_id}`;
      }
      await loadArticles(filters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendFeedback(isHelpful) {
    if (!selectedArticle?.article_id) return null;

    setIsSubmitting(true);
    try {
      await submitArticleFeedback(selectedArticle.article_id, { is_helpful: isHelpful });
      return selectArticle(selectedArticle.article_id, { updateHash: false });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    loadArticles(filters);
  }, [enabled, canManage, filters.search, filters.category, filters.status]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const match = window.location.hash.match(/article-(\d+)/);
    if (match) {
      selectArticle(Number(match[1]), { updateHash: false }).catch(() => {});
    }
  }, [enabled]);

  return {
    filters,
    articles,
    selectedArticle,
    isLoading,
    isDetailLoading,
    isSubmitting,
    error,
    detailError,
    updateFilter,
    loadArticles,
    selectArticle,
    submitArticle,
    sendFeedback,
  };
}
