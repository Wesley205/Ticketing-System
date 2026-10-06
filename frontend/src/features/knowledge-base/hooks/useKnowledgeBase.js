import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_KB_FILTERS,
  createArticle,
  fetchArticleDetail,
  fetchArticles,
  submitArticleFeedback,
  updateArticle,
} from '../services/knowledge-base-api.js';

export function useKnowledgeBase({ canManage = false, enabled = true, routeArticleId = null, onArticleSelected } = {}) {
  const [filters, setFilters] = useState(DEFAULT_KB_FILTERS);
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const selectionCallbackRef = useRef(onArticleSelected);
  selectionCallbackRef.current = onArticleSelected;

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

  async function selectArticle(articleId, { updateRoute = true } = {}) {
    if (!articleId) return null;

    setIsDetailLoading(true);
    setDetailError('');
    try {
      const detail = await fetchArticleDetail(articleId);
      setSelectedArticle(detail);
      if (updateRoute) selectionCallbackRef.current?.(detail.article_id);
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
      selectionCallbackRef.current?.(saved.article_id);
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
      return selectArticle(selectedArticle.article_id, { updateRoute: false });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(DEFAULT_KB_FILTERS);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    loadArticles({ ...filters, search: debouncedSearch }).then((rows) => {
      const isCompactView = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 720px)').matches;
      if (!isCompactView && !routeArticleId && !selectedArticle && rows[0]) {
        selectArticle(rows[0].article_id).catch(() => {});
      }
    });
  }, [enabled, canManage, debouncedSearch, filters.category, filters.status]);

  useEffect(() => {
    if (!enabled || !routeArticleId) return;
    if (Number(selectedArticle?.article_id) === Number(routeArticleId)) return;
    selectArticle(Number(routeArticleId), { updateRoute: false }).catch(() => {});
  }, [enabled, routeArticleId]);

  return {
    filters,
    articles,
    selectedArticle,
    isLoading,
    isDetailLoading,
    isSubmitting,
    error,
    detailError,
    debouncedSearch,
    updateFilter,
    clearFilters,
    loadArticles,
    selectArticle,
    submitArticle,
    sendFeedback,
  };
}
