/**
 * hooks/useReports.js
 * Hook that surfaces analytics from profitCalculator service.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getFullProfitLoss,
  getMonthlyTrend,
  getOperatorStats,
  getMaterialConsumptionStats,
  getMachinePerformance,
  getDailySummary,
} from '../services/profitCalculator.js';

export const useReports = (period = {}) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pnl, trend, operators, materials, machines, daily] = await Promise.all([
        getFullProfitLoss(period),
        getMonthlyTrend(6),
        getOperatorStats(period.from, period.to),
        getMaterialConsumptionStats(period.from, period.to),
        getMachinePerformance(period.from, period.to),
        getDailySummary(),
      ]);
      setData({ pnl, trend, operators, materials, machines, daily });
    } catch (e) {
      console.error('Report load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refresh: load };
};
