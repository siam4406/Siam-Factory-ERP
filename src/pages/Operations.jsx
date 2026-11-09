import React, { useState, useEffect } from 'react';
import { Plus, Cpu, Trash2, Warehouse, TrendingUp, DollarSign } from 'lucide-react';
import { getAllRecords, addRecord, deleteRecord, STORES } from '../database/db.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState, InfoRow } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr, generateInvoiceNumber } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

// ===== CAP PRODUCTION =====
const CAP_MACHINES = ['Injection Mold Hand Press'];
const CAP_COLORS = ['Blue', 'White', 'Red', 'Black', 'Yellow', 'Green', 'Clear'];

const defaultCapForm = {
  date: todayStr(), color: 'Blue', materialUsedKg: '', totalCapsProduced: '',
  rejectCaps: '', machineName: 'Injection Mold Hand Press', operatorName: '', notes: ''
};

export const CapProduction = () => {
  const { showToast, logActivity } = useApp();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultCapForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const data = await getAllRecords(STORES.cap_production);
    setEntries(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const calcCapMetrics = () => {
    const caps = Number(form.totalCapsProduced) || 1;
    const kg = Number(form.materialUsedKg) || 1;
    const capPerKg = (caps / kg).toFixed(0);
    const costPer1000 = ((kg * 120) / caps * 1000).toFixed(2);
    const rejects = Number(form.rejectCaps) || 0;
    const efficiency = ((( caps - rejects) / caps) * 100).toFixed(1);
    return { capPerKg, costPer1000, efficiency };
  };

  const metrics = form.totalCapsProduced && form.materialUsedKg ? calcCapMetrics() : null;

  const handleSubmit = async () => {
    if (!form.operatorName || !form.totalCapsProduced) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      await addRecord(STORES.cap_production, {
        ...form,
        materialUsedKg: Number(form.materialUsedKg),
        totalCapsProduced: Number(form.totalCapsProduced),
        rejectCaps: Number(form.rejectCaps),
      });
      await logActivity('cap_production', `Cap Production: ${form.totalCapsProduced} ${form.color} caps by ${form.operatorName}`);
      showToast('Cap production added!', 'success');
      await loadData();
      setShowForm(false);
      setForm(defaultCapForm);
    } catch (e) { showToast('Error saving', 'error'); }
    finally { setLoading(false); }
  };

  const totalCaps = entries.reduce((s, e) => s + (e.totalCapsProduced || 0), 0);
  const totalRejects = entries.reduce((s, e) => s + (e.rejectCaps || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Caps" value={totalCaps.toLocaleString()} icon={Cpu} color="blue" />
        <StatCard title="Total Rejects" value={totalRejects.toLocaleString()} icon={Cpu} color="red" />
      </div>
      <div className="flex justify-between items-center">
        <p className="font-bold text-white">Cap Production Entries</p>
        <Button onClick={() => { setShowForm(true); setForm(defaultCapForm); }} size="sm"><Plus size={15} /> Add Entry</Button>
      </div>
      <div className="space-y-2">
        {entries.length === 0 ? <EmptyState icon={Cpu} title="No cap production entries" /> :
          entries.map(e => {
            const eff = e.totalCapsProduced ? (((e.totalCapsProduced - e.rejectCaps) / e.totalCapsProduced) * 100).toFixed(1) : 100;
            return (
              <Card key={e.id}>
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ backgroundColor: e.color?.toLowerCase() === 'clear' ? '#ffffff20' : e.color?.toLowerCase() }} />
                      <span className="font-semibold text-white">{e.color} Caps</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(e.date)} · {e.operatorName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-400">{e.totalCapsProduced?.toLocaleString()}</p>
                    <p className="text-xs text-red-400">{e.rejectCaps || 0} rejects</p>
                    <p className="text-xs text-green-400">{eff}% eff</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{e.materialUsedKg} KG used · {e.machineName}</p>
              </Card>
            );
          })
        }
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Cap Production" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
            <FormSelect label="Color" value={form.color} onChange={f('color')} options={CAP_COLORS} />
          </div>
          <FormSelect label="Machine" value={form.machineName} onChange={f('machineName')} options={CAP_MACHINES} />
          <FormInput label="Operator Name *" value={form.operatorName} onChange={f('operatorName')} placeholder="Worker name" required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Material Used (KG)" type="number" value={form.materialUsedKg} onChange={f('materialUsedKg')} placeholder="0" />
            <FormInput label="Total Caps Produced *" type="number" value={form.totalCapsProduced} onChange={f('totalCapsProduced')} placeholder="0" required />
          </div>
          <FormInput label="Reject Caps" type="number" value={form.rejectCaps} onChange={f('rejectCaps')} placeholder="0" />
          {metrics && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-400 mb-2">Auto Calculations</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-gray-400">Caps/KG<br /><span className="text-white font-medium">{metrics.capPerKg}</span></div>
                <div className="text-gray-400">Cost/1000<br /><span className="text-white font-medium">{formatBDT(metrics.costPer1000)}</span></div>
                <div className="text-gray-400">Efficiency<br /><span className="text-green-400 font-medium">{metrics.efficiency}%</span></div>
              </div>
            </div>
          )}
          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Notes..." />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : 'Save Cap Production'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ===== INVENTORY =====
export const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'Finished Goods', item: '', quantity: '', unit: 'pcs' });
  const { showToast } = useApp();

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const data = await getAllRecords(STORES.inventory);
    setInventory(data);
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async () => {
    if (!form.item || !form.quantity) return showToast('Fill required fields', 'error');
    await addRecord(STORES.inventory, { ...form, quantity: Number(form.quantity), lastUpdated: todayStr() });
    showToast('Inventory updated!', 'success');
    await loadData();
    setShowForm(false);
    setForm({ category: 'Finished Goods', item: '', quantity: '', unit: 'pcs' });
  };

  const categories = ['Finished Goods', 'Raw Materials', 'Scrap / Reject'];
  const groupedInv = categories.reduce((acc, cat) => {
    acc[cat] = inventory.filter(i => i.category === cat);
    return acc;
  }, {});

  const catColors = { 'Finished Goods': 'text-green-400', 'Raw Materials': 'text-blue-400', 'Scrap / Reject': 'text-red-400' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="font-bold text-white">Inventory Management</p>
        <Button onClick={() => setShowForm(true)} size="sm"><Plus size={15} /> Add</Button>
      </div>
      {categories.map(cat => (
        <div key={cat}>
          <p className={`text-sm font-bold mb-2 ${catColors[cat]}`}>{cat}</p>
          {groupedInv[cat].length === 0 ? (
            <Card><p className="text-gray-500 text-sm text-center py-2">No items</p></Card>
          ) : (
            <div className="space-y-2">
              {groupedInv[cat].map(item => (
                <Card key={item.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{item.item}</p>
                      <p className="text-xs text-gray-500">Updated: {formatDate(item.lastUpdated)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${catColors[cat]}`}>{item.quantity?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{item.unit}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Inventory Item">
        <div className="space-y-3">
          <FormSelect label="Category" value={form.category} onChange={f('category')} options={categories} />
          <FormInput label="Item Name *" value={form.item} onChange={f('item')} placeholder="e.g. 5L Bottle" required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Quantity *" type="number" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
            <FormInput label="Unit" value={form.unit} onChange={f('unit')} placeholder="pcs" />
          </div>
          <Button onClick={handleSubmit} fullWidth variant="primary">Add Item</Button>
        </div>
      </Modal>
    </div>
  );
};

// ===== SALES =====
const PAYMENT_METHODS = ['Cash', 'Bank', 'Mobile Banking'];
const PRODUCTS = ['5L Bottle', '10L Bottle', 'Caps'];

const defaultSaleForm = {
  customerName: '', product: '5L Bottle', quantity: '', rate: '',
  total: '', paid: '', due: '', paymentMethod: 'Cash', date: todayStr()
};

export const Sales = () => {
  const { showToast, logActivity } = useApp();
  const [sales, setSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultSaleForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const data = await getAllRecords(STORES.sales);
    setSales(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const f = (field) => (e) => {
    const v = e.target.value;
    const updated = { ...form, [field]: v };
    if (field === 'quantity' || field === 'rate') {
      const qty = field === 'quantity' ? Number(v) : Number(form.quantity);
      const rate = field === 'rate' ? Number(v) : Number(form.rate);
      updated.total = qty * rate;
      updated.due = (qty * rate) - Number(form.paid || 0);
    }
    if (field === 'paid') updated.due = Number(form.total || 0) - Number(v);
    setForm(updated);
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.quantity) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      const invoiceNumber = generateInvoiceNumber(sales);
      await addRecord(STORES.sales, {
        ...form,
        invoiceNumber,
        quantity: Number(form.quantity),
        rate: Number(form.rate),
        total: Number(form.total),
        paid: Number(form.paid),
        due: Number(form.due),
      });
      await logActivity('sale', `Sale ${invoiceNumber}: ${form.quantity}x ${form.product} to ${form.customerName}`);
      showToast('Sale recorded!', 'success');
      await loadData();
      setShowForm(false);
      setForm(defaultSaleForm);
    } catch (e) { showToast('Error saving', 'error'); }
    finally { setLoading(false); }
  };

  const totalSales = sales.reduce((s, i) => s + (i.total || 0), 0);
  const totalDue = sales.reduce((s, i) => s + (i.due || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Sales" value={formatBDT(totalSales)} icon={TrendingUp} color="green" />
        <StatCard title="Total Due" value={formatBDT(totalDue)} icon={TrendingUp} color="red" />
      </div>
      <div className="flex justify-between items-center">
        <p className="font-bold text-white">Sales Records</p>
        <Button onClick={() => { setShowForm(true); setForm(defaultSaleForm); }} size="sm"><Plus size={15} /> New Sale</Button>
      </div>
      <div className="space-y-2">
        {sales.length === 0 ? <EmptyState icon={TrendingUp} title="No sales records" subtitle="Record your first sale" /> :
          sales.map(sale => (
            <Card key={sale.id}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{sale.invoiceNumber}</span>
                    <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">{sale.paymentMethod}</span>
                  </div>
                  <p className="font-semibold text-white mt-1">{sale.customerName}</p>
                  <p className="text-sm text-gray-400">{sale.quantity} × {sale.product} @ {formatBDT(sale.rate)}</p>
                  <p className="text-xs text-gray-600">{formatDate(sale.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">{formatBDT(sale.total)}</p>
                  {sale.due > 0 && <p className="text-xs text-red-400">Due: {formatBDT(sale.due)}</p>}
                  {sale.due === 0 && <p className="text-xs text-green-400">✓ Paid</p>}
                </div>
              </div>
            </Card>
          ))
        }
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Record Sale" size="lg">
        <div className="space-y-3">
          <FormInput label="Customer Name *" value={form.customerName} onChange={f('customerName')} placeholder="Customer name" required />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Product" value={form.product} onChange={f('product')} options={PRODUCTS} />
            <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Quantity *" type="number" value={form.quantity} onChange={f('quantity')} placeholder="0" required />
            <FormInput label="Rate (BDT)" type="number" value={form.rate} onChange={f('rate')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Total" type="number" value={form.total} onChange={f('total')} placeholder="Auto" />
            <FormInput label="Paid" type="number" value={form.paid} onChange={f('paid')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Due" type="number" value={form.due} onChange={f('due')} placeholder="Auto" />
            <FormSelect label="Payment Method" value={form.paymentMethod} onChange={f('paymentMethod')} options={PAYMENT_METHODS} />
          </div>
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : 'Record Sale'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// ===== EXPENSES =====
const EXPENSE_CATEGORIES = ['Electricity', 'Labor', 'Machine Repair', 'Transport', 'Oil / Mobil', 'Rent', 'Miscellaneous'];

const defaultExpForm = { category: 'Electricity', amount: '', date: todayStr(), notes: '' };

export const Expenses = () => {
  const { showToast, logActivity } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultExpForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const data = await getAllRecords(STORES.expenses);
    setExpenses(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async () => {
    if (!form.amount) return showToast('Enter amount', 'error');
    setLoading(true);
    try {
      await addRecord(STORES.expenses, { ...form, amount: Number(form.amount) });
      await logActivity('expense', `Expense: ${form.category} - ${formatBDT(form.amount)}`);
      showToast('Expense recorded!', 'success');
      await loadData();
      setShowForm(false);
      setForm(defaultExpForm);
    } catch (e) { showToast('Error saving', 'error'); }
    finally { setLoading(false); }
  };

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const today = todayStr();
  const todayExpenses = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(today.slice(0, 7))).reduce((s, e) => s + (e.amount || 0), 0);

  const catIcons = { Electricity: '⚡', Labor: '👷', 'Machine Repair': '🔧', Transport: '🚛', 'Oil / Mobil': '🛢️', Rent: '🏭', Miscellaneous: '📌' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Expenses" value={formatBDT(totalExpenses)} icon={DollarSign} color="red" />
        <StatCard title="This Month" value={formatBDT(monthExpenses)} sub={`Today: ${formatBDT(todayExpenses)}`} icon={DollarSign} color="orange" />
      </div>
      <div className="flex justify-between items-center">
        <p className="font-bold text-white">Expense Records</p>
        <Button onClick={() => { setShowForm(true); setForm(defaultExpForm); }} size="sm"><Plus size={15} /> Add Expense</Button>
      </div>
      <div className="space-y-2">
        {expenses.length === 0 ? <EmptyState icon={DollarSign} title="No expense records" /> :
          expenses.map(exp => (
            <Card key={exp.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xl">
                    {catIcons[exp.category] || '📌'}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{exp.category}</p>
                    <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                    {exp.notes && <p className="text-xs text-gray-500 mt-0.5">{exp.notes}</p>}
                  </div>
                </div>
                <p className="text-lg font-bold text-red-400">{formatBDT(exp.amount)}</p>
              </div>
            </Card>
          ))
        }
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Expense" size="md">
        <div className="space-y-3">
          <FormSelect label="Category *" value={form.category} onChange={f('category')} options={EXPENSE_CATEGORIES} />
          <FormInput label="Amount (BDT) *" type="number" value={form.amount} onChange={f('amount')} placeholder="0" required />
          <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Details..." />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : 'Record Expense'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
