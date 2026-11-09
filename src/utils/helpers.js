export const formatBDT = (amount) => {
  if (amount === null || amount === undefined) return '৳0';
  return `৳${Number(amount).toLocaleString('en-BD')}`;
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-BD');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-BD', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const todayStr = () => new Date().toISOString().split('T')[0];

export const generateOrderId = (existingOrders) => {
  const count = (existingOrders?.length || 0) + 1;
  return `ORD-${String(count).padStart(3, '0')}`;
};

export const generateInvoiceNumber = (existingSales) => {
  const count = (existingSales?.length || 0) + 1;
  return `INV-${String(count).padStart(3, '0')}`;
};

export const getStatusColor = (status) => {
  const colors = {
    'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'In Production': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Completed': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Delivered': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Running': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Maintenance': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Stopped': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Active': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

export const getActivityIcon = (type) => {
  const icons = {
    production: '🏭',
    order: '📋',
    sale: '💰',
    material: '📦',
    expense: '💸',
    cap_production: '🔩',
    machine: '⚙️',
    default: '📌',
  };
  return icons[type] || icons.default;
};

export const calcProductionMetrics = (entry) => {
  const matCost = (entry.materialUsedKg || 0) * 100; // avg cost per kg
  const rejectPct = entry.bottlesProduced > 0
    ? ((entry.rejectQuantity / entry.bottlesProduced) * 100).toFixed(1)
    : 0;
  const efficiency = entry.bottlesProduced > 0
    ? (((entry.bottlesProduced - entry.rejectQuantity) / entry.bottlesProduced) * 100).toFixed(1)
    : 0;
  const costPerBottle = entry.bottlesProduced > 0
    ? (matCost / entry.bottlesProduced).toFixed(2)
    : 0;
  return { matCost, rejectPct, efficiency, costPerBottle };
};

export const isLowStock = (kg) => kg < 50;

export const getMonthName = (month) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[month] || '';
};

export const exportJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
