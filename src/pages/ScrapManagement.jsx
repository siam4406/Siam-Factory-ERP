/**
 * pages/ScrapManagement.jsx
 * View, filter and analyze scrap / reject logs from v2 DB stores.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Recycle, Package, TrendingDown } from 'lucide-react';
import { getAllRecords, STORES } from '../database/db.js';
import { getAllRecordsV2, STORES_EXT } from '../database/db.v2.js';
import { StatCard, Card, EmptyState, SectionHeader } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';

export const ScrapManagement = () => {
  const [scrapLog, setScrapLog]       = useState([]);
  const [inventory, setInventory]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterType, setFilterType]   = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [log, inv] = await Promise.all([
      getAllRecordsV2(STORES_EXT.scrap_log).catch(() => []),
      getAllRecords(STORES.inventory),
    ]);
    setScrapLog(log.sort((a, b) => b.date?.localeCompare(a.date)));
    setInventory(inv.filter(i => i.category === 'Scrap / Reject'));
    setLoading(false);
  };

  const totalRejectBottles = scrapLog.filter(s => s.scrapType === 'reject_bottle').reduce((s, i) => s + (i.quantity || 0), 0);
  const totalRejectCaps    = scrapLog.filter(s => s.scrapType === 'reject_cap').reduce((s, i) => s + (i.quantity || 0), 0);
  const totalCostLoss      = scrapLog.reduce((s, i) => s + (i.estimatedCostLoss || 0), 0);

  const filtered = filterType === 'all' ? scrapLog : scrapLog.filter(s => s.scrapType === filterType);

  const typeColors = {
    reject_bottle: 'bg-red-500/20 text-red-300 border-red-500/30',
    reject_cap:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
    recyclable:    'bg-green-500/20 text-green-300 border-green-500/30',
  };
  const typeLabel = { reject_bottle: '🍾 Rejected Bottle', reject_cap: '🔩 Rejected Cap', recyclable: '♻️ Recyclable' };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Reject Bottles" value={totalRejectBottles.toLocaleString()} icon={AlertTriangle} color="red"    />
        <StatCard title="Reject Caps"    value={totalRejectCaps.toLocaleString()}    icon={AlertTriangle} color="orange" />
        <StatCard title="Cost Loss"      value={formatBDT(totalCostLoss)}            icon={TrendingDown}  color="red"    />
        <StatCard title="Scrap Entries"  value={scrapLog.length}                     icon={Recycle}       color="purple" />
      </div>

      {/* Current scrap inventory */}
      <Card>
        <SectionHeader title="Scrap Inventory" subtitle="Current stock of rejected items" />
        {inventory.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-3">No scrap inventory recorded</p>
        ) : (
          <div className="space-y-2">
            {inventory.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-700/30 last:border-0">
                <span className="text-sm text-gray-300">{item.item}</span>
                <div className="text-right">
                  <span className="text-red-400 font-bold text-lg">{item.quantity?.toLocaleString()}</span>
                  <span className="text-gray-500 text-xs ml-1">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all','reject_bottle','reject_cap'].map(t => (
          <button key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${filterType === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {t === 'all' ? 'All' : typeLabel[t]}
          </button>
        ))}
      </div>

      {/* Log */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Recycle} title="No scrap records found" subtitle="Scrap is auto-logged when production entries are saved" />
        ) : (
          filtered.map((item, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[item.scrapType] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {typeLabel[item.scrapType] || item.scrapType}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{item.quantity?.toLocaleString()} pcs</p>
                  <p className="text-xs text-gray-400">{formatDate(item.date)} · {item.operatorName}</p>
                  <p className="text-xs text-gray-500">{item.machineName}</p>
                  {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-400">{formatBDT(item.estimatedCostLoss)}</p>
                  <p className="text-xs text-gray-500">cost loss</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
