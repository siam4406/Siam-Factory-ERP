/**
 * hooks/useAlerts.js
 * React hook that runs the business-rules engine and returns live alerts.
 */
import { useState, useEffect, useCallback } from 'react';
import { evaluateAllRules } from '../services/businessRules.js';

export const useAlerts = (refreshTrigger = 0) => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await evaluateAllRules();
      setAlerts(result);
    } catch (e) {
      console.error('Alert evaluation failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refreshTrigger, refresh]);

  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings  = alerts.filter(a => a.severity === 'warning');
  const infos     = alerts.filter(a => a.severity === 'info');

  return { alerts, criticals, warnings, infos, loading, refresh };
};
