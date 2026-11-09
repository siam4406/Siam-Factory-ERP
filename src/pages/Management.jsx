import React, { useState, useEffect } from 'react';
import { Plus, Wrench, BarChart3, Download, Upload, Settings as SettingsIcon, Save, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllRecords, addRecord, updateRecord, deleteRecord, setSetting, getSetting, STORES } from '../database/db.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState, StatusBadge, InfoRow } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr, exportJSON } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

// ===== MACHINES & DIES =====
const MACHINE_STATUSES = ['Running', 'Maintenance', 'Stopped'];
const DIE_STATUSES = ['Active', 'Maintenance', 'Retired'];

export const Machines = () => {
  const { showToast } = useApp();
  const [machines, setMachines] = useState([]);
  const [dies, setDies] = useState([]);
  const [tab, setTab] = useState('machines');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    const [m, d] = await Promise.all([getAllRecords(STORES.machines), getAllRecords(STORES.dies)]);
    setMachines(m);
    setDies(d);
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openMachineForm = (item = null) => {
    setEditItem(item);
    setForm(item ? { ...item } : { name: '', type: 'Blow Molding', status: 'Running', runningHours: 0, lastMaintenance: todayStr(), nextMaintenance: '', notes: '' });
    setShowForm('machine');
  };

  const openDieForm = (item = null) => {
    setEditItem(item);
    setForm(item ? { ...item } : { name: '', type: '5 Liter', status: 'Active', lastMaintenance: todayStr(), notes: '' });
    setShowForm('die');
  };

  const handleSaveMachine = async () => {
    if (!form.name) return showToast('Enter machine name', 'error');
    if (editItem) await updateRecord(STORES.machines, { ...editItem, ...form });
    else await addRecord(STORES.machines, form);
    showToast('Saved!', 'success');
    await loadData();
    setShowForm(false);
  };

  const handleSaveDie = async () => {
    if (!form.name) return showToast('Enter die name', 'error');
    if (editItem) await updateRecord(STORES.dies, { ...editItem, ...form });
    else await addRecord(STORES.dies, form);
    showToast('Saved!', 'success');
    await loadData();
    setShowForm(false);
  };

  const statusColors = { Running: 'text-green-400', Maintenance: 'text-yellow-400', Stopped: 'text-red-400', Active: 'text-green-400', Retired: 'text-gray-400' };

  return (
    <div className="space-y-4">
      <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
        {['machines', 'dies'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'machines' ? (
        <>
          <div className="flex justify-between items-center">
            <p className="font-bold text-white">Machines</p>
            <Button onClick={() => openMachineForm()} size="sm"><Plus size={15} /> Add</Button>
          </div>
          <div className="space-y-2">
            {machines.length === 0 ? <EmptyState icon={Wrench} title="No machines" /> :
              machines.map(m => (
                <Card key={m.id} className="cursor-pointer" onClick={() => openMachineForm(m)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.type}</p>
                      <p className="text-xs text-gray-500 mt-1">Running Hours: {m.runningHours?.toLocaleString() || 0} hrs</p>
                      <p className="text-xs text-gray-500">Last Maintenance: {formatDate(m.lastMaintenance)}</p>
                      {m.notes && <p className="text-xs text-gray-600 mt-1">{m.notes}</p>}
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                </Card>
              ))
            }
          </div>
          <Modal isOpen={showForm === 'machine'} onClose={() => setShowForm(false)} title={editItem ? 'Edit Machine' : 'Add Machine'}>
            <div className="space-y-3">
              <FormInput label="Machine Name *" value={form.name || ''} onChange={f('name')} placeholder="Machine name" required />
              <FormSelect label="Type" value={form.type || ''} onChange={f('type')} options={['Blow Molding', 'Injection Molding', 'Hand Press']} />
              <FormSelect label="Status" value={form.status || 'Running'} onChange={f('status')} options={MACHINE_STATUSES} />
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Running Hours" type="number" value={form.runningHours || ''} onChange={f('runningHours')} placeholder="0" />
                <FormInput label="Last Maintenance" type="date" value={form.lastMaintenance || ''} onChange={f('lastMaintenance')} />
              </div>
              <FormInput label="Next Maintenance" type="date" value={form.nextMaintenance || ''} onChange={f('nextMaintenance')} />
              <FormTextarea label="Notes" value={form.notes || ''} onChange={f('notes')} placeholder="Notes..." rows={2} />
              <Button onClick={handleSaveMachine} fullWidth variant="primary">Save Machine</Button>
            </div>
          </Modal>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="font-bold text-white">Dies</p>
            <Button onClick={() => openDieForm()} size="sm"><Plus size={15} /> Add</Button>
          </div>
          <div className="space-y-2">
            {dies.length === 0 ? <EmptyState icon={Wrench} title="No dies" /> :
              dies.map(d => (
                <Card key={d.id} className="cursor-pointer" onClick={() => openDieForm(d)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.type}</p>
                      <p className="text-xs text-gray-500 mt-1">Last Maintenance: {formatDate(d.lastMaintenance)}</p>
                      {d.notes && <p className="text-xs text-gray-600 mt-1">{d.notes}</p>}
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                </Card>
              ))
            }
          </div>
          <Modal isOpen={showForm === 'die'} onClose={() => setShowForm(false)} title={editItem ? 'Edit Die' : 'Add Die'}>
            <div className="space-y-3">
              <FormInput label="Die Name *" value={form.name || ''} onChange={f('name')} placeholder="Die name" required />
              <FormSelect label="Type" value={form.type || ''} onChange={f('type')} options={['5 Liter', '10 Liter', 'Cap']} />
              <FormSelect label="Status" value={form.status || 'Active'} onChange={f('status')} options={DIE_STATUSES} />
              <FormInput label="Last Maintenance" type="date" value={form.lastMaintenance || ''} onChange={f('lastMaintenance')} />
              <FormTextarea label="Notes" value={form.notes || ''} onChange={f('notes')} placeholder="Notes..." rows={2} />
              <Button onClick={handleSaveDie} fullWidth variant="primary">Save Die</Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

// ===== REPORTS =====
export const Reports = () => {
  const [data, setData] = useState({});
  const [tab, setTab] = useState('summary');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [orders, production, sales, expenses, capProd] = await Promise.all([
      getAllRecords(STORES.orders),
      getAllRecords(STORES.production),
      getAllRecords(STORES.sales),
      getAllRecords(STORES.expenses),
      getAllRecords(STORES.cap_production),
    ]);

    const today = todayStr();
    const month = today.slice(0, 7);

    // Monthly production trend
    const monthlyProd = {};
    production.forEach(p => {
      const m = p.date?.slice(0, 7);
      if (m) monthlyProd[m] = (monthlyProd[m] || 0) + (p.bottlesProduced || 0);
    });

    // Monthly sales
    const monthlySales = {};
    sales.forEach(s => {
      const m = s.date?.slice(0, 7);
      if (m) monthlySales[m] = (monthlySales[m] || 0) + (s.total || 0);
    });

    // Monthly expenses
    const monthlyExp = {};
    expenses.forEach(e => {
      const m = e.date?.slice(0, 7);
      if (m) monthlyExp[m] = (monthlyExp[m] || 0) + (e.amount || 0);
    });

    // Expense by category
    const expByCat = {};
    expenses.forEach(e => expByCat[e.category] = (expByCat[e.category] || 0) + e.amount);

    // Combine months for chart
    const allMonths = [...new Set([...Object.keys(monthlyProd), ...Object.keys(monthlySales)])].sort().slice(-6);
    const trend = allMonths.map(m => ({
      month: m.slice(5),
      production: monthlyProd[m] || 0,
      sales: monthlySales[m] || 0,
      expenses: monthlyExp[m] || 0,
    }));

    const totalSales = sales.reduce((s, i) => s + (i.total || 0), 0);
    const totalExp = expenses.reduce((s, i) => s + (i.amount || 0), 0);
    const totalBottles = production.reduce((s, p) => s + (p.bottlesProduced || 0), 0);
    const totalCaps = capProd.reduce((s, c) => s + (c.totalCapsProduced || 0), 0);
    const totalRejects = production.reduce((s, p) => s + (p.rejectQuantity || 0), 0);

    setData({
      trend,
      expByCat: Object.entries(expByCat).map(([name, value]) => ({ name, value })),
      totalSales, totalExp, netProfit: totalSales - totalExp,
      totalBottles, totalCaps, totalRejects,
      ordersDelivered: orders.filter(o => o.status === 'Delivered').length,
      ordersPending: orders.filter(o => ['Pending', 'In Production'].includes(o.status)).length,
    });
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Net Profit" value={formatBDT(data.netProfit)} icon={BarChart3} color={data.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard title="Total Sales" value={formatBDT(data.totalSales)} icon={BarChart3} color="blue" />
        <StatCard title="Total Production" value={`${data.totalBottles?.toLocaleString()} pcs`} icon={BarChart3} color="cyan" />
        <StatCard title="Total Caps" value={`${data.totalCaps?.toLocaleString()} pcs`} icon={BarChart3} color="purple" />
      </div>

      <Card>
        <p className="text-sm font-bold text-white mb-3">Monthly Trend (Sales vs Expenses)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data.trend || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2} dot={false} name="Sales (BDT)" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses (BDT)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p className="text-sm font-bold text-white mb-3">Monthly Production</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data.trend || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="production" fill="#3b82f6" radius={[4,4,0,0]} name="Bottles" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <p className="text-sm font-bold text-white mb-3">Expense by Category</p>
        <div className="space-y-2">
          {(data.expByCat || []).map((item, i) => {
            const maxVal = Math.max(...(data.expByCat || []).map(e => e.value));
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{item.name}</span>
                  <span className="text-white font-medium">{formatBDT(item.value)}</span>
                </div>
                <div className="bg-gray-700/50 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(item.value / maxVal) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-bold text-white mb-3">Order Summary</p>
        <InfoRow label="Delivered Orders" value={data.ordersDelivered} valueClass="text-green-400 font-bold" />
        <InfoRow label="Pending Orders" value={data.ordersPending} valueClass="text-yellow-400 font-bold" />
        <InfoRow label="Total Rejects" value={`${data.totalRejects} pcs`} valueClass="text-red-400 font-bold" />
      </Card>
    </div>
  );
};

// ===== BACKUP =====
export const Backup = () => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const allData = {};
      for (const store of Object.values(STORES)) {
        allData[store] = await getAllRecords(store);
      }
      const filename = `siam_backup_${todayStr()}.json`;
      exportJSON({ ...allData, exportedAt: new Date().toISOString(), version: '1.0' }, filename);
      showToast('Backup exported successfully!', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        showToast('Backup file read. Import feature coming soon!', 'info');
      } catch {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="font-bold text-white mb-1">Data Backup</p>
        <p className="text-sm text-gray-400 mb-4">Export all factory data as a JSON file. Keep this safe to restore your data.</p>
        <Button onClick={handleExport} fullWidth disabled={loading} variant="primary">
          <Download size={16} /> {loading ? 'Exporting...' : 'Export Backup (JSON)'}
        </Button>
      </Card>
      <Card>
        <p className="font-bold text-white mb-1">Restore Data</p>
        <p className="text-sm text-gray-400 mb-4">Import a previously exported backup file to restore your data.</p>
        <label className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 rounded-lg py-2.5 text-sm font-medium cursor-pointer transition-colors">
          <Upload size={16} /> Import Backup File
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </Card>
      <Card>
        <p className="font-bold text-white mb-3">Backup Tips</p>
        <div className="space-y-2 text-sm text-gray-400">
          <p>• Export backup regularly (daily or weekly)</p>
          <p>• Store backup files in Google Drive or email</p>
          <p>• Backup before clearing data or reinstalling</p>
          <p>• Filename includes today's date for tracking</p>
        </div>
      </Card>
    </div>
  );
};

// ===== SETTINGS =====
export const AppSettings = () => {
  const { factoryName, setFactoryName, darkMode, toggleDarkMode, showToast } = useApp();
  const [localName, setLocalName] = useState(factoryName);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);

  const handleSaveName = async () => {
    await setSetting('factoryName', localName);
    setFactoryName(localName);
    showToast('Factory name updated!', 'success');
  };

  const handleChangePin = async () => {
    const storedPin = await getSetting('pin');
    if (currentPin !== storedPin) return showToast('Current PIN is incorrect', 'error');
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return showToast('PIN must be 4 digits', 'error');
    if (newPin !== confirmPin) return showToast('New PINs do not match', 'error');
    await setSetting('pin', newPin);
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    showToast('PIN changed successfully!', 'success');
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="font-bold text-white mb-3">Factory Settings</p>
        <div className="space-y-3">
          <FormInput label="Factory Name" value={localName} onChange={e => setLocalName(e.target.value)} placeholder="Factory name" />
          <Button onClick={handleSaveName} fullWidth variant="primary"><Save size={15} /> Save Name</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">Dark Mode</p>
            <p className="text-xs text-gray-400">Industrial dark theme</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      <Card>
        <p className="font-bold text-white mb-1">Currency</p>
        <p className="text-gray-400 text-sm">BDT (Bangladeshi Taka ৳) — Fixed</p>
      </Card>

      <Card>
        <p className="font-bold text-white mb-3">Change PIN</p>
        <div className="space-y-3">
          <div className="relative">
            <FormInput label="Current PIN" type={showPins ? 'text' : 'password'} value={currentPin} onChange={e => setCurrentPin(e.target.value)} placeholder="Current 4-digit PIN" />
          </div>
          <FormInput label="New PIN" type={showPins ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New 4-digit PIN" />
          <FormInput label="Confirm New PIN" type={showPins ? 'text' : 'password'} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Confirm new PIN" />
          <div className="flex gap-2">
            <Button onClick={() => setShowPins(!showPins)} variant="ghost" size="sm">
              {showPins ? <EyeOff size={15} /> : <Eye size={15} />} {showPins ? 'Hide' : 'Show'}
            </Button>
            <Button onClick={handleChangePin} variant="primary" size="sm" className="flex-1">Change PIN</Button>
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-bold text-white mb-2">App Info</p>
        <InfoRow label="App Name" value="Siam Plastic Factory Manager" />
        <InfoRow label="Version" value="1.0.0" />
        <InfoRow label="Build" value="2025 Production" />
        <InfoRow label="Database" value="IndexedDB (Offline)" />
      </Card>
    </div>
  );
};
