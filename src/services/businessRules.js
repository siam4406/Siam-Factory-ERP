/**
 * services/businessRules.js
 * Business-rules engine — configurable thresholds, evaluates live alerts.
 */
import { getAllRecordsV2, getDBv2, STORES_EXT } from '../database/db.v2.js';
import { getAllRecords, STORES } from '../database/db.js';

export const DEFAULT_RULES = {
  low_stock_kg:             50,
  critical_stock_kg:        20,
  machine_maintenance_hrs:  200,
  reject_pct_warning:       5,
  reject_pct_critical:      10,
  order_delay_days:         0,
  electricity_rate_bdt:     12,
  labor_cost_per_shift:     500,
  min_efficiency_pct:       90,
  high_wastage_pct:         8,
};

export const loadRules = async () => {
  try {
    const rows = await getAllRecordsV2(STORES_EXT.business_rules);
    const map  = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return { ...DEFAULT_RULES, ...map };
  } catch {
    return { ...DEFAULT_RULES };
  }
};

export const saveRule = async (key, value) => {
  const database = await getDBv2();
  return new Promise((resolve, reject) => {
    const tx  = database.transaction(STORES_EXT.business_rules, 'readwrite');
    const req = tx.objectStore(STORES_EXT.business_rules)
                  .put({ key, value, updatedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
};

export const checkLowStock = (stockItems, rules) => {
  const alerts = [];
  for (const item of stockItems) {
    if (item.balanceKg <= rules.critical_stock_kg) {
      alerts.push({ type:'low_stock', severity:'critical',
        title:`Critical Stock: ${item.materialType}`,
        message:`Only ${item.balanceKg} KG remaining — reorder immediately!`, data:item });
    } else if (item.balanceKg <= rules.low_stock_kg) {
      alerts.push({ type:'low_stock', severity:'warning',
        title:`Low Stock: ${item.materialType}`,
        message:`${item.balanceKg} KG remaining — below minimum of ${rules.low_stock_kg} KG.`, data:item });
    }
  }
  return alerts;
};

export const checkMachineMaintenance = (machines, rules) => {
  const alerts = [];
  const today  = new Date();
  for (const m of machines) {
    if (m.status === 'Maintenance') {
      alerts.push({ type:'machine_maintenance', severity:'warning',
        title:`${m.name} Under Maintenance`,
        message:`Machine is currently offline for maintenance.`, data:m });
    }
    if (m.nextMaintenance) {
      const daysLeft = Math.ceil((new Date(m.nextMaintenance) - today) / 86400000);
      if (daysLeft <= 0) {
        alerts.push({ type:'machine_maintenance', severity:'critical',
          title:`Maintenance Overdue: ${m.name}`,
          message:`Scheduled maintenance was due on ${m.nextMaintenance}. Inspect immediately!`, data:m });
      } else if (daysLeft <= 7) {
        alerts.push({ type:'machine_maintenance', severity:'info',
          title:`Maintenance Due Soon: ${m.name}`,
          message:`Scheduled maintenance in ${daysLeft} day(s).`, data:m });
      }
    }
  }
  return alerts;
};

export const checkOrderDelays = (orders) => {
  const alerts = [];
  const today  = new Date().toISOString().split('T')[0];
  for (const o of orders) {
    if (['Delivered','Cancelled'].includes(o.status)) continue;
    if (o.deliveryDate && o.deliveryDate < today) {
      const diffDays = Math.ceil((new Date(today) - new Date(o.deliveryDate)) / 86400000);
      alerts.push({ type:'order_delay', severity: diffDays > 3 ? 'critical' : 'warning',
        title:`Order Delayed: ${o.orderId}`,
        message:`${o.customerName} — ${diffDays} day(s) past delivery date (${o.deliveryDate}).`, data:o });
    }
  }
  return alerts;
};

export const checkHighRejects = (productionEntries, rules) => {
  const alerts  = [];
  const cutoff  = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const recent  = productionEntries.filter(p => p.date && new Date(p.date) >= cutoff);
  for (const p of recent) {
    if (!p.bottlesProduced) continue;
    const pct = (p.rejectQuantity / p.bottlesProduced) * 100;
    if (pct >= rules.reject_pct_critical) {
      alerts.push({ type:'high_reject', severity:'critical',
        title:`Critical Reject Rate`,
        message:`${pct.toFixed(1)}% rejection on ${p.date} (${p.shift} shift). Check machine & material.`, data:p });
    } else if (pct >= rules.reject_pct_warning) {
      alerts.push({ type:'high_reject', severity:'warning',
        title:`High Reject Rate`,
        message:`${pct.toFixed(1)}% rejection on ${p.date} (${p.productType}, ${p.shift} shift).`, data:p });
    }
  }
  return alerts;
};

export const checkDuePayments = (orders) =>
  orders
    .filter(o => o.dueAmount > 0 && o.status === 'Delivered')
    .map(o => ({ type:'due_payment', severity:'warning',
      title:`Due Payment: ${o.orderId}`,
      message:`৳${Number(o.dueAmount).toLocaleString()} due from ${o.customerName}.`, data:o }));

export const evaluateAllRules = async () => {
  try {
    const [rules, stock, machines, orders, production] = await Promise.all([
      loadRules(),
      getAllRecords(STORES.material_stock),
      getAllRecords(STORES.machines),
      getAllRecords(STORES.orders),
      getAllRecords(STORES.production),
    ]);
    return [
      ...checkLowStock(stock, rules),
      ...checkMachineMaintenance(machines, rules),
      ...checkOrderDelays(orders),
      ...checkHighRejects(production, rules),
      ...checkDuePayments(orders),
    ];
  } catch (e) {
    console.error('Rule evaluation error:', e);
    return [];
  }
};
