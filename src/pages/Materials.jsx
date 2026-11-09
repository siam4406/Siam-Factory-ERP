import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, AlertTriangle, Package } from 'lucide-react';
import { getAllRecords, addRecord, deleteRecord, updateRecord, STORES } from '../database/db.js';
import { Modal, Button, FormInput, FormSelect, FormTextarea, StatCard, Card, EmptyState, SectionHeader } from '../components/UI.jsx';
import { formatBDT, formatDate, todayStr } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

const MAT_TYPES = ['Virgin HDPE', 'Recycle HDPE', 'PET', 'Color Masterbatch', 'Cap Material'];

const defaultForm = {
  name: '', type: 'Virgin HDPE', supplier: '',
  quantityKg: '', ratePerKg: '', totalCost: '',
  purchaseDate: todayStr(), notes: ''
};

export const Materials = () => {
  const { showToast, logActivity } = useApp();
  const [materials, setMaterials] = useState([]);
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('stock');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [mats, stk] = await Promise.all([
      getAllRecords(STORES.materials),
      getAllRecords(STORES.material_stock),
    ]);
    setMaterials(mats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setStock(stk);
  };

  const f = (field) => (e) => {
    const v = e.target.value;
    const updated = { ...form, [field]: v };
    if (field === 'quantityKg' || field === 'ratePerKg') {
      const qty = field === 'quantityKg' ? Number(v) : Number(form.quantityKg);
      const rate = field === 'ratePerKg' ? Number(v) : Number(form.ratePerKg);
      updated.totalCost = qty * rate;
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.quantityKg) return showToast('Fill required fields', 'error');
    setLoading(true);
    try {
      await addRecord(STORES.materials, {
        ...form,
        quantityKg: Number(form.quantityKg),
        ratePerKg: Number(form.ratePerKg),
        totalCost: Number(form.totalCost)
      });

      // Update stock
      const existing = stock.find(s => s.materialType === form.type);
      if (existing) {
        await updateRecord(STORES.material_stock, {
          ...existing,
          availableKg: (existing.availableKg || 0) + Number(form.quantityKg),
          balanceKg: (existing.balanceKg || 0) + Number(form.quantityKg),
        });
      } else {
        await addRecord(STORES.material_stock, {
          materialType: form.type,
          availableKg: Number(form.quantityKg),
          usedKg: 0,
          balanceKg: Number(form.quantityKg),
          avgCostPerKg: Number(form.ratePerKg),
        });
      }

      await logActivity('material', `Added ${form.quantityKg} KG ${form.type} from ${form.supplier}`);
      showToast('Material added!', 'success');
      await loadData();
      setShowForm(false);
      setForm(defaultForm);
    } catch (e) {
      showToast('Error saving', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await deleteRecord(STORES.materials, id);
    await loadData();
    showToast('Deleted', 'info');
  };

  const filteredMats = materials.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = stock.reduce((s, m) => s + (m.balanceKg * m.avgCostPerKg || 0), 0);
  const lowStock = stock.filter(s => s.balanceKg < 50).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Stock Value" value={formatBDT(totalValue)} icon={Package} color="green" />
        <StatCard title="Low Stock Items" value={lowStock} icon={AlertTriangle} color={lowStock > 0 ? 'red' : 'blue'} />
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 gap-1">
        {['stock', 'purchases'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'stock' ? 'Stock Summary' : 'Purchase History'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
        </div>
        <Button onClick={() => { setShowForm(true); setForm(defaultForm); }}><Plus size={16} /></Button>
      </div>

      {tab === 'stock' ? (
        <div className="space-y-2">
          {stock.length === 0 ? <EmptyState icon={Package} title="No stock data" /> :
            stock.map((item, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.materialType}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">Available: <span className="text-white">{item.availableKg} KG</span></span>
                      <span className="text-xs text-gray-500">Used: <span className="text-orange-400">{item.usedKg} KG</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${item.balanceKg < 50 ? 'text-red-400' : 'text-green-400'}`}>{item.balanceKg} KG</p>
                    <p className="text-xs text-gray-500">{formatBDT(item.avgCostPerKg)}/KG</p>
                    {item.balanceKg < 50 && <div className="flex items-center gap-1 justify-end mt-1"><AlertTriangle size={12} className="text-red-400" /><span className="text-xs text-red-400">Low Stock!</span></div>}
                  </div>
                </div>
                {/* Stock bar */}
                <div className="mt-3 bg-gray-700/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${item.balanceKg < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (item.balanceKg / item.availableKg) * 100)}%` }}
                  />
                </div>
              </Card>
            ))
          }
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMats.length === 0 ? <EmptyState icon={Package} title="No purchases found" /> :
            filteredMats.map(mat => (
              <Card key={mat.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{mat.type}</span>
                    </div>
                    <p className="font-semibold text-white mt-1">{mat.name}</p>
                    <p className="text-xs text-gray-400">{mat.supplier} · {formatDate(mat.purchaseDate)}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-sm text-green-400 font-medium">{mat.quantityKg} KG</span>
                      <span className="text-sm text-gray-400">{formatBDT(mat.ratePerKg)}/KG</span>
                      <span className="text-sm font-semibold text-blue-400">{formatBDT(mat.totalCost)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(mat.id)} className="p-2 rounded-lg bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Raw Material" size="lg">
        <div className="space-y-3">
          <FormInput label="Material Name *" value={form.name} onChange={f('name')} placeholder="e.g. Virgin HDPE Grade A" required />
          <FormSelect label="Material Type *" value={form.type} onChange={f('type')} options={MAT_TYPES} />
          <FormInput label="Supplier Name" value={form.supplier} onChange={f('supplier')} placeholder="Supplier company name" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Quantity (KG) *" type="number" value={form.quantityKg} onChange={f('quantityKg')} placeholder="0" required />
            <FormInput label="Rate per KG (BDT)" type="number" value={form.ratePerKg} onChange={f('ratePerKg')} placeholder="0" />
          </div>
          <FormInput label="Total Cost (BDT)" type="number" value={form.totalCost} onChange={f('totalCost')} placeholder="Auto calculated" />
          <FormInput label="Purchase Date" type="date" value={form.purchaseDate} onChange={f('purchaseDate')} />
          <FormTextarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Additional notes..." />
          <Button onClick={handleSubmit} fullWidth disabled={loading} variant="primary">
            {loading ? 'Saving...' : 'Add Material'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
