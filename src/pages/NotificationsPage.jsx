/**
 * pages/NotificationsPage.jsx
 * Manages IndexedDB notifications + live business-rule alerts in one view.
 */
import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getAllRecords, updateRecord, deleteRecord, STORES } from '../database/db.js';
import { evaluateAllRules } from '../services/businessRules.js';
import { Card, Button, EmptyState } from '../components/UI.jsx';
import { formatDateTime } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const SEV_STYLE = {
  critical: { border: 'border-red-500/30 bg-red-500/8',    icon: <XCircle   size={16} className="text-red-400 shrink-0 mt-0.5"    />, badge: 'bg-red-500/20 text-red-300'    },
  warning:  { border: 'border-yellow-500/30 bg-yellow-500/8', icon: <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />, badge: 'bg-yellow-500/20 text-yellow-300' },
  info:     { border: 'border-blue-500/30 bg-blue-500/8',  icon: <Info      size={16} className="text-blue-400 shrink-0 mt-0.5"   />, badge: 'bg-blue-500/20 text-blue-300'  },
  success:  { border: 'border-green-500/30 bg-green-500/8',icon: <CheckCircle size={16} className="text-green-400 shrink-0 mt-0.5" />, badge: 'bg-green-500/20 text-green-300' },
};

const defaultStyle = SEV_STYLE.info;

export const NotificationsPage = () => {
  const { loadNotifications, showToast } = useApp();
  const [stored,   setStored]   = useState([]);   // from IndexedDB
  const [alerts,   setAlerts]   = useState([]);   // from business rules
  const [tab,      setTab]      = useState('all'); // 'all' | 'unread' | 'alerts'
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [notifs, ruleAlerts] = await Promise.all([
      getAllRecords(STORES.notifications),
      evaluateAllRules().catch(() => []),
    ]);
    setStored(notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setAlerts(ruleAlerts);
    setLoading(false);
  };

  const markRead = async (notif) => {
    await updateRecord(STORES.notifications, { ...notif, read: true });
    await loadData();
    await loadNotifications();
  };

  const markAllRead = async () => {
    const unread = stored.filter(n => !n.read);
    for (const n of unread) await updateRecord(STORES.notifications, { ...n, read: true });
    await loadData();
    await loadNotifications();
    showToast('All marked as read', 'success');
  };

  const deleteNotif = async (id) => {
    await deleteRecord(STORES.notifications, id);
    await loadData();
    await loadNotifications();
  };

  const unreadCount = stored.filter(n => !n.read).length;

  const shownNotifs = tab === 'unread' ? stored.filter(n => !n.read) : stored;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {unreadCount > 0 && (
            <span className="text-sm text-gray-400">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button onClick={loadData} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={16} />
        </button>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
        {[
          { id: 'all',    label: `All (${stored.length})`          },
          { id: 'unread', label: `Unread (${unreadCount})`         },
          { id: 'alerts', label: `Live Alerts (${alerts.length})`  },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stored notifications */}
      {tab !== 'alerts' && (
        <div className="space-y-2">
          {shownNotifs.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" subtitle="You're all caught up!" />
          ) : (
            shownNotifs.map(n => {
              const s = SEV_STYLE[n.type === 'low_stock' ? 'critical' : n.type === 'due_payment' ? 'warning' : 'info'] || defaultStyle;
              return (
                <div key={n.id} className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.border} ${!n.read ? 'ring-1 ring-inset ring-white/5' : 'opacity-60'}`}>
                  {s.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-green-400 transition-colors"
                        title="Mark as read"
                      >
                        <CheckCheck size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Live alerts from business rules engine */}
      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle size={20} className="text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-400">All systems normal</p>
                <p className="text-xs text-gray-400 mt-0.5">No active business rule alerts.</p>
              </div>
            </div>
          ) : (
            alerts.map((a, i) => {
              const s = SEV_STYLE[a.severity] || defaultStyle;
              return (
                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.border}`}>
                  {s.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.badge}`}>{a.severity}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{a.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <button onClick={loadData} className="w-full py-2 text-xs text-gray-500 hover:text-blue-400 transition-colors">
            ↻ Refresh live alerts
          </button>
        </div>
      )}
    </div>
  );
};
