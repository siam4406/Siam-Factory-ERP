/**
 * pages/Production.v2.jsx
 * Drop-in replacement for Production.jsx.
 * Uses productionService for auto stock deduction, cost calc, and movement logs.
 * Preserves the same visual design / component structure.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Factory, TrendingUp, AlertTriangle, Zap, Package, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllRecords, STORES } from '../database/db.js';
import { getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';
import { useProduction } from '../hooks/useProduction.js';
import { calcProductionCosts } from '../services/productionService.js';
import { loadRules } from '../services/businessRules.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const MACHINES     = ['Blow Mold Machine #1', 'Blow Mold Machine #2'];
const SHIFTS       = ['Morning', 'Evening', 'Night'];
const PRODUCT_TYPES = ['5L Bottle', '10L Bottle'];
const MAT_TYPES    = ['Virgin HDPE', 'Recycle HDPE', 'PET'];

const DEFAULT_FORM = {
  date: todayStr(), shift: 'Morning',
  machineName: 'Blow Mold Machine #1',
  operatorName: '', operatorCount: '1',
  productType: '5L Bottle',
  materialUsedKg: '', materialType: 'Virgin HDPE',
  bottlesProduced: '', rejectQuantity: '',
  electricityHours: '8', notes: '',
};

// ─── Cost Preview Panel ───────────────────────────────────────────────────────
const CostPreview = ({ costs, loading }) => {
  if (loading) return <div className="animate-pulse bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 h-28" />;
  if (!costs) return null;

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
      <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1.5">
        <Zap size={12} /> Live Cost Analysis
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Row label="Material Cost"   value={formatBDT(costs.materialCost)}    accent="text-orange-400" />
        <Row label="Electricity"     value={formatBDT(costs.electricityCost)} accent="text-yellow-400" />
        <Row label="Labor Cost"      value={formatBDT(costs.laborCost)}       accent="text-purple-400" />
        <Row label="Total Cost"      value={formatBDT(costs.totalCost)}       accent="text-white font-bold" />
        <Row label="Cost / Bottle"   value={formatBDT(costs.costPerBottle)}   accent="text-cyan-400" />
        <Row label="Good Bottles"    value={costs.goodBottles}                accent="text-green-400" />
        <Row label="Efficiency"      value={`${costs.efficiencyPct}%`}        accent={costs.efficiencyPct >= 95 ? 'text-green-400' : costs.efficiencyPct >= 90 ? 'text-yellow-400' : 'text-red-400'} />
        <Row label="Reject Rate"     value={`${costs.rejectPct}%`}            accent={costs.rejectPct < 3 ? 'text-green-400' : costs.rejectPct < 7 ? 'text-yellow-400' : 'text-red-400'} />
        <Row label="Mat. Wastage"    value={`${costs.wastedKg} KG (${costs.wastagePct}%)`} accent="text-gray-300" />
      </div>
    </div>
  );
};

const Row = ({ label, value, accent = 'text-white' }) => (
  <div className="flex items-center justify-between gap-1">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-xs font-semibold ${accent}`}>{value}</span>
  </div>
);

// ─── Stock Warning ────────────────────────────────────────────────────────────
const StockWarning = ({ materialType, materialKg }) => {
  const [stockKg, setStockKg] = useState(null);
  useEffect(() => {
    getAllRecords(STORES.material_stock).then(items => {
      const found = items.find(s => s.materialType === materialType);
      setStockKg(found?.balanceKg ?? null);
    });
  }, [materialType]);

  if (stockKg === null) return null;
  const afterDeduction = stockKg - Number(materialKg || 0);
  const low = afterDeduction < 50;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${low ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
      <Package size={12} />
      <span>
        {materialType} stock: <strong>{stockKg} KG</strong>
        {materialKg ? ` → after: ${afterDeduction.toFixed(1)} KG` : ''}
        {low ? ' ⚠ Low stock after deduction!' : ''}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Production = () => {
  const { showToast, logActivity } = useApp();
  const { saving, error, preview, previewCosts, saveProduction } = useProduction(logActivity);

  const [entries,    setEntries]    = useState([]);
  const [shiftData,  setShiftData]  = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(DEFAULT_FORM);
  const [chartData,  setChartData]  = useState([]);
  const [tab,        setTab]        = useState('entries'); // 'entries' | 'shifts' | 'operators'
  const [operators,  setOperators]  = useState([]);
  const previewTimer = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [prod, shifts] = await Promise.all([
      getAllRecords(STORES.production),
      getAllRecordsV2(STORES_EXT.shift_summaries).catch(() => []),
    ]);
    const sorted = prod.sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(sorted);
    setShiftData(shifts.sort((a, b) => b.date?.localeCompare(a.date)));

    // Operator stats
    const byOp = {};
    for (const p of prod) {
      const name = p.operatorName || 'Unknown';
      if (!byOp[name]) byOp[name] = { name, shifts: 0, bottles: 0, rejects: 0 };
      byOp[name].shifts++;
      byOp[name].bottles  += (p.bottlesProduced || 0);
      byOp[name].rejects  += (p.rejectQuantity  || 0);
    }
    setOperators(Object.values(byOp).map(o => ({
      ...o,
      efficiency: o.bottles > 0 ? ((o.bottles - o.rejects) / o.bottles * 100).toFixed(1) : '100.0',
    })).sort((a, b) => Number(b.efficiency) - Number(a.efficiency)));

    // Chart
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayE = sorted.filter(e => e.date === ds);
      last7.push({
        day:      d.toLocaleDateString('en', { weekday: 'short' }),
        produced: dayE.reduce((s, e) => s + (e.bottlesProduced || 0), 0),
        rejects:  dayE.reduce((s, e) => s + (e.rejectQuantity  || 0), 0),
        good:     dayE.reduce((s, e) => s + (e.goodBottles || (e.bottlesProduced - (e.rejectQuantity || 0)) || 0), 0),
      });
    }
    setChartData(last7);
  };

  // Field change + debounced preview
  const f = (field) => (e) => {
    const updated = { ...form, [field]: e.target.value };
    setForm(updated);
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => previewCosts(updated), 400);
  };

  const handleSubmit = async () => {
    if (!form.operatorName)    return showToast('Enter operator name', 'error');
    if (!form.bottlesProduced) return showToast('Enter bottles produced', 'error');
    if (!form.materialUsedKg)  return showToast('Enter material used', 'error');
    try {
      const { costs } = await saveProduction(form);
      showToast(
        `Saved! ${costs.goodBottles} bottles | Cost/bottle: ${formatBDT(costs.costPerBottle)} | Eff: ${costs.efficiencyPct}%`,
        'success'
      );
      setShowForm(false);
      setForm(DEFAULT_FORM);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Error saving production', 'error');
    }
  };

  const today       = todayStr();
  const todayE      = entries.filter(e => e.date === today);
  const todayBottles = todayE.reduce((s, e) => s + (e.bottlesProduced || 0), 0);
  const todayGood   = todayE.reduce((s, e) => s + (e.goodBottles || e.bottlesProduced || 0), 0);
  const todayRejects= todayE.reduce((s, e) => s + (e.rejectQuantity  || 0), 0);
  const monthE      = entries.filter(e => e.date?.startsWith(today.slice(0, 7)));
  const monthBottles= monthE.reduce((s, e) => s + (e.bottlesProduced || 0), 0);
  const avgEff      = entries.length
    ? (entries.reduce((s, e) => s + (e.efficiencyPct || 100), 0) / entries.length).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today Output"    value={`${todayBottles} pcs`} sub={`${todayGood} good · ${todayRejects} reject`} icon={Factory}     color="blue"   />
        <StatCard title="This Month"      value={`${monthBottles.toLocaleString()} pcs`}                                     icon={TrendingUp}  color="green"  />
        <StatCard title="Avg Efficiency"  value={`${avgEff}%`}          sub="All time"                                       icon={TrendingUp}  color="cyan"   />
        <StatCard title="Total Entries"   value={entries.length}                                                              icon={Factory}     color="purple" />
      </div>

      {/* Chart */}
      <Card>
        <p className="text-sm font-bold text-white mb-3">7-Day Production</p>
        <ResponsiveContainer width="100%" height={155}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day"  tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis               tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="good"    fill="#22c55e" radius={[4,4,0,0]} name="Good"    stackId="a" />
            <Bar dataKey="rejects" fill="#ef4444" radius={[4,4,0,0]} name="Rejects" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabs */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
        {['entries','shifts','operators'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); }} size="sm">
          <Plus size={15} /> Add Entry
        </Button>
      </div>

      {/* Tab: entries */}
      {tab === 'entries' && (
        <div className="space-y-2">
          {entries.length === 0
            ? <EmptyState icon={Factory} title="No production entries" subtitle="Add your first production record" />
            : entries.map(entry => {
                const eff = entry.efficiencyPct || (entry.bottlesProduced ? ((entry.bottlesProduced - (entry.rejectQuantity||0)) / entry.bottlesProduced * 100).toFixed(1) : '100.0');
                return (
                  <Card key={entry.id}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{entry.productType}</span>
                          <span className="text-xs text-gray-500">{entry.shift} Shift</span>
                        </div>
                        <p className="font-bold text-white text-lg mt-1">
                          {entry.bottlesProduced} <span className="text-sm font-normal text-gray-400">bottles</span>
                          {entry.goodBottles && entry.goodBottles !== entry.bottlesProduced
                            ? <span className="text-sm text-green-400 ml-1">({entry.goodBottles} good)</span>
                            : null}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(entry.date)} · {entry.operatorName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.machineName}</p>
                        {/* Cost row */}
                        {entry.totalCost > 0 && (
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-orange-400">Mat: {formatBDT(entry.materialCost)}</span>
                            <span className="text-xs text-yellow-400">Elec: {formatBDT(entry.electricityCost)}</span>
                            <span className="text-xs text-cyan-400">৳/pc: {formatBDT(entry.costPerBottle)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${Number(eff) >= 95 ? 'text-green-400' : Number(eff) >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{eff}%</p>
                        <p className="text-xs text-red-400">{entry.rejectQuantity || 0} rej</p>
                        {entry.totalCost > 0 && <p className="text-xs text-purple-400 mt-1">{formatBDT(entry.totalCost)}</p>}
                      </div>
                    </div>
                  </Card>
                );
              })
          }
        </div>
      )}

      {/* Tab: shifts */}
      {tab === 'shifts' && (
        <div className="space-y-2">
          {shiftData.length === 0
            ? <EmptyState icon={Factory} title="No shift summaries yet" subtitle="Shift data auto-generated on save" />
            : shiftData.map((s, i) => (
                <Card key={i}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{s.date} · {s.shift}</p>
                      <p className="text-sm text-green-400 mt-0.5">{s.totalBottles?.toLocaleString()} bottles</p>
                      <p className="text-xs text-red-400">{s.totalRejects} rejects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-400">{formatBDT(s.totalCost)}</p>
                      <p className="text-xs text-orange-400">Mat: {formatBDT(s.totalMatCost)}</p>
                      <p className="text-xs text-yellow-400">Elec: {formatBDT(s.totalElecCost)}</p>
                    </div>
                  </div>
                </Card>
              ))
          }
        </div>
      )}

      {/* Tab: operators */}
      {tab === 'operators' && (
        <div className="space-y-2">
          {operators.length === 0
            ? <EmptyState icon={Users} title="No operator data" />
            : operators.map((op, i) => (
                <Card key={i}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-sm font-bold text-blue-300">
                          {op.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{op.name}</p>
                          <p className="text-xs text-gray-500">{op.shifts} shifts · {op.bottles.toLocaleString()} bottles</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${Number(op.efficiency) >= 95 ? 'text-green-400' : Number(op.efficiency) >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{op.efficiency}%</p>
                      <p className="text-xs text-red-400">{op.rejects} rejects</p>
                    </div>
                  </div>
                  {/* Efficiency bar */}
                  <div className="mt-2 bg-gray-700/50 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${Number(op.efficiency) >= 95 ? 'bg-green-500' : Number(op.efficiency) >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${op.efficiency}%` }} />
                  </div>
                </Card>
              ))
          }
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); }} title="Add Production Entry" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
            <FormSelect label="Shift" value={form.shift} onChange={f('shift')} options={SHIFTS} />
          </div>
          <FormSelect label="Machine" value={form.machineName} onChange={f('machineName')} options={MACHINES} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Operator Name *" value={form.operatorName} onChange={f('operatorName')} placeholder="Worker name" required />
            <FormInput label="Operators Count"  type="number" value={form.operatorCount} onChange={f('operatorCount')} placeholder="1" />
          </div>
          <FormSelect label="Product Type" value={form.productType} onChange={f('productType')} options={PRODUCT_TYPES} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Material Type" value={form.materialType} onChange={f('materialType')} options={MAT_TYPES} />
            <FormInput  label="Material Used (KG)" type="number" value={form.materialUsedKg} onChange={f('materialUsedKg')} placeholder="0" />
          </div>

          {/* Stock warning */}
          {form.materialType && (
            <StockWarning materialType={form.materialType} materialKg={form.materialUsedKg} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Bottles Produced *" type="number" value={form.bottlesProduced} onChange={f('bottlesProduced')} placeholder="0" required />
            <FormInput label="Reject Quantity"    type="number" value={form.rejectQuantity}  onChange={f('rejectQuantity')}  placeholder="0" />
          </div>
          <FormInput label="Electricity Hours" type="number" value={form.electricityHours} onChange={f('electricityHours')} placeholder="8" />

          {/* Live cost preview */}
          <CostPreview costs={preview} loading={false} />

          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Additional notes..." />

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</p>}

          <Button onClick={handleSubmit} fullWidth disabled={saving} variant="primary">
            {saving ? 'Saving & updating stock…' : 'Save Production Entry'}
          </Button>
          <p className="text-xs text-gray-600 text-center">Stock will be auto-deducted on save.</p>
        </div>
      </Modal>
    </div>
  );
};

export default Production;
