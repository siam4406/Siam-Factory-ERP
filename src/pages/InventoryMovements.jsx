/**
 * pages/InventoryMovements.jsx
 * Complete movement ledger for all stock in/out transactions.
 */
import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Filter, Warehouse } from 'lucide-react';
import { getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';
import { StatCard, Card, EmptyState, SectionHeader } from '../components/UI.jsx';
import { formatDate, todayStr } from '../utils/helpers.js';

const TYPE_COLORS = {
  in:  'text-green-400',
  out: 'text-red-400',
};

export const InventoryMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getAllRecordsV2(STORES_EXT.inventory_movements).catch(() => []);
    setMovements(data.sort((a, b) => b.date?.localeCompare(a.date)));
    setLoading(false);
  };

  const filtered = movements.filter(m => {
    if (catFilter !== 'all' && m.category !== catFilter)   return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    return true;
  });

  const totalIn  = movements.filter(m => m.type === 'in' ).length;
  const totalOut = movements.filter(m => m.type === 'out').length;

  const categories = ['all', 'raw_material', 'finished_goods', 'scrap'];
  const catLabel   = { all: 'All', raw_material: 'Raw Mat.', finished_goods: 'Finished', scrap: 'Scrap' };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Movements" value={movements.length}    icon={Warehouse}  color="blue"  />
        <StatCard title="Stock In"        value={totalIn}             icon={ArrowDown}  color="green" />
        <StatCard title="Stock Out"       value={totalOut}            icon={ArrowUp}    color="red"   />
        <StatCard title="Categories"      value={categories.length-1} icon={Filter}     color="purple"/>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {catLabel[c]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all','in','out'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {t === 'in' ? <ArrowDown size={11} /> : t === 'out' ? <ArrowUp size={11} /> : null}
              {t === 'all' ? 'All' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Movement list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Warehouse} title="No movements found" subtitle="Stock movements are auto-recorded during production and sales" />
        ) : (
          filtered.map((m, i) => (
            <Card key={i}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${m.type === 'in' ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                  {m.type === 'in'
                    ? <ArrowDown size={18} className="text-green-400" />
                    : <ArrowUp   size={18} className="text-red-400"   />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${TYPE_COLORS[m.type]}`}>
                      {m.type === 'in' ? '▲ IN' : '▼ OUT'}
                    </span>
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300 capitalize">{m.category?.replace('_',' ')}</span>
                  </div>
                  <p className="text-sm text-white font-medium mt-0.5">
                    {m.materialType || m.item || '—'}
                    {m.quantityKg   ? ` · ${m.quantityKg} KG` : ''}
                    {m.quantity     ? ` · ${m.quantity} pcs`  : ''}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(m.date)} · {m.reference}</p>
                  {m.notes && <p className="text-xs text-gray-600 mt-0.5 truncate">{m.notes}</p>}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
