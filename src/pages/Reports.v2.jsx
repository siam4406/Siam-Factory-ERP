/**
 * pages/Reports.v2.jsx
 * Advanced reporting engine: P&L, material consumption, operator performance,
 * machine stats, wastage analysis. Uses useReports hook.
 */
import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Package, Cpu, Users, AlertTriangle } from 'lucide-react';
import { useReports } from '../hooks/useReports.js';
import { StatCard, Card, SectionHeader, Skeleton, EmptyState, InfoRow } from '../components/UI.jsx';
import { formatBDT, todayStr } from '../utils/helpers.js';

// Fallback for formatBDTFull if not yet in helpers
const fmt = (v) => {
  if (!v && v !== 0) return '৳0';
  return '৳' + Number(v).toLocaleString('en-IN');
};

const TABS = [
  { id: 'pnl',       label: 'P & L',        icon: TrendingUp  },
  { id: 'production', label: 'Production',   icon: BarChart3   },
  { id: 'materials',  label: 'Materials',    icon: Package     },
  { id: 'operators',  label: 'Operators',    icon: Users       },
  { id: 'machines',   label: 'Machines',     icon: Cpu         },
  { id: 'wastage',    label: 'Wastage',      icon: AlertTriangle },
];

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#f97316'];

const ProfitLossSection = ({ pnl }) => {
  if (!pnl) return null;
  const { sales, production, expenses, profit } = pnl;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Revenue"     value={fmt(sales.revenue)}     icon={TrendingUp} color="green"  />
        <StatCard title="Net Profit"  value={fmt(profit.netProfit)}  icon={TrendingUp} color={profit.netProfit >= 0 ? 'blue' : 'red'} />
        <StatCard title="Prod. Cost"  value={fmt(production.totalCost)} icon={BarChart3} color="orange" />
        <StatCard title="Expenses"    value={fmt(expenses.total)}    icon={BarChart3}  color="red"    />
      </div>

      {/* P&L breakdown */}
      <Card>
        <SectionHeader title="Profit & Loss Breakdown" />
        <InfoRow label="Gross Sales Revenue"      value={fmt(sales.revenue)}              valueClass="text-green-400 font-bold" />
        <InfoRow label="— Material Cost"          value={fmt(production.materialCost)}    valueClass="text-orange-400" />
        <InfoRow label="— Electricity Cost"       value={fmt(production.electricityCost)} valueClass="text-yellow-400" />
        <InfoRow label="— Labor Cost"             value={fmt(production.laborCost)}       valueClass="text-purple-400" />
        <InfoRow label="Gross Profit"             value={fmt(profit.grossProfit)}         valueClass={profit.grossProfit >= 0 ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'} />
        <InfoRow label="— Other Expenses"         value={fmt(expenses.total)}             valueClass="text-red-400" />
        <InfoRow label="Net Profit"               value={fmt(profit.netProfit)}           valueClass={profit.netProfit >= 0 ? 'text-green-400 font-bold text-lg' : 'text-red-400 font-bold text-lg'} />
        <InfoRow label="Profit Margin"            value={`${profit.profitMargin}%`}       valueClass={profit.profitMargin >= 0 ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'} />
        <InfoRow label="Pending Receivables"      value={fmt(sales.due)}                  valueClass="text-yellow-400" />
      </Card>

      {/* Expense pie */}
      {Object.keys(expenses.byCat).length > 0 && (
        <Card>
          <SectionHeader title="Expense Breakdown" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={130}>
              <PieChart>
                <Pie data={Object.entries(expenses.byCat).map(([name, value]) => ({ name, value }))}
                  cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={2}>
                  {Object.keys(expenses.byCat).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {Object.entries(expenses.byCat).map(([cat, val], i) => (
                <div key={cat} className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-400 truncate">{cat}</span>
                  </div>
                  <span className="text-xs font-medium text-white shrink-0">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const ProductionSection = ({ trend, pnl }) => {
  if (!trend || !pnl) return null;
  const { production } = pnl;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Bottles"    value={production.bottles.toLocaleString()}   icon={BarChart3} color="blue"   />
        <StatCard title="Good Bottles"     value={production.goodBottles.toLocaleString()} icon={BarChart3} color="green"  />
        <StatCard title="Total Rejects"    value={production.rejects.toLocaleString()}   icon={AlertTriangle} color="red" />
        <StatCard title="Avg Cost/Bottle"  value={fmt(production.avgCostPerBottle)}      icon={TrendingUp} color="orange" />
      </div>
      <Card>
        <SectionHeader title="Monthly Production Trend" />
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="goodBottles" fill="#22c55e" radius={[4,4,0,0]} name="Good Bottles" />
            <Bar dataKey="bottles"     fill="#3b82f650" radius={[4,4,0,0]} name="Total Bottles" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <SectionHeader title="Monthly Revenue vs Cost" />
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              formatter={(val) => [`৳${val.toLocaleString()}`, '']} />
            <Line type="monotone" dataKey="revenue"  stroke="#22c55e" strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="prodCost" stroke="#f59e0b" strokeWidth={2} dot={false} name="Prod Cost" />
            <Line type="monotone" dataKey="netProfit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Net Profit" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

const MaterialsSection = ({ materials }) => {
  if (!materials || materials.length === 0) return <EmptyState icon={Package} title="No material data" />;
  return (
    <div className="space-y-3">
      {materials.map((m, i) => (
        <Card key={i}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-white">{m.materialType}</p>
              <p className="text-xs text-gray-400">{m.batches} production batches</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-blue-400">{m.totalKg.toFixed(1)} KG used</p>
              <p className="text-xs text-orange-400">{fmt(m.totalCost)} total</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Wasted</p>
              <p className="text-red-400 font-semibold">{m.wastedKg.toFixed(2)} KG</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Wastage%</p>
              <p className={`font-semibold ${m.wastagePct > 8 ? 'text-red-400' : m.wastagePct > 4 ? 'text-yellow-400' : 'text-green-400'}`}>{m.wastagePct}%</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Cost/KG</p>
              <p className="text-cyan-400 font-semibold">{fmt(m.costPerKg)}</p>
            </div>
          </div>
          {/* Wastage bar */}
          <div className="mt-2 bg-gray-700/50 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${m.wastagePct > 8 ? 'bg-red-500' : m.wastagePct > 4 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, m.wastagePct * 5)}%` }} />
          </div>
        </Card>
      ))}
    </div>
  );
};

const OperatorsSection = ({ operators }) => {
  if (!operators || operators.length === 0) return <EmptyState icon={Users} title="No operator data" />;
  return (
    <div className="space-y-2">
      {operators.map((op, i) => (
        <Card key={i}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
              i === 0 ? 'bg-yellow-500/20 text-yellow-300' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-600/20 text-orange-300'
            }`}>
              {i < 3 ? ['🥇','🥈','🥉'][i] : op.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{op.name}</p>
              <p className="text-xs text-gray-400">{op.shifts} shifts · {op.totalBottles?.toLocaleString()} bottles</p>
              <div className="mt-1.5 bg-gray-700/50 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${Number(op.avgEfficiency) >= 95 ? 'bg-green-500' : Number(op.avgEfficiency) >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${op.avgEfficiency}%` }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-lg font-bold ${Number(op.avgEfficiency) >= 95 ? 'text-green-400' : Number(op.avgEfficiency) >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
                {op.avgEfficiency}%
              </p>
              <p className="text-xs text-gray-500">{op.bottlesPerShift}/shift</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const MachinesSection = ({ machines }) => {
  if (!machines || machines.length === 0) return <EmptyState icon={Cpu} title="No machine production data" />;
  return (
    <div className="space-y-2">
      {machines.map((m, i) => (
        <Card key={i}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-white">{m.machineName}</p>
              <p className="text-xs text-gray-400">{m.batches} production batches</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${Number(m.efficiency) >= 95 ? 'text-green-400' : Number(m.efficiency) >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{m.efficiency}%</p>
              <p className="text-xs text-red-400">{m.rejectPct}% reject</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Bottles</p>
              <p className="text-white font-semibold">{m.totalBottles?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Rejects</p>
              <p className="text-red-400 font-semibold">{m.totalRejects?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center">
              <p className="text-gray-500">Elec Hrs</p>
              <p className="text-yellow-400 font-semibold">{m.elecHours}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const WastageSection = ({ pnl, materials }) => {
  if (!pnl) return null;
  const { production } = pnl;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Rejects"  value={production.rejects.toLocaleString()} icon={AlertTriangle} color="red" />
        <StatCard title="Reject Rate"    value={`${production.rejectPct}%`}          icon={AlertTriangle} color={production.rejectPct < 3 ? 'green' : production.rejectPct < 7 ? 'yellow' : 'red'} />
        <StatCard title="Mat. Wasted"    value={`${production.wastedKg} KG`}         icon={Package}       color="orange" />
        <StatCard title="Wastage Rate"   value={`${production.wastagePct}%`}         icon={Package}       color={production.wastagePct < 4 ? 'green' : production.wastagePct < 8 ? 'yellow' : 'red'} />
      </div>
      <Card>
        <SectionHeader title="Scrap Analysis" />
        <InfoRow label="Total Bottles Produced"    value={production.bottles.toLocaleString()} />
        <InfoRow label="Good Bottles"              value={production.goodBottles.toLocaleString()} valueClass="text-green-400 font-bold" />
        <InfoRow label="Rejected Bottles"          value={production.rejects.toLocaleString()}     valueClass="text-red-400 font-bold" />
        <InfoRow label="Material Used (KG)"        value={`${production.matKgUsed?.toFixed(1)} KG`} />
        <InfoRow label="Material Wasted (KG)"      value={`${production.wastedKg} KG`}            valueClass="text-orange-400" />
        <InfoRow label="Est. Cost of Rejects"      value={fmt(production.rejects * production.avgCostPerBottle)} valueClass="text-red-400 font-bold" />
      </Card>
      {materials && <MaterialsSection materials={materials} />}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export const AdvancedReports = () => {
  const [tab,    setTab]    = useState('pnl');
  const [period, setPeriod] = useState({});

  const { data, loading, refresh } = useReports(period);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-48" />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* Tab bar — scrollable on mobile */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${tab === id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {tab === 'pnl'        && <ProfitLossSection pnl={data?.pnl}                                   />}
      {tab === 'production' && <ProductionSection  trend={data?.trend}  pnl={data?.pnl}             />}
      {tab === 'materials'  && <MaterialsSection   materials={data?.materials}                       />}
      {tab === 'operators'  && <OperatorsSection   operators={data?.operators}                       />}
      {tab === 'machines'   && <MachinesSection    machines={data?.machines}                         />}
      {tab === 'wastage'    && <WastageSection      pnl={data?.pnl}  materials={data?.materials}     />}

      {/* Refresh */}
      <button onClick={refresh} className="w-full py-2 text-xs text-gray-500 hover:text-blue-400 transition-colors">
        ↻ Refresh reports
      </button>
    </div>
  );
};

export default AdvancedReports;
