/**
 * pages/GlobalSearch.jsx
 * Full-text search across orders, customers, materials, production,
 * sales, expenses, machines. Results grouped by category.
 */
import React, { useState, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Users, Package, Factory, TrendingUp, DollarSign, Wrench, X } from 'lucide-react';
import { getAllRecords, STORES } from '../database/db.js';
import { useNavigate } from 'react-router-dom';
import { formatBDT, formatDate } from '../utils/helpers.js';
import { StatusBadge } from '../components/UI.jsx';

// ─── Result card ─────────────────────────────────────────────────────────────
const ResultCard = ({ icon: Icon, iconColor, title, sub, meta, badge, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-3 p-3 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50 hover:border-blue-500/30 rounded-xl transition-all text-left active:scale-[0.99]"
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
      <Icon size={17} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-semibold text-white truncate">{title}</p>
        {badge}
      </div>
      {sub  && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      {meta && <p className="text-xs text-gray-600 mt-0.5">{meta}</p>}
    </div>
  </button>
);

// ─── Category heading ─────────────────────────────────────────────────────────
const CategoryHead = ({ label, count }) => (
  <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
    <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">{count}</span>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export const GlobalSearch = () => {
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState(null);
  const [loading,  setLoading] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults(null); return; }
    setLoading(true);
    const ql = q.toLowerCase();

    try {
      const [orders, customers, materials, production, sales, expenses, machines] = await Promise.all([
        getAllRecords(STORES.orders),
        getAllRecords(STORES.customers),
        getAllRecords(STORES.materials),
        getAllRecords(STORES.production),
        getAllRecords(STORES.sales),
        getAllRecords(STORES.expenses),
        getAllRecords(STORES.machines),
      ]);

      const matchOrders     = orders.filter(o =>
        o.orderId?.toLowerCase().includes(ql) ||
        o.customerName?.toLowerCase().includes(ql) ||
        o.productType?.toLowerCase().includes(ql) ||
        o.phone?.includes(q)
      );
      const matchCustomers  = customers.filter(c =>
        c.name?.toLowerCase().includes(ql) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(ql)
      );
      const matchMaterials  = materials.filter(m =>
        m.name?.toLowerCase().includes(ql) ||
        m.type?.toLowerCase().includes(ql) ||
        m.supplier?.toLowerCase().includes(ql)
      );
      const matchProduction = production.filter(p =>
        p.operatorName?.toLowerCase().includes(ql) ||
        p.productType?.toLowerCase().includes(ql) ||
        p.machineName?.toLowerCase().includes(ql) ||
        p.date?.includes(q)
      );
      const matchSales      = sales.filter(s =>
        s.invoiceNumber?.toLowerCase().includes(ql) ||
        s.customerName?.toLowerCase().includes(ql) ||
        s.product?.toLowerCase().includes(ql)
      );
      const matchExpenses   = expenses.filter(e =>
        e.category?.toLowerCase().includes(ql) ||
        e.notes?.toLowerCase().includes(ql) ||
        e.date?.includes(q)
      );
      const matchMachines   = machines.filter(m =>
        m.name?.toLowerCase().includes(ql) ||
        m.type?.toLowerCase().includes(ql)
      );

      setResults({
        orders:     matchOrders.slice(0, 5),
        customers:  matchCustomers.slice(0, 5),
        materials:  matchMaterials.slice(0, 5),
        production: matchProduction.slice(0, 5),
        sales:      matchSales.slice(0, 5),
        expenses:   matchExpenses.slice(0, 5),
        machines:   matchMachines.slice(0, 5),
        total:      matchOrders.length + matchCustomers.length + matchMaterials.length +
                    matchProduction.length + matchSales.length + matchExpenses.length + matchMachines.length,
      });
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(val), 280);
  };

  const clear = () => { setQuery(''); setResults(null); };

  const total = results?.total || 0;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Search orders, customers, materials, production…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-10 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        />
        {query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* No query */}
      {!query && !loading && (
        <div className="text-center py-12">
          <Search size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Search the entire factory</p>
          <p className="text-gray-600 text-sm mt-1">Orders · Customers · Materials · Production · Sales</p>
        </div>
      )}

      {/* No results */}
      {results && total === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400 font-medium">No results for "{query}"</p>
          <p className="text-gray-600 text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Results */}
      {results && total > 0 && !loading && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{total} result{total !== 1 ? 's' : ''} for "{query}"</p>

          {/* Orders */}
          {results.orders.length > 0 && (
            <>
              <CategoryHead label="Orders" count={results.orders.length} />
              <div className="space-y-1.5">
                {results.orders.map(o => (
                  <ResultCard
                    key={o.id}
                    icon={ShoppingCart} iconColor="bg-blue-600"
                    title={`${o.orderId} — ${o.customerName}`}
                    sub={`${o.quantity} × ${o.productType} · ${formatBDT(o.totalAmount)}`}
                    meta={`Delivery: ${formatDate(o.deliveryDate)}`}
                    badge={<StatusBadge status={o.status} />}
                    onClick={() => navigate('/orders')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <>
              <CategoryHead label="Customers" count={results.customers.length} />
              <div className="space-y-1.5">
                {results.customers.map(c => (
                  <ResultCard
                    key={c.id}
                    icon={Users} iconColor="bg-purple-600"
                    title={c.name}
                    sub={[c.phone, c.address].filter(Boolean).join(' · ')}
                    meta={c.dueBalance > 0 ? `Due: ${formatBDT(c.dueBalance)}` : undefined}
                    onClick={() => navigate('/customers')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Materials */}
          {results.materials.length > 0 && (
            <>
              <CategoryHead label="Raw Materials" count={results.materials.length} />
              <div className="space-y-1.5">
                {results.materials.map(m => (
                  <ResultCard
                    key={m.id}
                    icon={Package} iconColor="bg-green-700"
                    title={m.name}
                    sub={`${m.type} · ${m.quantityKg} KG · ${formatBDT(m.ratePerKg)}/KG`}
                    meta={`Supplier: ${m.supplier || '—'} · ${formatDate(m.purchaseDate)}`}
                    onClick={() => navigate('/materials')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Production */}
          {results.production.length > 0 && (
            <>
              <CategoryHead label="Production" count={results.production.length} />
              <div className="space-y-1.5">
                {results.production.map(p => (
                  <ResultCard
                    key={p.id}
                    icon={Factory} iconColor="bg-cyan-700"
                    title={`${p.bottlesProduced} × ${p.productType}`}
                    sub={`${p.shift} Shift · ${p.operatorName} · ${p.machineName}`}
                    meta={formatDate(p.date)}
                    onClick={() => navigate('/production')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Sales */}
          {results.sales.length > 0 && (
            <>
              <CategoryHead label="Sales" count={results.sales.length} />
              <div className="space-y-1.5">
                {results.sales.map(s => (
                  <ResultCard
                    key={s.id}
                    icon={TrendingUp} iconColor="bg-emerald-700"
                    title={`${s.invoiceNumber} — ${s.customerName}`}
                    sub={`${s.quantity} × ${s.product} · ${formatBDT(s.total)}`}
                    meta={`${formatDate(s.date)} · ${s.paymentMethod}`}
                    onClick={() => navigate('/sales')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Expenses */}
          {results.expenses.length > 0 && (
            <>
              <CategoryHead label="Expenses" count={results.expenses.length} />
              <div className="space-y-1.5">
                {results.expenses.map(e => (
                  <ResultCard
                    key={e.id}
                    icon={DollarSign} iconColor="bg-red-700"
                    title={`${e.category} · ${formatBDT(e.amount)}`}
                    sub={e.notes || '—'}
                    meta={formatDate(e.date)}
                    onClick={() => navigate('/expenses')}
                  />
                ))}
              </div>
            </>
          )}

          {/* Machines */}
          {results.machines.length > 0 && (
            <>
              <CategoryHead label="Machines" count={results.machines.length} />
              <div className="space-y-1.5">
                {results.machines.map(m => (
                  <ResultCard
                    key={m.id}
                    icon={Wrench} iconColor="bg-gray-600"
                    title={m.name}
                    sub={`${m.type} · ${m.runningHours || 0} hrs`}
                    badge={<StatusBadge status={m.status} />}
                    onClick={() => navigate('/machines')}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
