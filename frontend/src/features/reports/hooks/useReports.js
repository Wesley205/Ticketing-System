import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_REPORT_FILTERS,
  DEFAULT_REPORT_PAGES,
  REPORT_PAGE_SIZE,
  downloadReportCsv,
  fetchReportFilters,
  fetchReportRows,
  fetchReportSummary,
  triggerCsvDownload,
} from '../services/reports-api.js';

export function useReports({ enabled = true } = {}) {
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [pages, setPages] = useState(DEFAULT_REPORT_PAGES);
  const [filterOptions, setFilterOptions] = useState({ departments: [], technicians: [], ticket_categories: [], ticket_types: [] });
  const [summary, setSummary] = useState(null);
  const [tables, setTables] = useState({
    tickets: null,
    assets: null,
    maintenance: null,
  });
  const [isLoading, setIsLoading] = useState(enabled);
  const [isExporting, setIsExporting] = useState(null);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  const pagination = useMemo(() => ({
    tickets: { page: pages.tickets, page_size: REPORT_PAGE_SIZE },
    assets: { page: pages.assets, page_size: REPORT_PAGE_SIZE },
    maintenance: { page: pages.maintenance, page_size: REPORT_PAGE_SIZE },
  }), [pages]);

  async function refresh(nextFilters = filters, nextPages = pages) {
    if (!enabled) return;

    setIsLoading(true);
    setError('');
    try {
      const [nextSummary, tickets, assets, maintenance] = await Promise.all([
        fetchReportSummary(nextFilters),
        fetchReportRows('tickets', nextFilters, { page: nextPages.tickets, page_size: REPORT_PAGE_SIZE }),
        fetchReportRows('assets', nextFilters, { page: nextPages.assets, page_size: REPORT_PAGE_SIZE }),
        fetchReportRows('maintenance', nextFilters, { page: nextPages.maintenance, page_size: REPORT_PAGE_SIZE }),
      ]);

      setSummary(nextSummary);
      setTables({ tickets, assets, maintenance });
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    fetchReportFilters()
      .then((data) => {
        if (!isMounted) return;
        setFilterOptions({
          departments: Array.isArray(data.departments) ? data.departments : [],
          technicians: Array.isArray(data.technicians) ? data.technicians : [],
          ticket_categories: Array.isArray(data.ticket_categories) ? data.ticket_categories : [],
          ticket_types: Array.isArray(data.ticket_types) ? data.ticket_types : [],
        });
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load report filters.');
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    refresh(filters, pages);
  }, [enabled, filters, pages]);

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPages(DEFAULT_REPORT_PAGES);
    setFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_REPORT_FILTERS);
    setPages(DEFAULT_REPORT_PAGES);
    setFilters(DEFAULT_REPORT_FILTERS);
  }

  function changePage(kind, delta) {
    setPages((current) => ({
      ...current,
      [kind]: Math.max(1, Number(current[kind] || 1) + delta),
    }));
  }

  async function exportCsv(kind) {
    setIsExporting(kind);
    setExportError('');
    try {
      const blob = await downloadReportCsv(kind, filters);
      triggerCsvDownload(blob, `${kind}_report.csv`);
    } catch (err) {
      setExportError(err.message || 'Export failed.');
    } finally {
      setIsExporting(null);
    }
  }

  return {
    filters,
    draftFilters,
    filterOptions,
    summary,
    tables,
    pages,
    pagination,
    isLoading,
    isExporting,
    error,
    exportError,
    updateDraftFilter,
    applyFilters,
    resetFilters,
    changePage,
    refresh,
    exportCsv,
  };
}
