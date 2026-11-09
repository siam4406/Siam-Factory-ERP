/**
 * pages/CustomerLedger.jsx
 * Complete customer management: profile, order history, payment tracking,
 * due balance ledger, and per-customer P&L summary.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Users, Phone, MapPin, DollarSign,
  ChevronRight, X, Edit2, TrendingUp, ShoppingCart, CheckCircle
} from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord, STORES } from '../database/db.js';
import {
  Modal, Button, FormInput, FormTextarea,
  StatCard, Card, EmptyState, InfoRow, StatusBadge
} from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const DEFAULT_FORM = { name: '', phone: '', address: '', notes: '' };

// ─── Sub-component: Customer detail sheet ────────────────────────────────────
const CustomerSheet = ({ customer, orders, sales, onClose, onEdit }) => {
  const customerOrders = orders.filter(
    o => o.customerName === customer.name || o.customerId === customer.id
  );
  const customerSales  = sales.filter(
    s => s.customerName === customer.name || s.customerId === customer.id
  );

  const totalOrdered  = customerOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalPaid     = customerOrders.reduce((s, o) => s + (o.advancePaid  || 0), 0)
                      + customerSales.reduce((s, v) => s + (v.paid || 0), 0);
  const totalDue      = customerOrders.reduce((s, o) => s + (o.dueAmount || 0), 0);
  const deliveredOrds = customerOrders.filter(o => o.status === 'Delivered').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-blue-300">{customer.name[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-lg leading-tight">{customer.name}</p>
          {customer.phone   && <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{customer.phone}</p>}
          {customer.address && <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><MapPin size={11}/>{customer.address}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}><Edit2 size={14}/></Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
          <p className="text-xs text-gray-400">Total Business</p>
          <p className="text-lg font-bold text-green-400">{formatBDT(totalOrdered)}</p>
        </div>
        <div className={`${totalDue > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-800 border-gray-700/50'} border rounded-xl p-3`}>
          <p className="text-xs text-gray-400">Due Balance</p>
          <p className={`text-lg font-bold ${totalDue > 0 ? 'text-red-400' : 'text-gray-400'}`}>{formatBDT(totalDue)}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <p className="text-xs text-gray-400">Total Paid</p>
          <p className="text-lg font-bold text-blue-400">{formatBDT(totalPaid)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700/50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Orders</p>
          <p className="text-lg font-bold text-white">{customerOrders.length} <span className="text-xs text-gray-500">({deliveredOrds} done)</span></p>
        </div>
      </div>

      {/* Order history */}
      {customerOrders.length > 0 && (
        <div>
          <p className="text-sm font-bold text-white mb-2">Order History</p>
          <div className="space-y-2">
            {customerOrders.slice(0,5).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-800/50 rounded-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{o.orderId}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{o.quantity} × {o.productType} · {formatDate(o.deliveryDate)}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-semibold text-white">{formatBDT(o.totalAmount)}</p>
                  {o.dueAmount > 0 && <p className="text-xs text-red-400">Due: {formatBDT(o.dueAmount)}</p>}
                </div>
              </div>
            ))}
            {customerOrders.length > 5 && (
              <p className="text-xs text-gray-600 text-center">+{customerOrders.length - 5} more orders</p>
            )}
          </div>
        </div>
      )}

      {/* Sales invoices */}
      {customerSales.length > 0 && (
        <div>
          <p className="text-sm font-bold text-white mb-2">Sales Invoices</p>
          <div className="space-y-2">
            {customerSales.slice(0,4).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-800/50 rounded-lg">
                <div>
                  <span className="text-xs font-bold text-green-400">{s.invoiceNumber}</span>
                  <p className="text-xs text-gray-400">{s.quantity} × {s.product} · {formatDate(s.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-400">{formatBDT(s.total)}</p>
                  <p className="text-xs text-gray-500">{s.paymentMethod}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {customer.notes && (
        <div className="p-3 bg-gray-800/50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-300">{customer.notes}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const CustomerLedger = () => {
  const { showToast, logActivity } = useApp();
  const [customers, setCustomers] = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [sales,     setSales]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(DEFAULT_FORM);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [c, o, s] = await Promise.all([
      getAllRecords(STORES.customers),
      getAllRecords(STORES.orders),
      getAllRecords(STORES.sales),
    ]);
    setCustomers(c.sort((a, b) => a.name?.localeCompare(b.name)));
    setOrders(o);
    setSales(s);
  };

  // Enrich customers with computed financials
  const enriched = useMemo(() => customers.map(c => {
    const cOrders = orders.filter(o => o.customerName === c.name || o.customerId === c.id);
    const cSales  = sales.filter(s => s.customerName  === c.name || s.customerId === c.id);
    const totalDue    = cOrders.reduce((s, o) => s + (o.dueAmount || 0), 0);
    const totalBiz    = cOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const orderCount  = cOrders.length;
    return { ...c, totalDue, totalBiz, orderCount };
  }), [customers, orders, sales]);

  const filtered = enriched.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalDueAll = enriched.reduce((s, c) => s + (c.totalDue || 0), 0);
  const totalBizAll = enriched.reduce((s, c) => s + (c.totalBiz || 0), 0);

  const f = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name) return showToast('Customer name required', 'error');
    setLoading(true);
    try {
      if (editing) {
        await updateRecord(STORES.customers, { ...editing, ...form });
        showToast('Customer updated', 'success');
      } else {
        await addRecord(STORES.customers, form);
        await logActivity('customer', `New customer: ${form.name}`);
        showToast('Customer added!', 'success');
      }
      await loadData();
      setShowForm(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
    } catch (e) {
      showToast('Error saving customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' });
    setShowSheet(false);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    await deleteRecord(STORES.customers, id);
    await loadData();
    setShowSheet(false);
    showToast('Customer deleted', 'info');
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Customers"  value={customers.length}        icon={Users}      color="blue"  />
        <StatCard title="Total Business"   value={formatBDT(totalBizAll)}  icon={TrendingUp} color="green" />
        <StatCard title="Total Due"        value={formatBDT(totalDueAll)}  icon={DollarSign} color={totalDueAll > 0 ? 'red' : 'blue'} />
        <StatCard title="With Due Balance" value={enriched.filter(c => c.totalDue > 0).length} icon={ShoppingCart} color="yellow" />
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm(DEFAULT_FORM); }}>
          <Plus size={16} />
        </Button>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.length === 0
          ? <EmptyState icon={Users} title="No customers found" subtitle="Add your first customer" />
          : filtered.map(c => (
              <Card
                key={c.id}
                className="cursor-pointer hover:border-blue-500/30 transition-colors active:scale-[0.99]"
                onClick={() => { setSelected(c); setShowSheet(true); }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-700/60 flex items-center justify-center shrink-0 text-lg font-bold text-blue-300">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/>{c.phone}</span>}
                      {c.orderCount > 0 && <span className="text-xs text-gray-500">{c.orderCount} orders</span>}
                    </div>
                    {c.totalBiz > 0 && <p className="text-xs text-green-400 mt-0.5">{formatBDT(c.totalBiz)} business</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {c.totalDue > 0
                      ? <div>
                          <p className="text-sm font-bold text-red-400">{formatBDT(c.totalDue)}</p>
                          <p className="text-xs text-red-500">Due</p>
                        </div>
                      : <CheckCircle size={18} className="text-green-500" />
                    }
                    <ChevronRight size={14} className="text-gray-600 mt-1 ml-auto" />
                  </div>
                </div>
              </Card>
            ))
        }
      </div>

      {/* Customer detail sheet */}
      <Modal
        isOpen={showSheet && !!selected}
        onClose={() => setShowSheet(false)}
        title="Customer Profile"
        size="md"
      >
        {selected && (
          <>
            <CustomerSheet
              customer={enriched.find(c => c.id === selected.id) || selected}
              orders={orders}
              sales={sales}
              onClose={() => setShowSheet(false)}
              onEdit={() => openEdit(selected)}
            />
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(selected)} className="flex-1">
                <Edit2 size={14}/> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>
                Delete
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Add / Edit form */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <div className="space-y-3">
          <FormInput
            label="Customer / Business Name *"
            value={form.name} onChange={f('name')}
            placeholder="e.g. Rahim Trading Co." required
          />
          <FormInput
            label="Phone Number"
            value={form.phone} onChange={f('phone')}
            placeholder="017XXXXXXXX"
          />
          <FormInput
            label="Address"
            value={form.address} onChange={f('address')}
            placeholder="Area, District"
          />
          <FormTextarea
            label="Notes"
            value={form.notes} onChange={f('notes')}
            placeholder="Payment terms, special notes…" rows={2}
          />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving…' : editing ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
