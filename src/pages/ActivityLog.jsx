/**
 * pages/ActivityLog.jsx
 * Complete daily factory activity timeline with type filters and date range.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Filter, Calendar, Trash2 } from 'lucide-react';
import { getAllRecords, deleteRecord, STORES } from '../database/db.js';
import { Card, EmptyState, Button } from '../components/UI.jsx';
import { formatDateTime, formatDate, getActivityIcon, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const TYPES = ['all', 'production', 'cap_production', 'order', 'sale', 'material', 'expense', 'machine', 'customer'];
const TYPE_COLORS = {
  production:     'bg-blue-500/15 text-blue-300 border-blue-500/20',
  cap_production: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  order:          'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  sale:           'bg-green-500/15 text-green-300 border-green-500/20',
  material:       'bg-orange-500/15 text-orange-300 border-orange-500/20',
  expense:        'bg-red-500/15 text-red-300 border-red-500/20',
  machine:        'bg-purple-500/15 text-purple-300 border-purple-500/20',
  customer:       'bg-pink-500/15 text-pink-300 border-pink-500/20',
};

// ─── Group activities by date ─────────────────────────────────────────────────
const groupByDate = (activities) => {
  const groups = {};
  for (const act of activities) {
    const d = act.createdAt ? act.createdAt.split('T')[0] : 'unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(act);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
};

export const ActivityLog = () => {
  const { showToast } = useApp();
  const [activities, setActivities] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getAllRecords(STORES.activity_log);
    setActivities(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Clear all activity logs? This cannot be undone.')) return;
    for (const act of activities) {
      await deleteRecord(STORES.activity_log, act.id);
    }
    await loadData();
    showToast('Activity log cleared', 'info');
  };

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      const dateStr = a.createdAt ? a.createdAt.split('T')[0] : '';
      if (dateFrom && dateStr < dateFrom) return false;
      if (dateTo   && dateStr > dateTo)   return false;
      return true;
    });
  }, [activities, typeFilter, dateFrom, dateTo]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-white">{activities.length}</p>
          <p className="text-xs text-gray-500">Total Events</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-blue-400">
            {activities.filter(a => a.createdAt?.startsWith(todayStr())).length}
          </p>
          <p className="text-xs text-gray-500">Today</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-purple-400">{grouped.length}</p>
          <p className="text-xs text-gray-500">Active Days</p>
        </div>
      </div>

      {/* Type filter — scrollable chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 capitalize transition-all ${
              typeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t !== 'all' && <span>{getActivityIcon(t)}</span>}
            {t === 'all' ? 'All Types' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="flex gap-2 items-center">
        <Calendar size={14} className="text-gray-500 shrink-0" />
        <input
          type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
        />
        <span className="text-gray-600 text-xs">to</span>
        <input
          type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-gray-500 hover:text-white">
            <Filter size={14} />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">{filtered.length} events shown</p>
        {activities.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-red-500 hover:text-red-400">
            <Trash2 size={13} /> Clear Log
          </Button>
        )}
      </div>

      {/* Grouped timeline */}
      {grouped.length === 0 ? (
        <EmptyState icon={Activity} title="No activity found" subtitle="Activity is auto-logged during factory operations" />
      ) : (
        <div className="space-y-5">
          {grouped.map(({ date, items }) => {
            const isToday = date === todayStr();
            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {isToday ? 'Today' : formatDate(date)}
                  </div>
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-600">{items.length} events</span>
                </div>

                {/* Activity items */}
                <div className="space-y-2 pl-1">
                  {items.map((act, i) => {
                    const colorClass = TYPE_COLORS[act.type] || 'bg-gray-700/30 text-gray-400 border-gray-700/50';
                    return (
                      <div key={i} className="flex items-start gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center mt-1 shrink-0">
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm ${colorClass}`}>
                            {getActivityIcon(act.type)}
                          </div>
                          {i < items.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-1 min-h-[12px]" />}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <p className="text-sm text-gray-200 leading-snug">{act.message}</p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {act.createdAt ? new Date(act.createdAt).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
