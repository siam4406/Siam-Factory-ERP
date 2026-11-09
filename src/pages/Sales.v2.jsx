/**
 * pages/Sales.v2.jsx
 * Drop-in Sales replacement — adds invoice printing, customer autocomplete,
 * and payment status management on top of the existing Operations.jsx Sales.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, TrendingUp, DollarSign, Printer, Eye, Filter, CheckCircle, Clock } from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, STORES } from '../database/db.js';
import {
  Modal, Button, FormInput, FormSelect, FormTextarea,
  StatCard, Card, EmptyState, InfoRow, StatusBadge
} from '../components/UI.jsx';
import { formatBDT, formatDate, generateInvoiceNumber, todayStr } from '../utils/helpers.js';
import { printSalesInvoice } from '../services/invoiceService.js';
import { useApp } from '../context/AppContext.jsx';

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Cheque'];
const PRODUCTS = ['5L Bottle', '10L Bottle', 'Caps', '5L Bottle + Cap', '10L Bottle + Cap'];

const DEFAULT_FORM = {
  customerName: '', phone: '',
  product: '5L Bottle',
  quantity: '', rate: '',
  total: '', paid: '', due: '',
  paymentMethod: 'Cash',
  date: todayStr(), notes: '',
};

export const SalesV2 = () => {
  const { showToast, logActivity, factoryName } = useApp();
  const [sales,      setSales]      = useState([]);
  const [customers,  setCustomers]  = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [showView,   setShowView]   = useState(false);
  const [viewing,    setViewing]    = useState(null);
  const [form,       setForm]       = useState(DEFAULT_FORM);
  const [loading,    setLoading]    = useState(false);
  const [filter,     setFilter]     = useState('all'); // all | paid | due
  const [custSuggest, setCustSuggest] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [s, c] = await Promise.all([
      getAllRecords(STORES.sales),
      getAllRecords(STORES.customers),
    ]);
    setSales(s.sort((a, b) => b.date?.localeCompare(a.date)));
    setCustomers(c);
  };

  const f = (field) => (e) => {
    const v = e.target.value;
    const updated = { ...form, [field]: v };
    if (field === 'quantity' || field === 'rate') {
      const qty  = field === 'quantity' ? Number(v) : Number(form.quantity);
      const rate = field === 'rate'     ? Number(v) : Number(form.rate);
      updated.total = qty * rate;
      updated.due   = (qty * rate) - Number(form.paid || 0);
    }
    if (field === 'paid') updated.due = Number(form.total || 0) - Number(v);
    if (field === 'customerName') {
      const matches = customers.filter(c =>
        c.name.toLowerCase().includes(v.toLowerCase())
      ).slice(0, 4);
      setCustSuggest(matches);
    }
    setForm(updated);
  };

  const selectCustomer = (c) => {
    setForm(prev => ({ ...prev, customerName: c.name, phone: c.phone || '' }));
    setCustSuggest([]);
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.quantity) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      const invoiceNumber = generateInvoiceNumber(sales);
      const record = {
        ...form,
        invoiceNumber,
        quantity: Number(form.quantity),
        rate:     Number(form.rate),
        total:    Number(form.total),
        paid:     Number(form.paid),
        due:      Number(form.due),
      };
      await addRecord(STORES.sales, record);
      await logActivity('sale', `Sale ${invoiceNumber}: ${form.quantity}× ${form.product} to ${form.customerName} — ${formatBDT(form.total)}`);

      // Deduct from finished goods inventory
      const inventory = await getAllRecords(STORES.inventory);
      const itemName  = form.product.includes('Cap') && !form.product.includes('Bottle') ? 'Caps'
        : form.product.includes('5L') ? '5L Bottle' : '10L Bottle';
      const invItem   = inventory.find(i => i.item === itemName && i.category === 'Finished Goods');
      if (invItem) {
        await updateRecord(STORES.inventory, {
          ...invItem,
          quantity:    Math.max(0, (invItem.quantity || 0) - Number(form.quantity)),
          lastUpdated: form.date,
        });
      }

      showToast(`Sale recorded — ${invoiceNumber}`, 'success');
      await loadData();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    } catch (e) {
      showToast('Error saving sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (sale) => {
    printSalesInvoice(sale, factoryName);
  };

  const filtered = useMemo(() => {
    if (filter === 'paid') return sales.filter(s => !s.due || s.due <= 0);
    if (filter === 'due')  return sales.filter(s => s.due  > 0);
    return sales;
  }, [sales, filter]);

  const totalRevenue = sales.reduce((s, i) => s + (i.total || 0), 0);
  const totalDue     = sales.reduce((s, i) => s + (i.due   || 0), 0);
  const totalPaid    = sales.reduce((s, i) => s + (i.paid  || 0), 0);
  const paidCount    = sales.filter(s => !s.due || s.due <= 0).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Revenue" value={formatBDT(totalRevenue)} icon={TrendingUp} color="green" />
        <StatCard title="Total Collected" value={formatBDT(totalPaid)} icon={CheckCircle} color="blue" />
        <StatCard title="Pending Due" value={formatBDT(totalDue)} icon={Clock} color={totalDue > 0 ? 'red' : 'blue'} />
        <StatCard title="Invoices" value={`${sales.length} (${paidCount} paid)`} icon={TrendingUp} color="purple" />
      </div>

      {/* Filter + Add */}
      <div className="flex gap-2">
        <div className="flex bg-gray-800/50 border border-gray-700/50 rounded-lg p-0.5 gap-0.5">
          {['all','paid','due'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); setCustSuggest([]); }}>
          <Plus size={15} /> New Sale
        </Button>
      </div>

      {/* Sales list */}
      <div className="space-y-2">
        {filtered.length === 0
          ? <EmptyState icon={TrendingUp} title="No sales records" subtitle="Record your first sale" />
          : filtered.map(sale => (
              <Card key={sale.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => { setViewing(sale); setShowView(true); }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-400">{sale.invoiceNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${!sale.due || sale.due <= 0 ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {!sale.due || sale.due <= 0 ? '✓ Paid' : 'Due'}
                      </span>
                      <span className="text-xs text-gray-600">{sale.paymentMethod}</span>
                    </div>
                    <p className="font-semibold text-white mt-1">{sale.customerName}</p>
                    <p className="text-sm text-gray-400">{sale.quantity} × {sale.product} @ {formatBDT(sale.rate)}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{formatDate(sale.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p className="text-base font-bold text-green-400">{formatBDT(sale.total)}</p>
                    {sale.due > 0 && <p className="text-xs text-red-400">Due: {formatBDT(sale.due)}</p>}
                    <button
                      onClick={() => handlePrint(sale)}
                      className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Print Invoice"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
        }
      </div>

      {/* View modal */}
      <Modal isOpen={showView && !!viewing} onClose={() => setShowView(false)} title="Invoice Details">
        {viewing && (
          <div className="space-y-2">
            <InfoRow label="Invoice No." value={viewing.invoiceNumber} valueClass="text-blue-400 font-bold" />
            <InfoRow label="Customer"    value={viewing.customerName} />
            <InfoRow label="Product"     value={viewing.product} />
            <InfoRow label="Quantity"    value={`${viewing.quantity} pcs`} />
            <InfoRow label="Rate"        value={formatBDT(viewing.rate)} />
            <InfoRow label="Total"       value={formatBDT(viewing.total)} valueClass="text-green-400 font-bold" />
            <InfoRow label="Paid"        value={formatBDT(viewing.paid)} valueClass="text-blue-400" />
            <InfoRow label="Due"         value={formatBDT(viewing.due)}  valueClass={viewing.due > 0 ? 'text-red-400 font-bold' : 'text-green-400'} />
            <InfoRow label="Payment"     value={viewing.paymentMethod} />
            <InfoRow label="Date"        value={formatDate(viewing.date)} />
            {viewing.notes && <InfoRow label="Notes" value={viewing.notes} />}
            <Button onClick={() => handlePrint(viewing)} fullWidth variant="outline" className="mt-3">
              <Printer size={15} /> Print Invoice
            </Button>
          </div>
        )}
      </Modal>

      {/* New Sale form */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setCustSuggest([]); }} title="Record Sale" size="lg">
        <div className="space-y-3">
          {/* Customer name with autocomplete */}
          <div className="space-y-1 relative">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer Name *</label>
            <input
              value={form.customerName}
              onChange={f('customerName')}
              placeholder="Type to search customers…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            {custSuggest.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl mt-1 overflow-hidden">
                {custSuggest.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">{c.name[0]}</div>
                    <div>
                      <p className="text-sm text-white font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormInput label="Phone" value={form.phone} onChange={f('phone')} placeholder="017XXXXXXXX" />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Product" value={form.product} onChange={f('product')} options={PRODUCTS} />
            <FormInput  label="Date"    type="date" value={form.date} onChange={f('date')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Quantity *" type="number" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
            <FormInput label="Rate (BDT)" type="number" value={form.rate}     onChange={f('rate')}     placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Total Amount" type="number" value={form.total} onChange={f('total')} placeholder="Auto" />
            <FormInput label="Amount Paid"  type="number" value={form.paid}  onChange={f('paid')}  placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput     label="Due Amount"     type="number" value={form.due} onChange={f('due')} placeholder="Auto" />
            <FormSelect    label="Payment Method" value={form.paymentMethod} onChange={f('paymentMethod')} options={PAYMENT_METHODS} />
          </div>

          {/* Live summary */}
          {form.total > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Total Amount</p>
                <p className="text-xl font-black text-green-400">{formatBDT(form.total)}</p>
              </div>
              {form.due > 0
                ? <div className="text-right"><p className="text-xs text-gray-400">Remaining Due</p><p className="text-lg font-bold text-red-400">{formatBDT(form.due)}</p></div>
                : <CheckCircle size={28} className="text-green-400" />
              }
            </div>
          )}

          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Additional notes…" rows={2} />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving…' : 'Record Sale'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
