/**
 * services/productionService.js
 * All production-save side-effects: cost calc, stock deduction,
 * inventory update, scrap log, movement log, operator performance,
 * shift summary, electricity log, material consumption.
 */
import { getAllRecords, addRecord, updateRecord, STORES } from '../database/db.js';
import { addRecordV2, updateRecordV2, getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';
import { loadRules } from './businessRules.js';

const FALLBACK_RATE = { 'Virgin HDPE':130, 'Recycle HDPE':75, 'PET':150, default:100 };

export const calcProductionCosts = async (entry, rules) => {
  const resolvedRules = rules || (await loadRules());
  const stockItems    = await getAllRecords(STORES.material_stock);
  const stockItem     = stockItems.find(s => s.materialType === entry.materialType);
  const matRatePerKg  = stockItem?.avgCostPerKg || FALLBACK_RATE[entry.materialType] || FALLBACK_RATE.default;

  const matKg           = Number(entry.materialUsedKg)  || 0;
  const totalBottles    = Number(entry.bottlesProduced)  || 0;
  const rejectQty       = Number(entry.rejectQuantity)   || 0;
  const goodBottles     = Math.max(0, totalBottles - rejectQty);
  const elecHours       = Number(entry.electricityHours) || 0;
  const operatorCount   = Number(entry.operatorCount)    || 1;

  const materialCost    = matKg * matRatePerKg;
  const electricityCost = elecHours * (resolvedRules.electricity_rate_bdt || 12);
  const laborCost       = operatorCount * (resolvedRules.labor_cost_per_shift || 500);
  const totalCost       = materialCost + electricityCost + laborCost;
  const costPerBottle   = goodBottles > 0 ? totalCost / goodBottles : 0;
  const rejectPct       = totalBottles > 0 ? (rejectQty / totalBottles) * 100 : 0;
  const efficiencyPct   = totalBottles > 0 ? (goodBottles / totalBottles) * 100 : 100;
  const matPerGoodBottle= goodBottles > 0 ? matKg / goodBottles : 0;
  const wastedKg        = matKg > 0 ? (rejectQty * matPerGoodBottle) : 0;
  const wastagePct      = matKg > 0 ? (wastedKg / matKg) * 100 : 0;

  return {
    materialCost:    Math.round(materialCost),
    electricityCost: Math.round(electricityCost),
    laborCost:       Math.round(laborCost),
    totalCost:       Math.round(totalCost),
    costPerBottle:   parseFloat(costPerBottle.toFixed(2)),
    rejectPct:       parseFloat(rejectPct.toFixed(2)),
    efficiencyPct:   parseFloat(efficiencyPct.toFixed(2)),
    wastedKg:        parseFloat(wastedKg.toFixed(3)),
    wastagePct:      parseFloat(wastagePct.toFixed(2)),
    goodBottles, rejectQty, matRatePerKg,
  };
};

export const deductMaterialStock = async (materialType, usedKg, productionId, date) => {
  const stockItems = await getAllRecords(STORES.material_stock);
  const item       = stockItems.find(s => s.materialType === materialType);
  if (!item) return; // graceful - don't crash if no stock record
  await updateRecord(STORES.material_stock, {
    ...item,
    usedKg:    parseFloat(((item.usedKg || 0) + usedKg).toFixed(3)),
    balanceKg: parseFloat(Math.max(0, (item.balanceKg || 0) - usedKg).toFixed(3)),
  });
  await addRecordV2(STORES_EXT.inventory_movements, {
    date, type:'out', category:'raw_material', materialType,
    quantityKg: usedKg, reference:`PROD-${productionId}`,
    notes:`Deducted for production batch ${productionId}`,
  });
};

export const increaseFinishedGoods = async (productType, goodBottles, productionId, date) => {
  const inventory = await getAllRecords(STORES.inventory);
  const existing  = inventory.find(i => i.item === productType && i.category === 'Finished Goods');
  if (existing) {
    await updateRecord(STORES.inventory, {
      ...existing, quantity:(existing.quantity || 0) + goodBottles, lastUpdated:date });
  } else {
    await addRecord(STORES.inventory, {
      category:'Finished Goods', item:productType, quantity:goodBottles, unit:'pcs', lastUpdated:date });
  }
  await addRecordV2(STORES_EXT.inventory_movements, {
    date, type:'in', category:'finished_goods', item:productType,
    quantity:goodBottles, reference:`PROD-${productionId}`,
    notes:`Added from production batch ${productionId}`,
  });
};

export const logScrap = async (entry, productionId, costs) => {
  if (!entry.rejectQuantity || Number(entry.rejectQuantity) === 0) return;
  await addRecordV2(STORES_EXT.scrap_log, {
    date:entry.date, scrapType:'reject_bottle', productType:entry.productType,
    quantity:Number(entry.rejectQuantity), productionId,
    machineName:entry.machineName, operatorName:entry.operatorName,
    estimatedCostLoss:parseFloat((costs.costPerBottle * Number(entry.rejectQuantity)).toFixed(2)),
    notes:entry.notes || '',
  });
  const inventory = await getAllRecords(STORES.inventory);
  const scrapItem = inventory.find(i => i.item === 'Rejected Bottles' && i.category === 'Scrap / Reject');
  if (scrapItem) {
    await updateRecord(STORES.inventory, {
      ...scrapItem, quantity:(scrapItem.quantity || 0) + Number(entry.rejectQuantity), lastUpdated:entry.date });
  } else {
    await addRecord(STORES.inventory, {
      category:'Scrap / Reject', item:'Rejected Bottles',
      quantity:Number(entry.rejectQuantity), unit:'pcs', lastUpdated:entry.date });
  }
};

export const logElectricity = async (entry, productionId, costs, rules) => {
  await addRecordV2(STORES_EXT.electricity_log, {
    productionId, date:entry.date, shift:entry.shift,
    hours:Number(entry.electricityHours) || 0,
    ratePerUnit:rules?.electricity_rate_bdt || 12,
    totalCost:costs.electricityCost,
    costPerBottle:entry.bottlesProduced
      ? parseFloat((costs.electricityCost / entry.bottlesProduced).toFixed(4)) : 0,
    machineName:entry.machineName,
  });
};

export const logMaterialConsumption = async (entry, productionId, costs) => {
  await addRecordV2(STORES_EXT.material_consumption, {
    productionId, date:entry.date, materialType:entry.materialType,
    usedKg:Number(entry.materialUsedKg), ratePerKg:costs.matRatePerKg,
    totalCost:costs.materialCost, bottles:Number(entry.bottlesProduced),
    kgPerBottle:entry.bottlesProduced
      ? parseFloat((entry.materialUsedKg / entry.bottlesProduced).toFixed(4)) : 0,
    wastedKg:costs.wastedKg, wastagePct:costs.wastagePct,
  });
};

export const logOperatorPerformance = async (entry, productionId, costs) => {
  await addRecordV2(STORES_EXT.operator_performance, {
    operatorName:entry.operatorName, date:entry.date, shift:entry.shift, productionId,
    machineName:entry.machineName, productType:entry.productType,
    bottlesProduced:Number(entry.bottlesProduced),
    rejectQty:Number(entry.rejectQuantity) || 0,
    efficiencyPct:costs.efficiencyPct, rejectPct:costs.rejectPct,
  });
};

export const updateShiftSummary = async (entry, productionId, costs) => {
  const existing = await getAllRecordsV2(STORES_EXT.shift_summaries);
  const found    = existing.find(s => s.date === entry.date && s.shift === entry.shift);
  const patch = {
    date:entry.date, shift:entry.shift,
    totalBottles:  (found?.totalBottles  || 0) + Number(entry.bottlesProduced),
    totalRejects:  (found?.totalRejects  || 0) + (Number(entry.rejectQuantity) || 0),
    totalMatKg:    (found?.totalMatKg    || 0) + Number(entry.materialUsedKg),
    totalMatCost:  (found?.totalMatCost  || 0) + costs.materialCost,
    totalElecCost: (found?.totalElecCost || 0) + costs.electricityCost,
    totalLaborCost:(found?.totalLaborCost|| 0) + costs.laborCost,
    totalCost:     (found?.totalCost     || 0) + costs.totalCost,
    productionIds: [...(found?.productionIds || []), productionId],
  };
  if (found) {
    await updateRecordV2(STORES_EXT.shift_summaries, { ...found, ...patch });
  } else {
    await addRecordV2(STORES_EXT.shift_summaries, patch);
  }
};

export const saveProductionEntry = async (entry, logActivityFn) => {
  const rules  = await loadRules();
  const costs  = await calcProductionCosts(entry, rules);

  const enrichedEntry = {
    ...entry,
    materialUsedKg:   Number(entry.materialUsedKg),
    bottlesProduced:  Number(entry.bottlesProduced),
    rejectQuantity:   Number(entry.rejectQuantity) || 0,
    electricityHours: Number(entry.electricityHours) || 0,
    operatorCount:    Number(entry.operatorCount) || 1,
    materialCost:     costs.materialCost,
    electricityCost:  costs.electricityCost,
    laborCost:        costs.laborCost,
    totalCost:        costs.totalCost,
    costPerBottle:    costs.costPerBottle,
    rejectPct:        costs.rejectPct,
    efficiencyPct:    costs.efficiencyPct,
    wastedKg:         costs.wastedKg,
    wastagePct:       costs.wastagePct,
    goodBottles:      costs.goodBottles,
  };

  const productionId = await addRecord(STORES.production, enrichedEntry);

  await deductMaterialStock(entry.materialType, Number(entry.materialUsedKg), productionId, entry.date);
  await increaseFinishedGoods(entry.productType, costs.goodBottles, productionId, entry.date);
  await logScrap(entry, productionId, costs);
  await logElectricity(entry, productionId, costs, rules);
  await logMaterialConsumption(entry, productionId, costs);
  await logOperatorPerformance(entry, productionId, costs);
  await updateShiftSummary(entry, productionId, costs);

  if (logActivityFn) {
    await logActivityFn('production',
      `Production: ${costs.goodBottles} ${entry.productType}s | ` +
      `Cost: ৳${costs.totalCost.toLocaleString()} | ` +
      `Eff: ${costs.efficiencyPct}% | Reject: ${costs.rejectPct}%`);
  }
  return { productionId, costs };
};

export const saveCapProductionEntry = async (entry, logActivityFn) => {
  const rules      = await loadRules();
  const matKg      = Number(entry.materialUsedKg)    || 0;
  const totalCaps  = Number(entry.totalCapsProduced) || 0;
  const rejectCaps = Number(entry.rejectCaps)        || 0;
  const goodCaps   = Math.max(0, totalCaps - rejectCaps);
  const matRate    = 120;
  const matCost    = matKg * matRate;
  const costPer1000    = totalCaps > 0 ? (matCost / totalCaps) * 1000 : 0;
  const efficiencyPct  = totalCaps > 0 ? (goodCaps / totalCaps) * 100 : 100;

  const enriched = {
    ...entry,
    materialUsedKg:    matKg, totalCapsProduced:totalCaps,
    rejectCaps, goodCaps,
    materialCost:      Math.round(matCost),
    costPer1000:       parseFloat(costPer1000.toFixed(2)),
    efficiencyPct:     parseFloat(efficiencyPct.toFixed(2)),
  };

  const capId = await addRecord(STORES.cap_production, enriched);

  // Update finished goods inventory
  const inventory = await getAllRecords(STORES.inventory);
  const capItem   = inventory.find(i => i.item === 'Caps' && i.category === 'Finished Goods');
  if (capItem) {
    await updateRecord(STORES.inventory, { ...capItem, quantity:(capItem.quantity || 0) + goodCaps, lastUpdated:entry.date });
  } else {
    await addRecord(STORES.inventory, { category:'Finished Goods', item:'Caps', quantity:goodCaps, unit:'pcs', lastUpdated:entry.date });
  }

  // Scrap log for reject caps
  if (rejectCaps > 0) {
    const scrapCapItem = inventory.find(i => i.item === 'Rejected Caps' && i.category === 'Scrap / Reject');
    if (scrapCapItem) {
      await updateRecord(STORES.inventory, { ...scrapCapItem, quantity:(scrapCapItem.quantity || 0) + rejectCaps, lastUpdated:entry.date });
    } else {
      await addRecord(STORES.inventory, { category:'Scrap / Reject', item:'Rejected Caps', quantity:rejectCaps, unit:'pcs', lastUpdated:entry.date });
    }
    await addRecordV2(STORES_EXT.scrap_log, {
      date:entry.date, scrapType:'reject_cap', productType:'Cap',
      quantity:rejectCaps, productionId:capId, machineName:entry.machineName,
      operatorName:entry.operatorName,
      estimatedCostLoss:parseFloat((costPer1000 / 1000 * rejectCaps).toFixed(2)), notes:'',
    });
  }

  // Deduct cap material stock
  const stockItems = await getAllRecords(STORES.material_stock);
  const capStock   = stockItems.find(s => s.materialType === 'Cap Material');
  if (capStock && matKg > 0) {
    await updateRecord(STORES.material_stock, {
      ...capStock,
      usedKg:    parseFloat(((capStock.usedKg || 0) + matKg).toFixed(3)),
      balanceKg: parseFloat(Math.max(0, (capStock.balanceKg || 0) - matKg).toFixed(3)),
    });
  }

  if (logActivityFn) {
    await logActivityFn('cap_production',
      `Cap production: ${goodCaps} ${entry.color} caps | Cost/1000: ৳${costPer1000.toFixed(0)} | Eff: ${efficiencyPct.toFixed(1)}%`);
  }
  return { capId, enriched };
};
