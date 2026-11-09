/**
 * pages/CapProduction.v2.jsx
 * Drop-in replacement for Operations.jsx CapProduction export.
 * Uses saveCapProductionEntry() for auto stock deduction, cost calc, and scrap log.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Cpu, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllRecords, STORES } from '../database/db.js';
import { getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';
import { useProduction } from '../hooks/useProduction.js';

const CAP_MACHINES = ['Injection Mold Hand Press'];
const CAP_COLORS   = ['Blue', 'White', 'Red', 'Black', 'Yellow', 'Green', 'Clear', 'Orange'];

const DEFAULT_FORM = {
  date: todayStr(), color: 'Blue',
  materialUsedKg: '', totalCapsProduced: '',
  rejectCaps: '', machineName: 'Injection Mold Hand Press',
  operatorName: '', notes: '',
};

// ─── Stock indicator ──────────────────────────────────────────────────────────
const CapStockWarning = ({ usedKg }) => {
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    getAllRecords(STORES.material_stock).then(items => {
      const s = items.find(i => i.materialType === 'Cap Material');
      setBalance(s?.balanceKg ?? null);
    });
  }, []);
  if (balance === null) return null;
  const after = balance - Number(usedKg || 0);
  const low   = after < 20;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${low ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
      <Package size={12} />
      Cap Material stock: <strong>{balance} KG</strong>
      {usedKg ? ` → after: ${after.toFixed(1)} KG` : ''}
      {low ? ' ⚠ Low!' : ''}
    </div>
  );
};

// ─── Live metrics panel ───────────────────────────────────────────────────────
const CapMetricsPanel = ({ form }) => {
  const caps   = Number(form.totalCapsProduced) || 0;
  const kg     = Number(form.materialUsedKg)    || 0;
  const rejects= Number(form.rejectCaps)        || 0;
  if (!caps || !kg) return null;

  const goodCaps    = Math.max(0, caps - rejects);
  const capPerKg    = kg > 0 ? (caps / kg).toFixed(0) : 0;
  const costPer1000 = caps > 0 ? ((kg * 120) / caps * 1000).toFixed(0) : 0;
  const efficiency  = caps > 0 ? ((goodCaps / caps) * 100).toFixed(1) : 100;
  const rejectPct   = caps > 0 ? ((rejects  / caps) * 100).toFixed(1) : 0;

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
      <p className="text-xs font-bold text-cyan-400 mb-2.5 flex items-center gap-1.5">
        <Cpu size={12} /> Live Cap Metrics
      </p>
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
        {[
          { l: 'Good Caps',    v: goodCaps.toLocaleString(),  c: 'text-green-400' },
          { l: 'Caps / KG',   v: capPerKg,                   c: 'text-white'     },
          { l: 'Cost / 1000', v: formatBDT(costPer1000),     c: 'text-cyan-400'  },
          { l: 'Efficiency',  v: `${efficiency}%`,            c: Number(efficiency) >= 95 ? 'text-green-400' : 'text-yellow-400' },
          { l: 'Reject Rate', v: `${rejectPct}%`,             c: Number(rejectPct) < 3 ? 'text-green-400' : 'text-red-400' },
          { l: 'Total Cost',  v: formatBDT(kg * 120),         c: 'text-orange-400' },
        ].map(r => (
          <div key={r.l} className="flex items-center justify-between gap-2">
            <span className="text-gray-400">{r.l}</span>
            <span className={`font-semibold ${r.c}`}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Color dot ────────────────────────────────────────────────────────────────
const ColorDot = ({ color }) => {
  const CSS_COLORS = {
    Blue: '#3b82f6', White: '#e5e7eb', Red: '#ef4444', Black: '#1f2937',
    Yellow: '#eab308', Green: '#22c55e', Clear: 'transparent', Orange: '#f97316',
  };
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/20 mr-1.5 shrink-0"
      style={{ backgroundColor: CSS_COLORS[color] || '#6b7280' }}
    />
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const EnhancedCapProduction = () => {
  const { showToast, logActivity } = useApp();
  const { saving, error, saveCapProduction } = useProduction(logActivity);

  const [entries,   setEntries]   = useState([]);
  const [scrapLog,  setScrapLog]  = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState(DEFAULT_FORM);
  const [chartData, setChartData] = useState([]);
  const [tab,       setTab]       = useState('entries'); // 'entries' | 'scrap' | 'colors'

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [prods, scraps] = await Promise.all([
      getAllRecords(STORES.cap_production),
      getAllRecordsV2(STORES_EXT.scrap_log).catch(() => []),
    ]);
    const sorted = prods.sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(sorted);
    setScrapLog(scraps.filter(s => s.scrapType === 'reject_cap').sort((a, b) => b.date?.localeCompare(a.date)));

    // 7-day chart
    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayE = sorted.filter(e => e.date === ds);
      chart.push({
        day:  d.toLocaleDateString('en', { weekday: 'short' }),
        good: dayE.reduce((s, e) => s + ((e.goodCaps || e.totalCapsProduced || 0) - (e.rejectCaps || 0)), 0),
        rej:  dayE.reduce((s, e) => s + (e.rejectCaps || 0), 0),
      });
    }
    setChartData(chart);
  };

  // Color usage breakdown for analytics tab
  const colorBreakdown = entries.reduce((acc, e) => {
    const c = e.color || 'Unknown';
    if (!acc[c]) acc[c] = { color: c, caps: 0, rejects: 0 };
    acc[c].caps    += (e.totalCapsProduced || 0);
    acc[c].rejects += (e.rejectCaps || 0);
    return acc;
  }, {});

  const f = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.operatorName)     return showToast('Enter operator name', 'error');
    if (!form.totalCapsProduced) return showToast('Enter caps produced', 'error');
    try {
      const { enriched } = await saveCapProduction(form);
      showToast(
        `${enriched.goodCaps} ${form.color} caps saved! Eff: ${enriched.efficiencyPct}% | Cost/1000: ${formatBDT(enriched.costPer1000)}`,
        'success'
      );
      setShowForm(false);
      setForm(DEFAULT_FORM);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Error saving cap production', 'error');
    }
  };

  const totalCaps    = entries.reduce((s, e) => s + (e.totalCapsProduced || 0), 0);
  const totalGood    = entries.reduce((s, e) => s + (e.goodCaps          || e.totalCapsProduced || 0), 0);
  const totalRejects = entries.reduce((s, e) => s + (e.rejectCaps        || 0), 0);
  const avgEff       = entries.length
    ? (entries.reduce((s, e) => s + (e.efficiencyPct || 100), 0) / entries.length).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Caps"     value={totalCaps.toLocaleString()}    icon={Cpu}        color="blue"   />
        <StatCard title="Good Caps"      value={totalGood.toLocaleString()}    icon={TrendingUp} color="green"  />
        <StatCard title="Total Rejects"  value={totalRejects.toLocaleString()} icon={AlertTriangle} color="red" />
        <StatCard title="Avg Efficiency" value={`${avgEff}%`}                  icon={TrendingUp} color="cyan"   />
      </div>

      {/* Chart */}
      <Card>
        <p className="text-sm font-bold text-white mb-3">7-Day Cap Production</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day"  tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis               tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="good" fill="#06b6d4" radius={[4,4,0,0]} name="Good" />
            <Bar dataKey="rej"  fill="#ef4444" radius={[4,4,0,0]} name="Rejects" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabs */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
        {['entries','scrap','colors'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'colors' ? '🎨 Colors' : t}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); }} size="sm">
          <Plus size={15} /> Add Entry
        </Button>
      </div>

      {/* Tab: entries */}
      {tab === 'entries' && (
        <div className="space-y-2">
          {entries.length === 0
            ? <EmptyState icon={Cpu} title="No cap production entries" subtitle="Add your first cap production record" />
            : entries.map(e => {
                const eff = e.efficiencyPct || (e.totalCapsProduced ? ((e.totalCapsProduced - (e.rejectCaps||0)) / e.totalCapsProduced * 100).toFixed(1) : 100);
                return (
                  <Card key={e.id}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <ColorDot color={e.color} />
                          <span className="font-semibold text-white">{e.color} Caps</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.date)} · {e.operatorName}</p>
                        <p className="text-xs text-gray-500">{e.machineName}</p>
                        {e.materialCost > 0 && (
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-orange-400">Mat: {formatBDT(e.materialCost)}</span>
                            {e.costPer1000 > 0 && <span className="text-xs text-cyan-400">৳/1000: {formatBDT(e.costPer1000)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-blue-400">{(e.totalCapsProduced || 0).toLocaleString()}</p>
                        <p className="text-xs text-red-400">{e.rejectCaps || 0} rej</p>
                        <p className={`text-xs font-semibold ${Number(eff) >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>{eff}%</p>
                      </div>
                    </div>
                  </Card>
                );
              })
          }
        </div>
      )}

      {/* Tab: scrap */}
      {tab === 'scrap' && (
        <div className="space-y-2">
          {scrapLog.length === 0
            ? <EmptyState icon={AlertTriangle} title="No cap reject records" subtitle="Scrap is auto-logged when caps are saved" />
            : scrapLog.map((s, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{s.quantity?.toLocaleString()} rejected caps</p>
                      <p className="text-xs text-gray-400">{formatDate(s.date)} · {s.operatorName}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400">{formatBDT(s.estimatedCostLoss)}</p>
                  </div>
                </Card>
              ))
          }
        </div>
      )}

      {/* Tab: colors */}
      {tab === 'colors' && (
        <div className="space-y-2">
          {Object.values(colorBreakdown).length === 0
            ? <EmptyState icon={Cpu} title="No color data" />
            : Object.values(colorBreakdown)
                .sort((a, b) => b.caps - a.caps)
                .map((c, i) => {
                  const eff = c.caps > 0 ? ((c.caps - c.rejects) / c.caps * 100).toFixed(1) : 100;
                  return (
                    <Card key={i}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <ColorDot color={c.color} />
                          <div>
                            <p className="font-semibold text-white">{c.color}</p>
                            <p className="text-xs text-red-400">{c.rejects.toLocaleString()} rejects</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-cyan-400">{c.caps.toLocaleString()}</p>
                          <p className={`text-xs font-semibold ${Number(eff) >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>{eff}% eff</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-gray-700/40 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${Math.min(100, (c.caps / (totalCaps || 1)) * 100)}%` }} />
                      </div>
                    </Card>
                  );
                })
          }
        </div>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Cap Production" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
            <FormSelect label="Color" value={form.color} onChange={f('color')} options={CAP_COLORS} />
          </div>
          <FormSelect label="Machine" value={form.machineName} onChange={f('machineName')} options={CAP_MACHINES} />
          <FormInput label="Operator Name *" value={form.operatorName} onChange={f('operatorName')} placeholder="Worker name" required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Material Used (KG)" type="number" value={form.materialUsedKg} onChange={f('materialUsedKg')} placeholder="0" />
            <FormInput label="Total Caps Produced *" type="number" value={form.totalCapsProduced} onChange={f('totalCapsProduced')} placeholder="0" required />
          </div>
          <FormInput label="Reject Caps" type="number" value={form.rejectCaps} onChange={f('rejectCaps')} placeholder="0" />

          {/* Stock warning */}
          <CapStockWarning usedKg={form.materialUsedKg} />

          {/* Live metrics */}
          <CapMetricsPanel form={form} />

          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Notes…" rows={2} />

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</p>
          )}

          <Button onClick={handleSubmit} fullWidth disabled={saving} variant="primary">
            {saving ? 'Saving & updating stock…' : 'Save Cap Production'}
          </Button>
          <p className="text-xs text-gray-600 text-center">Cap Material stock will be auto-deducted on save.</p>
        </div>
      </Modal>
    </div>
  );
};
