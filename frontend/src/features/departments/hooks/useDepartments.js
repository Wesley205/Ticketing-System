import { useEffect, useMemo, useState } from 'react';
import {
  createDepartment,
  fetchDepartmentDetail,
  fetchDepartments,
  filterDepartmentsBySearch,
  updateDepartment,
} from '../services/departments-api.js';

export function useDepartments({ enabled = true } = {}) {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(enabled);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  async function loadDepartments() {
    if (!enabled) return;

    setIsLoading(true);
    setError('');
    try {
      setDepartments(await fetchDepartments());
    } catch (err) {
      setError(err.message || 'Failed to load departments.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDepartmentDetail(departmentId) {
    setIsDetailLoading(true);
    setDetailError('');
    try {
      const detail = await fetchDepartmentDetail(departmentId);
      setSelectedDepartment(detail);
      return detail;
    } catch (err) {
      setDetailError(err.message || 'Failed to load department detail.');
      throw err;
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function submitDepartment(payload, departmentId = null) {
    setIsSubmitting(true);
    try {
      const saved = departmentId
        ? await updateDepartment(departmentId, payload)
        : await createDepartment(payload);
      await loadDepartments();
      if (selectedDepartment && Number(selectedDepartment.department_id) === Number(saved.department_id)) {
        await loadDepartmentDetail(saved.department_id);
      }
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, [enabled]);

  const visibleDepartments = useMemo(
    () => filterDepartmentsBySearch(departments, search),
    [departments, search],
  );

  return {
    departments: visibleDepartments,
    allDepartments: departments,
    selectedDepartment,
    search,
    isLoading,
    isDetailLoading,
    isSubmitting,
    error,
    detailError,
    setSearch,
    setSelectedDepartment,
    loadDepartments,
    loadDepartmentDetail,
    submitDepartment,
  };
}
