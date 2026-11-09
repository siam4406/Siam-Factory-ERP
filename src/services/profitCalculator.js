/**
 * services/profitCalculator.js
 * Advanced BDT accounting and profit analytics engine.
 * Works entirely offline from IndexedDB data.
 */

import { getAllRecords, STORES } from '../database/db.js';
import { getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';

// ─── BDT formatting (Bangladeshi lakh-crore system) ──────────────────────────

export const formatBDTFull = (amount) => {
  if (amount === undefined || amount === null) return '৳0';
  const n = Math.abs(Math.round(amount));
  let formatted;
  if (n >= 10000000) {        // crore
    formatted = (n / 10000000).toFixed(2) + ' Cr';
  } else if (n >= 100000) {   // lakh
    formatted = (n / 100000).toFixed(2) + ' L';
  } else if (n >= 1000) {
    formatted = n.toLocaleString('en-IN');
  } else {
    formatted = n.toString();
  }
  return (amount < 0 ? '-' : '') + '৳' + formatted;
};

export const formatBDTExact = (amount) => {
  if (amount === undefined || amount === null) return '৳0';
  return '৳' + Number(amount).toLocaleString('en-IN');
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const todayStr  = () => new Date().toISOString().split('T')[0];
const monthStr  = () => todayStr().slice(0, 7);

const filterByDate = (arr, dateField, from, to) =>
  arr.filter(item => item[dateField] >= from && item[dateField] <= to);

// ─── Core calculations ────────────────────────────────────────────────────────

/**
 * Production cost summary for a set of production entries.
 */
export const sumProductionCosts = (entries) => {
  return entries.reduce(
    (acc, p) => ({
      materialCost:    acc.materialCost    + (p.materialCost    || 0),
      electricityCost: acc.electricityCost + (p.electricityCost || 0),
      laborCost:       acc.laborCost       + (p.laborCost       || 0),
      totalCost:       acc.totalCost       + (p.totalCost       || 0),
      bottles:         acc.bottles         + (p.bottlesProduced || 0),
      goodBottles:     acc.goodBottles     + (p.goodBottles     || p.bottlesProduced || 0),
      rejects:         acc.rejects         + (p.rejectQuantity  || 0),
      matKg:           acc.matKg           + (p.materialUsedKg  || 0),
      wastedKg:        acc.wastedKg        + (p.wastedKg        || 0),
    }),
    { materialCost: 0, electricityCost: 0, laborCost: 0, totalCost: 0,
      bottles: 0, goodBottles: 0, rejects: 0, matKg: 0, wastedKg: 0 }
  );
};

/**
 * Sales summary for a set of sales entries.
 */
export const sumSales = (entries) => entries.reduce(
  (acc, s) => ({
    revenue: acc.revenue + (s.total || 0),
    paid:    acc.paid    + (s.paid  || 0),
    due:     acc.due     + (s.due   || 0),
    count:   acc.count   + 1,
  }),
  { revenue: 0, paid: 0, due: 0, count: 0 }
);

/**
 * Expense summary.
 */
export const sumExpenses = (entries) => {
  const byCat = {};
  let total = 0;
  for (const e of entries) {
    byCat[e.category] = (byCat[e.category] || 0) + (e.amount || 0);
    total += (e.amount || 0);
  }
  return { total, byCat };
};

// ─── Period P&L ───────────────────────────────────────────────────────────────

/**
 * getFullProfitLoss({ from, to })
 * Returns complete P&L breakdown for a date range.
 */
export const getFullProfitLoss = async ({ from, to } = {}) => {
  const f  = from || '2020-01-01';
  const t  = to   || todayStr();

  const [production, capProd, sales, expenses] = await Promise.all([
    getAllRecords(STORES.production),
    getAllRecords(STORES.cap_production),
    getAllRecords(STORES.sales),
    getAllRecords(STORES.expenses),
  ]);

  const filtProd   = filterByDate(production, 'date', f, t);
  const filtCap    = filterByDate(capProd,    'date', f, t);
  const filtSales  = filterByDate(sales,      'date', f, t);
  const filtExp    = filterByDate(expenses,   'date', f, t);

  const prodCosts  = sumProductionCosts([...filtProd, ...filtCap]);
  const salesSum   = sumSales(filtSales);
  const expSum     = sumExpenses(filtExp);

  const grossProfit  = salesSum.revenue - prodCosts.totalCost;
  const netProfit    = salesSum.revenue - prodCosts.totalCost - expSum.total;
  const profitMargin = salesSum.revenue > 0 ? (netProfit / salesSum.revenue) * 100 : 0;

  const avgCostPerBottle = prodCosts.goodBottles > 0
    ? prodCosts.totalCost / prodCosts.goodBottles : 0;
  const rejectPct = prodCosts.bottles > 0
    ? (prodCosts.rejects / prodCosts.bottles) * 100 : 0;
  const wastagePct = prodCosts.matKg > 0
    ? (prodCosts.wastedKg / prodCosts.matKg) * 100 : 0;

  return {
    period: { from: f, to: t },
    sales: {
      revenue:      salesSum.revenue,
      paid:         salesSum.paid,
      due:          salesSum.due,
      transactions: salesSum.count,
    },
    production: {
      materialCost:    prodCosts.materialCost,
      electricityCost: prodCosts.electricityCost,
      laborCost:       prodCosts.laborCost,
      totalCost:       prodCosts.totalCost,
      bottles:         prodCosts.bottles,
      goodBottles:     prodCosts.goodBottles,
      rejects:         prodCosts.rejects,
      matKgUsed:       prodCosts.matKg,
      wastedKg:        prodCosts.wastedKg,
      rejectPct:       parseFloat(rejectPct.toFixed(2)),
      wastagePct:      parseFloat(wastagePct.toFixed(2)),
      avgCostPerBottle: parseFloat(avgCostPerBottle.toFixed(2)),
    },
    expenses: {
      total: expSum.total,
      byCat: expSum.byCat,
    },
    profit: {
      grossProfit:   Math.round(grossProfit),
      netProfit:     Math.round(netProfit),
      profitMargin:  parseFloat(profitMargin.toFixed(2)),
    },
  };
};

// ─── Monthly trend data ───────────────────────────────────────────────────────

/**
 * getMonthlyTrend(months = 6)
 * Returns array of { month, revenue, cost, expenses, netProfit, bottles } for chart.
 */
export const getMonthlyTrend = async (months = 6) => {
  const [production, capProd, sales, expenses] = await Promise.all([
    getAllRecords(STORES.production),
    getAllRecords(STORES.cap_production),
    getAllRecords(STORES.sales),
    getAllRecords(STORES.expenses),
  ]);

  const result = [];
  const now    = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const fp = [...production, ...capProd].filter(p => p.date?.startsWith(key));
    const fs = sales.filter(s => s.date?.startsWith(key));
    const fe = expenses.filter(e => e.date?.startsWith(key));

    const pc  = sumProductionCosts(fp);
    const ss  = sumSales(fs);
    const es  = sumExpenses(fe);

    result.push({
      month:     key.slice(5),      // "01", "02" etc.
      monthFull: key,
      revenue:   ss.revenue,
      prodCost:  pc.totalCost,
      expenses:  es.total,
      netProfit: ss.revenue - pc.totalCost - es.total,
      bottles:   pc.bottles,
      goodBottles: pc.goodBottles,
    });
  }
  return result;
};

// ─── Operator performance analytics ──────────────────────────────────────────

export const getOperatorStats = async (from, to) => {
  const f = from || '2020-01-01';
  const t = to   || todayStr();

  const production = await getAllRecords(STORES.production);
  const filtered   = filterByDate(production, 'date', f, t);

  const byOp = {};
  for (const p of filtered) {
    const name = p.operatorName || 'Unknown';
    if (!byOp[name]) byOp[name] = { name, shifts: 0, totalBottles: 0, totalRejects: 0, totalMatKg: 0 };
    byOp[name].shifts        += 1;
    byOp[name].totalBottles  += (p.bottlesProduced  || 0);
    byOp[name].totalRejects  += (p.rejectQuantity   || 0);
    byOp[name].totalMatKg    += (p.materialUsedKg   || 0);
  }

  return Object.values(byOp).map(op => ({
    ...op,
    avgEfficiency: op.totalBottles > 0
      ? parseFloat(((op.totalBottles - op.totalRejects) / op.totalBottles * 100).toFixed(1)) : 100,
    rejectPct: op.totalBottles > 0
      ? parseFloat((op.totalRejects / op.totalBottles * 100).toFixed(1)) : 0,
    bottlesPerShift: op.shifts > 0 ? Math.round(op.totalBottles / op.shifts) : 0,
  })).sort((a, b) => b.avgEfficiency - a.avgEfficiency);
};

// ─── Material consumption analytics ──────────────────────────────────────────

export const getMaterialConsumptionStats = async (from, to) => {
  const f = from || '2020-01-01';
  const t = to   || todayStr();

  const production = await getAllRecords(STORES.production);
  const filtered   = filterByDate(production, 'date', f, t);

  const byMat = {};
  for (const p of filtered) {
    const mat = p.materialType || 'Unknown';
    if (!byMat[mat]) byMat[mat] = { materialType: mat, totalKg: 0, wastedKg: 0, totalCost: 0, batches: 0 };
    byMat[mat].totalKg    += (p.materialUsedKg || 0);
    byMat[mat].wastedKg   += (p.wastedKg       || 0);
    byMat[mat].totalCost  += (p.materialCost   || 0);
    byMat[mat].batches    += 1;
  }

  return Object.values(byMat).map(m => ({
    ...m,
    wastagePct: m.totalKg > 0 ? parseFloat((m.wastedKg / m.totalKg * 100).toFixed(2)) : 0,
    costPerKg:  m.totalKg > 0 ? parseFloat((m.totalCost / m.totalKg).toFixed(2)) : 0,
  }));
};

// ─── Machine performance ──────────────────────────────────────────────────────

export const getMachinePerformance = async (from, to) => {
  const f = from || '2020-01-01';
  const t = to   || todayStr();

  const production = await getAllRecords(STORES.production);
  const filtered   = filterByDate(production, 'date', f, t);

  const byMachine = {};
  for (const p of filtered) {
    const name = p.machineName || 'Unknown';
    if (!byMachine[name]) byMachine[name] = { machineName: name, batches: 0, totalBottles: 0, totalRejects: 0, elecHours: 0 };
    byMachine[name].batches       += 1;
    byMachine[name].totalBottles  += (p.bottlesProduced  || 0);
    byMachine[name].totalRejects  += (p.rejectQuantity   || 0);
    byMachine[name].elecHours     += (p.electricityHours || 0);
  }

  return Object.values(byMachine).map(m => ({
    ...m,
    efficiency: m.totalBottles > 0
      ? parseFloat(((m.totalBottles - m.totalRejects) / m.totalBottles * 100).toFixed(1)) : 100,
    rejectPct: m.totalBottles > 0
      ? parseFloat((m.totalRejects / m.totalBottles * 100).toFixed(1)) : 0,
  }));
};

// ─── Daily factory summary ────────────────────────────────────────────────────

export const getDailySummary = async (date) => {
  const d = date || todayStr();

  const [production, capProd, sales, expenses] = await Promise.all([
    getAllRecords(STORES.production),
    getAllRecords(STORES.cap_production),
    getAllRecords(STORES.sales),
    getAllRecords(STORES.expenses),
  ]);

  const dp  = production.filter(p => p.date === d);
  const dc  = capProd.filter(c => c.date === d);
  const ds  = sales.filter(s => s.date === d);
  const de  = expenses.filter(e => e.date === d);

  const pc  = sumProductionCosts([...dp, ...dc]);
  const ss  = sumSales(ds);
  const es  = sumExpenses(de);

  return {
    date:        d,
    bottles:     dp.reduce((s, p) => s + (p.bottlesProduced  || 0), 0),
    goodBottles: dp.reduce((s, p) => s + (p.goodBottles || p.bottlesProduced || 0), 0),
    rejects:     dp.reduce((s, p) => s + (p.rejectQuantity   || 0), 0),
    caps:        dc.reduce((s, c) => s + (c.totalCapsProduced || 0), 0),
    revenue:     ss.revenue,
    prodCost:    pc.totalCost,
    expenses:    es.total,
    netProfit:   ss.revenue - pc.totalCost - es.total,
    shifts:      [...new Set(dp.map(p => p.shift))],
  };
};
