/**
 * components/AlertsPanel.jsx + pages/ProfitCalculator.jsx
 * AlertsPanel: business-rules alert dashboard (reusable anywhere).
 * ProfitCalculator: interactive P&L calculator with date-range selector.
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, RefreshCw, TrendingUp, DollarSign, Package, Factory, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAlerts } from '../hooks/useAlerts.js';
import { useReports } from '../hooks/useReports.js';
import { Card, SectionHeader, StatCard, EmptyState, InfoRow } from './UI.jsx';
import { formatBDT, todayStr } from '../utils/helpers.js';

// ─── Severity styling ─────────────────────────────────────────────────────────
const SEV = {
  critical: {
    bg:   'bg-red-500/10 border-red-500/30',
    icon: <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />,
    badge: 'bg-red-500/20 text-red-300',
  },
  warning: {
    bg:   'bg-yellow-500/10 border-yellow-500/30',
    icon: <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />,
    badge: 'bg-yellow-500/20 text-yellow-300',
  },
  info: {
    bg:   'bg-blue-500/10 border-blue-500/30',
    icon: <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />,
    badge: 'bg-blue-500/20 text-blue-300',
  },
};

// ─── AlertsPanel (exported for use in Dashboard + standalone) ─────────────────
export const AlertsPanel = ({ compact = false, refreshTrigger = 0 }) => {
  const { alerts, criticals, warnings, loading, refresh } = useAlerts(refreshTrigger);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[0,1,2].map(i => <div key={i} className="h-14 bg-gray-700/40 rounded-xl" />)}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
        <CheckCircle size={16} className="text-green-400 shrink-0" />
        <p className="text-sm text-green-400 font-medium">All systems normal — no active alerts.</p>
      </div>
    );
  }

  const shown = compact ? alerts.slice(0, 4) : alerts;

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {criticals.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
            <XCircle size={11} />{criticals.length} Critical
          </span>
        )}
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300">
            <AlertTriangle size={11} />{warnings.length} Warning
          </span>
        )}
        <button onClick={refresh} className="ml-auto text-gray-500 hover:text-blue-400 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {shown.map((alert, i) => {
        const s = SEV[alert.severity] || SEV.info;
        return (
          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.bg}`}>
            {s.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug">{alert.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{alert.message}</p>
            </div>
          </div>
        );
      })}

      {compact && alerts.length > 4 && (
        <p className="text-xs text-gray-500 text-center">+{alerts.length - 4} more alerts</p>
      )}
    </div>
  );
};

// ─── Profit Calculator page ────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Today',      from: todayStr(),    to: todayStr() },
  { label: 'This Month', from: `${todayStr().slice(0,7)}-01`, to: todayStr() },
  { label: 'Last 3 Mo',  from: (() => { const d = new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().split('T')[0]; })(), to: todayStr() },
  { label: 'All Time',   from: '2020-01-01',  to: todayStr() },
];

export const ProfitCalculator = () => {
  const [preset,  setPreset]  = useState(1);
  const [custom,  setCustom]  = useState({ from: '', to: '' });
  const [useCustom, setUseCustom] = useState(false);

  const period = useCustom && custom.from && custom.to
    ? custom
    : PRESETS[preset];

  const { data, loading, refresh } = useReports(period);

  const fmt = (v) => v !== undefined && v !== null ? '৳' + Number(v).toLocaleString('en-IN') : '৳0';

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_,i) => <div key={i} className="h-16 animate-pulse bg-gray-700/40 rounded-xl" />)}
      </div>
    );
  }

  const { pnl, trend } = data;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card>
        <p className="text-sm font-bold text-white mb-3">Select Period</p>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {PRESETS.map((p, i) => (
            <button key={i}
              onClick={() => { setPreset(i); setUseCustom(false); }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${!useCustom && preset === i ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={custom.from} onChange={e => { setCustom(c => ({...c, from: e.target.value})); setUseCustom(true); }}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
          <span className="text-gray-500 text-xs">to</span>
          <input type="date" value={custom.to} onChange={e => { setCustom(c => ({...c, to: e.target.value})); setUseCustom(true); }}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
        </div>
        <p className="text-xs text-gray-600 mt-2">Period: {period.from} → {period.to}</p>
      </Card>

      {/* Top-level numbers */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Revenue"      value={fmt(pnl.sales.revenue)}      icon={TrendingUp} color="green" />
        <StatCard title="Net Profit"   value={fmt(pnl.profit.netProfit)}   icon={TrendingUp} color={pnl.profit.netProfit >= 0 ? 'blue' : 'red'} />
        <StatCard title="Total Cost"   value={fmt(pnl.production.totalCost + pnl.expenses.total)} icon={DollarSign} color="orange" />
        <StatCard title="Profit Margin" value={`${pnl.profit.profitMargin}%`} icon={TrendingUp}  color={pnl.profit.profitMargin >= 15 ? 'green' : pnl.profit.profitMargin >= 5 ? 'yellow' : 'red'} />
      </div>

      {/* Waterfall style breakdown */}
      <Card>
        <SectionHeader title="Cost Waterfall (BDT)" />
        {[
          { label: 'Gross Sales Revenue',   val: pnl.sales.revenue,             color: 'bg-green-500',  positive: true },
          { label: 'Material Cost',         val: -pnl.production.materialCost,  color: 'bg-orange-500', positive: false },
          { label: 'Electricity Cost',      val: -pnl.production.electricityCost, color: 'bg-yellow-500', positive: false },
          { label: 'Labor Cost',            val: -pnl.production.laborCost,     color: 'bg-purple-500', positive: false },
          { label: 'Other Expenses',        val: -pnl.expenses.total,           color: 'bg-red-500',    positive: false },
          { label: 'NET PROFIT',            val: pnl.profit.netProfit,          color: pnl.profit.netProfit >= 0 ? 'bg-blue-500' : 'bg-red-600', positive: pnl.profit.netProfit >= 0 },
        ].map((row, i) => {
          const absMax = pnl.sales.revenue || 1;
          const width  = Math.min(100, Math.abs(row.val) / absMax * 100);
          return (
            <div key={i} className={`py-2 ${i > 0 ? 'border-t border-gray-700/30' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs ${i === 5 ? 'font-bold text-white' : 'text-gray-400'}`}>{row.label}</span>
                <span className={`text-xs font-bold ${row.positive ? 'text-green-400' : 'text-red-400'} ${i === 5 ? 'text-sm' : ''}`}>
                  {row.positive ? '+' : '-'}{fmt(Math.abs(row.val))}
                </span>
              </div>
              <div className="bg-gray-700/40 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* Production stats */}
      <Card>
        <SectionHeader title="Production Summary" />
        <InfoRow label="Total Bottles Produced"  value={pnl.production.bottles.toLocaleString()} />
        <InfoRow label="Good Bottles"            value={pnl.production.goodBottles.toLocaleString()} valueClass="text-green-400 font-bold" />
        <InfoRow label="Rejected Bottles"        value={pnl.production.rejects.toLocaleString()}     valueClass="text-red-400" />
        <InfoRow label="Reject Rate"             value={`${pnl.production.rejectPct}%`}              valueClass={pnl.production.rejectPct < 3 ? 'text-green-400' : 'text-yellow-400'} />
        <InfoRow label="Avg Cost per Bottle"     value={fmt(pnl.production.avgCostPerBottle)}        valueClass="text-cyan-400 font-bold" />
        <InfoRow label="Material Used"           value={`${pnl.production.matKgUsed?.toFixed(1)} KG`} />
        <InfoRow label="Material Wasted"         value={`${pnl.production.wastedKg} KG (${pnl.production.wastagePct}%)`} valueClass="text-orange-400" />
        <InfoRow label="Electricity Cost"        value={fmt(pnl.production.electricityCost)} valueClass="text-yellow-400" />
      </Card>

      {/* 6-month trend chart */}
      {trend && trend.length > 0 && (
        <Card>
          <SectionHeader title="6-Month Net Profit Trend" />
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={trend} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(v) => [`৳${v.toLocaleString()}`, '']} />
              <Bar dataKey="netProfit" radius={[4,4,0,0]} name="Net Profit"
                fill="#3b82f6"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <button onClick={refresh} className="w-full py-2 text-xs text-gray-500 hover:text-blue-400 transition-colors">
        ↻ Recalculate
      </button>
    </div>
  );
};
