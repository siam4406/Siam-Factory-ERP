/**
 * hooks/useProduction.js
 * Hook that wraps productionService for React components.
 */
import { useState, useCallback } from 'react';
import { saveProductionEntry, saveCapProductionEntry, calcProductionCosts } from '../services/productionService.js';
import { loadRules } from '../services/businessRules.js';

export const useProduction = (logActivityFn) => {
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [preview,  setPreview]  = useState(null);   // live cost preview

  /**
   * Compute live cost preview without saving anything.
   * Call this as the user fills the form.
   */
  const previewCosts = useCallback(async (entryDraft) => {
    if (!entryDraft.materialUsedKg || !entryDraft.bottlesProduced) {
      setPreview(null);
      return null;
    }
    try {
      const rules = await loadRules();
      const costs = await calcProductionCosts(entryDraft, rules);
      setPreview(costs);
      return costs;
    } catch (e) {
      setPreview(null);
      return null;
    }
  }, []);

  const saveProduction = useCallback(async (entry) => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveProductionEntry(entry, logActivityFn);
      setPreview(null);
      return result;
    } catch (e) {
      setError(e.message || 'Failed to save production entry');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [logActivityFn]);

  const saveCapProduction = useCallback(async (entry) => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveCapProductionEntry(entry, logActivityFn);
      return result;
    } catch (e) {
      setError(e.message || 'Failed to save cap production entry');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [logActivityFn]);

  return { saving, error, preview, previewCosts, saveProduction, saveCapProduction };
};
