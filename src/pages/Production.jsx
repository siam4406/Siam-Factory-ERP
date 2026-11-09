import React, { useState, useEffect } from 'react';
import { Plus, Factory, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllRecords, addRecord, deleteRecord, STORES } from '../database/db.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const MACHINES = ['Blow Mold Machine #1', 'Blow Mold Machine #2'];
const SHIFTS = ['Morning', 'Evening', 'Night'];
const PRODUCT_TYPES = ['5L Bottle', '10L Bottle'];
const RATE_PER_KG = { 'Virgin HDPE': 130, 'Recycle HDPE': 75, 'PET': 150 };

const defaultForm = {
  date: todayStr(), shift: 'Morning', machineName: 'Blow Mold Machine #1',
  operatorName: '', productType: '5L Bottle',
  materialUsedKg: '', materialType: 'Virgin HDPE',
  bottlesProduced: '', rejectQuantity: '', electricityHours: '8', notes: ''
};

export const Production = () => {
  const { showToast, logActivity } = useApp();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getAllRecords(STORES.production);
    const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(sorted);

    // Chart: last 7 days
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayEntries = sorted.filter(e => e.date === ds);
      const total = dayEntries.reduce((s, e) => s + (e.bottlesProduced || 0), 0);
      const rejects = dayEntries.reduce((s, e) => s + (e.rejectQuantity || 0), 0);
      last7.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), produced: total, rejects });
    }
    setChartData(last7);
  };

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const calcMetrics = () => {
    const matCost = Number(form.materialUsedKg) * (RATE_PER_KG[form.materialType] || 100);
    const bottles = Number(form.bottlesProduced) || 1;
    const rejects = Number(form.rejectQuantity) || 0;
    const rejectPct = ((rejects / bottles) * 100).toFixed(1);
    const efficiency = (((bottles - rejects) / bottles) * 100).toFixed(1);
    const costPerBottle = (matCost / bottles).toFixed(2);
    return { matCost, rejectPct, efficiency, costPerBottle };
  };

  const metrics = form.bottlesProduced && form.materialUsedKg ? calcMetrics() : null;

  const handleSubmit = async () => {
    if (!form.operatorName || !form.bottlesProduced) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      await addRecord(STORES.production, {
        ...form,
        materialUsedKg: Number(form.materialUsedKg),
        bottlesProduced: Number(form.bottlesProduced),
        rejectQuantity: Number(form.rejectQuantity),
        electricityHours: Number(form.electricityHours),
      });
      await logActivity('production', `Production: ${form.bottlesProduced}x ${form.productType} by ${form.operatorName} (${form.shift} shift)`);
      showToast('Production entry added!', 'success');
      await loadData();
      setShowForm(false);
      setForm(defaultForm);
    } catch (e) {
      showToast('Error saving', 'error');
    } finally {
      setLoading(false);
    }
  };

  const today = todayStr();
  const todayEntries = entries.filter(e => e.date === today);
  const todayBottles = todayEntries.reduce((s, e) => s + (e.bottlesProduced || 0), 0);
  const todayRejects = todayEntries.reduce((s, e) => s + (e.rejectQuantity || 0), 0);
  const monthEntries = entries.filter(e => e.date?.startsWith(today.slice(0, 7)));
  const monthBottles = monthEntries.reduce((s, e) => s + (e.bottlesProduced || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Today's Output" value={`${todayBottles} pcs`} sub={`${todayRejects} rejects`} icon={Factory} color="blue" />
        <StatCard title="This Month" value={`${monthBottles} pcs`} icon={TrendingUp} color="green" />
      </div>

      <Card>
        <p className="text-sm font-bold text-white mb-3">Production Trend (7 Days)</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Bar dataKey="produced" fill="#3b82f6" radius={[4,4,0,0]} name="Produced" stackId="a" />
            <Bar dataKey="rejects" fill="#ef4444" radius={[4,4,0,0]} name="Rejects" stackId="b" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="flex justify-between items-center">
        <p className="font-bold text-white">Production Entries</p>
        <Button onClick={() => { setShowForm(true); setForm(defaultForm); }} size="sm">
          <Plus size={15} /> Add Entry
        </Button>
      </div>

      <div className="space-y-2">
        {entries.length === 0 ? <EmptyState icon={Factory} title="No production entries" subtitle="Add your first production record" /> :
          entries.map(entry => {
            const m = entry.bottlesProduced ? {
              rejectPct: ((entry.rejectQuantity / entry.bottlesProduced) * 100).toFixed(1),
              efficiency: (((entry.bottlesProduced - entry.rejectQuantity) / entry.bottlesProduced) * 100).toFixed(1),
            } : { rejectPct: 0, efficiency: 100 };
            return (
              <Card key={entry.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{entry.productType}</span>
                      <span className="text-xs text-gray-500">{entry.shift} Shift</span>
                    </div>
                    <p className="font-bold text-white text-lg mt-1">{entry.bottlesProduced} <span className="text-sm font-normal text-gray-400">bottles</span></p>
                    <p className="text-xs text-gray-400">{formatDate(entry.date)} · {entry.operatorName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{entry.machineName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{m.efficiency}% eff</p>
                    <p className="text-xs text-red-400">{entry.rejectQuantity || 0} rejects</p>
                    <p className="text-xs text-gray-500 mt-1">{entry.materialUsedKg} KG used</p>
                  </div>
                </div>
              </Card>
            );
          })
        }
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Production Entry" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Date" type="date" value={form.date} onChange={f('date')} />
            <FormSelect label="Shift" value={form.shift} onChange={f('shift')} options={SHIFTS} />
          </div>
          <FormSelect label="Machine" value={form.machineName} onChange={f('machineName')} options={MACHINES} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Operator Name *" value={form.operatorName} onChange={f('operatorName')} placeholder="Worker name" required />
            <FormSelect label="Product Type" value={form.productType} onChange={f('productType')} options={PRODUCT_TYPES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Material Used (KG)" type="number" value={form.materialUsedKg} onChange={f('materialUsedKg')} placeholder="0" />
            <FormSelect label="Material Type" value={form.materialType} onChange={f('materialType')} options={['Virgin HDPE', 'Recycle HDPE', 'PET']} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Bottles Produced *" type="number" value={form.bottlesProduced} onChange={f('bottlesProduced')} placeholder="0" required />
            <FormInput label="Reject Quantity" type="number" value={form.rejectQuantity} onChange={f('rejectQuantity')} placeholder="0" />
          </div>
          <FormInput label="Electricity Hours" type="number" value={form.electricityHours} onChange={f('electricityHours')} placeholder="8" />

          {metrics && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-blue-400 mb-2">Auto Calculations</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="text-xs text-gray-400">Material Cost: <span className="text-white font-medium">{formatBDT(metrics.matCost)}</span></div>
                <div className="text-xs text-gray-400">Cost/Bottle: <span className="text-white font-medium">{formatBDT(metrics.costPerBottle)}</span></div>
                <div className="text-xs text-gray-400">Efficiency: <span className="text-green-400 font-medium">{metrics.efficiency}%</span></div>
                <div className="text-xs text-gray-400">Reject Rate: <span className="text-red-400 font-medium">{metrics.rejectPct}%</span></div>
              </div>
            </div>
          )}

          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Additional notes..." />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : 'Save Production Entry'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
