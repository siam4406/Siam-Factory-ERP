/**
 * pages/BusinessRulesSettings.jsx
 * Configure all alert thresholds and production cost parameters.
 * Changes persist to IndexedDB via businessRules service.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save, RotateCcw, Zap, Package, Wrench, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { loadRules, saveRule, DEFAULT_RULES } from '../services/businessRules.js';
import { Card, Button, FormInput, SectionHeader } from '../components/UI.jsx';
import { formatBDT } from '../utils/helpers.js';
import { useApp } from '../context/AppContext.jsx';

// ─── Rule input row ───────────────────────────────────────────────────────────
const RuleRow = ({ label, description, ruleKey, value, onChange, unit, icon: Icon, iconColor }) => (
  <div className="flex items-center gap-3 py-3 border-b border-gray-700/30 last:border-0">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
      <Icon size={16} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white leading-tight">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        type="number"
        value={value}
        onChange={e => onChange(ruleKey, Number(e.target.value))}
        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
        min="0"
      />
      {unit && <span className="text-xs text-gray-500 w-8">{unit}</span>}
    </div>
  </div>
);

export const BusinessRulesSettings = () => {
  const { showToast } = useApp();
  const [rules,   setRules]   = useState(DEFAULT_RULES);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const r = await loadRules();
    setRules(r);
    setLoading(false);
  };

  const handleChange = (key, value) => {
    setRules(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each rule that differs from what's stored
      for (const [key, val] of Object.entries(rules)) {
        await saveRule(key, val);
      }
      setDirty(false);
      showToast('Business rules saved!', 'success');
    } catch (e) {
      showToast('Error saving rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRules({ ...DEFAULT_RULES });
    setDirty(true);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Live cost preview
  const costPreview = {
    matCost:    rules.electricity_rate_bdt * 8,     // 8 hrs typical
    laborCost:  rules.labor_cost_per_shift * 2,     // 2 operators
    totalShift: (rules.electricity_rate_bdt * 8) + (rules.labor_cost_per_shift * 2),
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mt-0.5">Configure alert thresholds and cost parameters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw size={13} /> Reset
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save All'}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-400">
          <AlertTriangle size={13} />
          You have unsaved changes. Press Save All to apply.
        </div>
      )}

      {/* Stock alerts */}
      <Card>
        <SectionHeader title="Stock Alert Thresholds" subtitle="When to trigger low/critical stock warnings" />
        <RuleRow
          label="Low Stock Warning (KG)"
          description="Alert when material balance falls below this level"
          ruleKey="low_stock_kg" value={rules.low_stock_kg} onChange={handleChange}
          unit="KG" icon={Package} iconColor="bg-yellow-600"
        />
        <RuleRow
          label="Critical Stock (KG)"
          description="Critical alert — reorder immediately"
          ruleKey="critical_stock_kg" value={rules.critical_stock_kg} onChange={handleChange}
          unit="KG" icon={Package} iconColor="bg-red-600"
        />
      </Card>

      {/* Production quality */}
      <Card>
        <SectionHeader title="Quality Control Thresholds" />
        <RuleRow
          label="Reject % Warning"
          description="Alert when rejection rate exceeds this percentage"
          ruleKey="reject_pct_warning" value={rules.reject_pct_warning} onChange={handleChange}
          unit="%" icon={TrendingDown} iconColor="bg-yellow-700"
        />
        <RuleRow
          label="Reject % Critical"
          description="Critical alert — inspect machine and material immediately"
          ruleKey="reject_pct_critical" value={rules.reject_pct_critical} onChange={handleChange}
          unit="%" icon={TrendingDown} iconColor="bg-red-700"
        />
        <RuleRow
          label="Min Efficiency %"
          description="Alert when production efficiency falls below this"
          ruleKey="min_efficiency_pct" value={rules.min_efficiency_pct} onChange={handleChange}
          unit="%" icon={TrendingDown} iconColor="bg-orange-700"
        />
        <RuleRow
          label="High Wastage % Alert"
          description="Alert when material wastage exceeds this percentage"
          ruleKey="high_wastage_pct" value={rules.high_wastage_pct} onChange={handleChange}
          unit="%" icon={Package} iconColor="bg-orange-600"
        />
      </Card>

      {/* Machine */}
      <Card>
        <SectionHeader title="Machine & Maintenance" />
        <RuleRow
          label="Maintenance Interval (hours)"
          description="Alert when running hours since last maintenance exceed this"
          ruleKey="machine_maintenance_hrs" value={rules.machine_maintenance_hrs} onChange={handleChange}
          unit="hrs" icon={Wrench} iconColor="bg-purple-700"
        />
        <RuleRow
          label="Order Delay Alert (days)"
          description="Flag orders this many days past delivery date"
          ruleKey="order_delay_days" value={rules.order_delay_days} onChange={handleChange}
          unit="days" icon={Clock} iconColor="bg-blue-700"
        />
      </Card>

      {/* Cost parameters */}
      <Card>
        <SectionHeader title="Production Cost Parameters" subtitle="Used for automatic cost calculations" />
        <RuleRow
          label="Electricity Rate"
          description="BDT per unit (kWh) — used to calculate electricity cost per shift"
          ruleKey="electricity_rate_bdt" value={rules.electricity_rate_bdt} onChange={handleChange}
          unit="৳/kWh" icon={Zap} iconColor="bg-yellow-600"
        />
        <RuleRow
          label="Labor Cost per Shift"
          description="BDT per operator per shift — multiplied by operator count"
          ruleKey="labor_cost_per_shift" value={rules.labor_cost_per_shift} onChange={handleChange}
          unit="৳" icon={DollarSign} iconColor="bg-blue-600"
        />
      </Card>

      {/* Live cost preview */}
      <Card>
        <SectionHeader title="Typical Shift Cost Preview" subtitle="Based on current parameters (8 hrs, 2 operators)" />
        <div className="grid grid-cols-3 gap-3 mt-1">
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Electricity</p>
            <p className="text-base font-bold text-yellow-400">{formatBDT(costPreview.matCost)}</p>
            <p className="text-xs text-gray-600">8 hrs</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Labor</p>
            <p className="text-base font-bold text-purple-400">{formatBDT(costPreview.laborCost)}</p>
            <p className="text-xs text-gray-600">2 operators</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Overhead/Shift</p>
            <p className="text-base font-bold text-blue-400">{formatBDT(costPreview.totalShift)}</p>
            <p className="text-xs text-gray-600">excl. material</p>
          </div>
        </div>
      </Card>

      {/* Save button (bottom) */}
      {dirty && (
        <Button onClick={handleSave} fullWidth disabled={saving} variant="primary">
          <Save size={16} /> {saving ? 'Saving…' : 'Save All Rules'}
        </Button>
      )}
    </div>
  );
};
