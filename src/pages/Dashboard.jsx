/**
 * pages/Dashboard.jsx — v2
 * Enhanced with live alerts, daily P&L strip, daily report print.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Factory, TrendingUp, DollarSign, AlertTriangle,
  ShoppingCart, Plus, Cpu, Activity, Printer, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getAllRecords, STORES } from '../database/db.js';
import { StatCard, Card, SectionHeader, EmptyState } from '../components/UI.jsx';
import { AlertsPanel } from '../components/AlertsPanel.jsx';
import { formatBDT, formatDateTime, getActivityIcon, todayStr } from '../utils/helpers.js';
import { getDailySummary } from '../services/profitCalculator.js';
import { printDailyReport } from '../services/invoiceService.js';
import { useApp } from '../context/AppContext.jsx';

const QuickAction = ({ icon: Icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50 hover:border-blue-500/30 active:scale-95 transition-all"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-xs text-gray-300 font-medium leading-tight text-center">{label}</span>
    </button>
  );
};

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4'];

export const Dashboard = () => {
  const { showToast, factoryName } = useApp();
  const navigate = useNavigate();
  const [loading,        setLoading]        = useState(true);
  const [stats,          setStats]          = useState({});
  const [activities,     setActivities]     = useState([]);
  const [productionData, setProductionData] = useState([]);
  const [expenseData,    setExpenseData]    = useState([]);
  const [stockItems,     setStockItems]     = useState([]);
  const [daily,          setDaily]          = useState(null);
  const [alertTrigger,   setAlertTrigger]   = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [orders, production, sales, expenses, actLog, materialStock, capProd] =
        await Promise.all([
          getAllRecords(STORES.orders),
          getAllRecords(STORES.production),
          getAllRecords(STORES.sales),
          getAllRecords(STORES.expenses),
          getAllRecords(STORES.activity_log),
          getAllRecords(STORES.material_stock),
          getAllRecords(STORES.cap_production),
        ]);

      const today = todayStr();
      const totalSalesAmt    = sales.reduce((s, i) => s + (i.total || 0), 0);
      const totalExpensesAmt = expenses.reduce((s, i) => s + (i.amount || 0), 0);
      const totalDue         = orders.reduce((s, o) => s + (o.dueAmount || 0), 0);
      const pendingOrders    = orders.filter(o => ['Pending','In Production'].includes(o.status)).length;
      const lowStockCount    = materialStock.filter(m => m.balanceKg < 50).length;
      const totalBottles     = production.reduce((s, p) => s + (p.bottlesProduced || 0), 0);
      const totalCaps        = capProd.reduce((s, c) => s + (c.totalCapsProduced || 0), 0);
      const delayedOrders    = orders.filter(o =>
        !['Delivered','Cancelled'].includes(o.status) && o.deliveryDate < today).length;

      setStats({ totalSales: totalSalesAmt, totalExpenses: totalExpensesAmt,
        netProfit: totalSalesAmt - totalExpensesAmt, pendingOrders,
        totalOrders: orders.length, lowStockCount, totalDue,
        delayedOrders, totalBottles, totalCaps });

      setActivities([...actLog]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 7));

      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dp = production.filter(p => p.date === ds);
        last7.push({
          day:    d.toLocaleDateString('en', { weekday: 'short' }),
          good:   dp.reduce((s, p) => s + (p.goodBottles || p.bottlesProduced || 0), 0),
          rejects:dp.reduce((s, p) => s + (p.rejectQuantity || 0), 0),
        });
      }
      setProductionData(last7);

      const expCats = {};
      expenses.forEach(e => { expCats[e.category] = (expCats[e.category] || 0) + e.amount; });
      setExpenseData(Object.entries(expCats).map(([name, value]) => ({ name, value })));
      setStockItems(materialStock);

      const ds2 = await getDailySummary(today);
      setDaily(ds2);
    } catch (e) {
      showToast('Error loading dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => { setLoading(true); await loadData(); setAlertTrigger(t => t + 1); };
  const handlePrintDaily = () => { if (daily) printDailyReport(todayStr(), daily, factoryName); };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_,i) => <div key={i} className="h-24 bg-gray-800/50 rounded-xl" />)}</div>
      <div className="h-48 bg-gray-800/50 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {new Date().toLocaleDateString('en-BD', { weekday:'long', day:'numeric', month:'long' })}
        </p>
        <div className="flex gap-2">
          <button onClick={handleRefresh}
            className="p-2 rounded-lg bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <RefreshCw size={15} />
          </button>
          <button onClick={handlePrintDaily}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-xs font-medium">
            <Printer size={14} /> Daily Report
          </button>
        </div>
      </div>

      {/* Live Alerts */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Live Alerts</p>
        <AlertsPanel compact refreshTrigger={alertTrigger} />
      </div>

      {/* Today strip */}
      {daily && (
        <Card className="bg-gradient-to-br from-blue-600/15 to-blue-900/10 border-blue-500/20">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2.5">Today</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-xl font-black text-white">{daily.bottles}</p><p className="text-xs text-gray-500">Bottles</p></div>
            <div><p className="text-xl font-black text-cyan-400">{daily.caps}</p><p className="text-xs text-gray-500">Caps</p></div>
            <div><p className="text-xl font-black text-green-400">{formatBDT(daily.revenue)}</p><p className="text-xs text-gray-500">Sales</p></div>
            <div>
              <p className={`text-xl font-black ${daily.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {daily.netProfit >= 0 ? '+' : ''}{formatBDT(daily.netProfit)}
              </p>
              <p className="text-xs text-gray-500">Profit</p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Sales"      value={formatBDT(stats.totalSales)}  icon={TrendingUp}    color="green"  onClick={() => navigate('/sales')} />
        <StatCard title="Net Profit"       value={formatBDT(stats.netProfit)}   icon={DollarSign}    color={stats.netProfit >= 0 ? 'blue' : 'red'} onClick={() => navigate('/profit')} />
        <StatCard title="Pending Orders"   value={`${stats.pendingOrders}`}     sub={stats.delayedOrders > 0 ? `${stats.delayedOrders} delayed` : `of ${stats.totalOrders}`} icon={ShoppingCart} color={stats.delayedOrders > 0 ? 'red' : 'yellow'} onClick={() => navigate('/orders')} />
        <StatCard title="Due Payments"     value={formatBDT(stats.totalDue)}    icon={AlertTriangle}  color={stats.totalDue > 0 ? 'red' : 'blue'} onClick={() => navigate('/customers')} />
        <StatCard title="Total Production" value={`${(stats.totalBottles||0).toLocaleString()} pcs`} icon={Factory} color="cyan" onClick={() => navigate('/production')} />
        <StatCard title="Total Caps"       value={`${(stats.totalCaps||0).toLocaleString()} pcs`}    icon={Cpu}     color="purple" onClick={() => navigate('/cap-production')} />
      </div>

      {/* Quick Actions */}
      <Card>
        <p className="text-sm font-bold text-white mb-3">Quick Actions</p>
        <div className="grid grid-cols-5 gap-2">
          <QuickAction icon={Plus}        label="Production" to="/production" color="bg-blue-600" />
          <QuickAction icon={DollarSign}  label="Expense"    to="/expenses"   color="bg-red-600"  />
          <QuickAction icon={ShoppingCart}label="Order"      to="/orders"     color="bg-yellow-600"/>
          <QuickAction icon={Package}     label="Material"   to="/materials"  color="bg-green-600"/>
          <QuickAction icon={TrendingUp}  label="Sale"       to="/sales"      color="bg-purple-600"/>
        </div>
      </Card>

      {/* Production chart */}
      <Card>
        <SectionHeader title="7-Day Production" subtitle="Good bottles vs rejects" />
        <ResponsiveContainer width="100%" height={155}>
          <BarChart data={productionData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day"    tick={{ fill:'#9ca3af', fontSize:11 }} />
            <YAxis                  tick={{ fill:'#9ca3af', fontSize:11 }} />
            <Tooltip contentStyle={{ backgroundColor:'#1f2937', border:'1px solid #374151', borderRadius:10 }} />
            <Bar dataKey="good"    fill="#22c55e" radius={[4,4,0,0]} name="Good"    stackId="a" />
            <Bar dataKey="rejects" fill="#ef4444" radius={[4,4,0,0]} name="Rejects" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Expense pie */}
      {expenseData.length > 0 && (
        <Card>
          <SectionHeader title="Expense Breakdown" />
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={130}>
              <PieChart>
                <Pie data={expenseData} cx="50%" cy="50%" innerRadius={34} outerRadius={58} dataKey="value" paddingAngle={2}>
                  {expenseData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 min-w-0">
              {expenseData.map((item,i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-400 truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-medium text-white shrink-0">{formatBDT(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Material Stock */}
      <Card>
        <SectionHeader title="Material Stock"
          action={<button onClick={() => navigate('/materials')} className="text-xs text-blue-400">View all →</button>}
        />
        <div className="space-y-2.5">
          {stockItems.length === 0
            ? <EmptyState icon={Package} title="No stock data" />
            : stockItems.map((item,i) => {
                const pct = item.availableKg > 0 ? Math.min(100, (item.balanceKg / item.availableKg) * 100) : 0;
                const low = item.balanceKg < 50;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{item.materialType}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${low ? 'text-red-400' : 'text-green-400'}`}>{item.balanceKg} KG</span>
                        {low && <AlertTriangle size={13} className="text-red-400" />}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-700/60 rounded-full">
                      <div className={`h-1.5 rounded-full ${low ? 'bg-red-500' : 'bg-green-500'}`} style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })
          }
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <SectionHeader title="Recent Activity"
          action={<button onClick={() => navigate('/activity')} className="text-xs text-blue-400">View all →</button>}
        />
        {activities.length === 0
          ? <EmptyState icon={Activity} title="No recent activity" />
          : <div className="space-y-3">
              {activities.map((act,i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sm shrink-0">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 leading-snug">{act.message}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(act.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
};
