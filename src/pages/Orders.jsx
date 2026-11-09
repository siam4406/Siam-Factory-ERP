import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, ShoppingCart, Filter } from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord, STORES } from '../database/db.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatusBadge, SectionHeader, EmptyState, Card, StatCard, InfoRow } from '../components/UI.jsx';
import { formatBDT, formatDate, generateOrderId, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const ORDER_STATUSES = ['Pending', 'In Production', 'Completed', 'Delivered', 'Cancelled'];
const PRODUCT_TYPES = ['5L Bottle', '10L Bottle'];

const defaultForm = {
  customerName: '', phone: '', address: '',
  productType: '5L Bottle', capIncluded: false,
  quantity: '', pricePerPiece: '', totalAmount: '',
  advancePaid: '', dueAmount: '', deliveryDate: todayStr(),
  status: 'Pending', notes: ''
};

export const Orders = () => {
  const { showToast, logActivity } = useApp();
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    let list = [...orders];
    if (search) list = list.filter(o =>
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.orderId?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== 'All') list = list.filter(o => o.status === statusFilter);
    setFiltered(list);
  }, [orders, search, statusFilter]);

  const loadOrders = async () => {
    const data = await getAllRecords(STORES.orders);
    setOrders(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  const f = (field) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const updated = { ...form, [field]: v };
    if (field === 'quantity' || field === 'pricePerPiece') {
      const qty = field === 'quantity' ? Number(v) : Number(form.quantity);
      const price = field === 'pricePerPiece' ? Number(v) : Number(form.pricePerPiece);
      updated.totalAmount = qty * price;
      updated.dueAmount = (qty * price) - Number(form.advancePaid || 0);
    }
    if (field === 'advancePaid') {
      updated.dueAmount = Number(form.totalAmount || 0) - Number(v);
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.quantity) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      if (editing) {
        await updateRecord(STORES.orders, { ...editing, ...form });
        showToast('Order updated successfully', 'success');
      } else {
        const orderId = generateOrderId(orders);
        await addRecord(STORES.orders, { ...form, orderId, quantity: Number(form.quantity), pricePerPiece: Number(form.pricePerPiece), totalAmount: Number(form.totalAmount), advancePaid: Number(form.advancePaid), dueAmount: Number(form.dueAmount) });
        await logActivity('order', `New order ${orderId} from ${form.customerName} for ${form.quantity}x ${form.productType}`);
        showToast('Order created!', 'success');
      }
      await loadOrders();
      setShowForm(false);
      setForm(defaultForm);
      setEditing(null);
    } catch (e) {
      showToast('Error saving order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    await deleteRecord(STORES.orders, id);
    await loadOrders();
    showToast('Order deleted', 'info');
  };

  const openEdit = (order) => {
    setEditing(order);
    setForm({ ...order });
    setShowForm(true);
  };

  const openView = (order) => {
    setViewing(order);
    setShowView(true);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    inProd: orders.filter(o => o.status === 'In Production').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    totalDue: orders.reduce((s, o) => s + (o.dueAmount || 0), 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} color="blue" />
        <StatCard title="Pending" value={stats.pending} sub={`${stats.inProd} in production`} icon={ShoppingCart} color="yellow" />
        <StatCard title="Delivered" value={stats.delivered} icon={ShoppingCart} color="green" />
        <StatCard title="Total Due" value={formatBDT(stats.totalDue)} icon={ShoppingCart} color="red" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">All</option>
          {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm(defaultForm); }} size="md">
          <Plus size={16} />
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders found" subtitle="Create your first order" />
        ) : filtered.map(order => (
          <Card key={order.id} className="cursor-pointer active:scale-[0.99] transition-transform">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0" onClick={() => openView(order)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-400">{order.orderId}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="font-semibold text-white mt-1">{order.customerName}</p>
                <p className="text-sm text-gray-400">{order.quantity} × {order.productType}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-sm text-green-400 font-medium">{formatBDT(order.totalAmount)}</span>
                  {order.dueAmount > 0 && <span className="text-xs text-red-400">Due: {formatBDT(order.dueAmount)}</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1">Delivery: {formatDate(order.deliveryDate)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => openEdit(order)} className="p-2 rounded-lg bg-gray-700/50 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(order.id)} className="p-2 rounded-lg bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Form */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Order' : 'New Order'} size="lg">
        <div className="space-y-3">
          <FormInput label="Customer Name *" value={form.customerName} onChange={f('customerName')} placeholder="Customer name" required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Phone" value={form.phone} onChange={f('phone')} placeholder="017XXXXXXXX" />
            <FormSelect label="Product Type *" value={form.productType} onChange={f('productType')} options={PRODUCT_TYPES} />
          </div>
          <FormInput label="Address" value={form.address} onChange={f('address')} placeholder="Delivery address" />
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <input type="checkbox" id="capInc" checked={form.capIncluded} onChange={f('capIncluded')} className="w-4 h-4 rounded accent-blue-500" />
            <label htmlFor="capInc" className="text-sm text-gray-300">Cap Included</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Quantity *" type="number" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
            <FormInput label="Price/Piece (BDT)" type="number" value={form.pricePerPiece} onChange={f('pricePerPiece')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Total Amount" type="number" value={form.totalAmount} onChange={f('totalAmount')} placeholder="Auto" />
            <FormInput label="Advance Paid" type="number" value={form.advancePaid} onChange={f('advancePaid')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Due Amount" type="number" value={form.dueAmount} onChange={f('dueAmount')} placeholder="Auto" />
            <FormInput label="Delivery Date" type="date" value={form.deliveryDate} onChange={f('deliveryDate')} />
          </div>
          <FormSelect label="Status" value={form.status} onChange={f('status')} options={ORDER_STATUSES} />
          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Additional notes..." />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : editing ? 'Update Order' : 'Create Order'}
          </Button>
        </div>
      </Modal>

      {/* View Order */}
      <Modal isOpen={showView && !!viewing} onClose={() => setShowView(false)} title="Order Details" size="md">
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-400">{viewing.orderId}</span>
              <StatusBadge status={viewing.status} />
            </div>
            <InfoRow label="Customer" value={viewing.customerName} />
            <InfoRow label="Phone" value={viewing.phone || '-'} />
            <InfoRow label="Address" value={viewing.address || '-'} />
            <InfoRow label="Product" value={viewing.productType} />
            <InfoRow label="Cap Included" value={viewing.capIncluded ? 'Yes' : 'No'} />
            <InfoRow label="Quantity" value={`${viewing.quantity} pcs`} />
            <InfoRow label="Price/Piece" value={formatBDT(viewing.pricePerPiece)} />
            <InfoRow label="Total Amount" value={formatBDT(viewing.totalAmount)} valueClass="text-green-400 font-bold" />
            <InfoRow label="Advance Paid" value={formatBDT(viewing.advancePaid)} valueClass="text-blue-400" />
            <InfoRow label="Due Amount" value={formatBDT(viewing.dueAmount)} valueClass={viewing.dueAmount > 0 ? 'text-red-400 font-bold' : 'text-green-400'} />
            <InfoRow label="Delivery Date" value={formatDate(viewing.deliveryDate)} />
            {viewing.notes && <InfoRow label="Notes" value={viewing.notes} />}
            <Button onClick={() => { setShowView(false); openEdit(viewing); }} fullWidth variant="outline">
              <Edit2 size={15} /> Edit Order
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
