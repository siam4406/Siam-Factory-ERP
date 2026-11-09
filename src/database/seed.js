import { addRecord, setSetting, getAllRecords, STORES } from './db.js';

export const seedDatabase = async () => {
  // Check if already seeded
  const existing = await getAllRecords(STORES.machines);
  if (existing.length > 0) return;

  // Default settings
  await setSetting('pin', '1234');
  await setSetting('factoryName', 'Siam Plastic Factory');
  await setSetting('currency', 'BDT');
  await setSetting('darkMode', true);
  await setSetting('isSetup', true);

  // Machines
  const machines = [
    { name: 'Blow Mold Machine #1', type: 'Blow Molding', status: 'Running', runningHours: 1240, lastMaintenance: '2025-04-15', nextMaintenance: '2025-07-15', notes: 'Main production machine' },
    { name: 'Blow Mold Machine #2', type: 'Blow Molding', status: 'Maintenance', runningHours: 980, lastMaintenance: '2025-05-01', nextMaintenance: '2025-08-01', notes: 'Secondary machine' },
    { name: 'Injection Mold Hand Press', type: 'Injection Molding', status: 'Running', runningHours: 560, lastMaintenance: '2025-04-20', nextMaintenance: '2025-07-20', notes: 'Used for cap production' },
  ];
  for (const m of machines) await addRecord(STORES.machines, m);

  // Dies
  const dies = [
    { name: '5L Bottle Die', type: '5 Liter', status: 'Active', lastMaintenance: '2025-03-10', notes: 'Good condition' },
    { name: '10L Bottle Die', type: '10 Liter', status: 'Active', lastMaintenance: '2025-03-10', notes: 'Minor wear' },
    { name: 'Cap Die - Blue', type: 'Cap', status: 'Active', lastMaintenance: '2025-02-20', notes: '' },
    { name: 'Cap Die - Red', type: 'Cap', status: 'Maintenance', lastMaintenance: '2025-04-01', notes: 'Needs polishing' },
  ];
  for (const d of dies) await addRecord(STORES.dies, d);

  // Materials / stock
  const materials = [
    { name: 'Virgin HDPE', type: 'Virgin HDPE', supplier: 'Bashundhara Chemicals', quantityKg: 500, ratePerKg: 130, totalCost: 65000, purchaseDate: '2025-05-01', notes: 'Grade A' },
    { name: 'Recycle HDPE', type: 'Recycle HDPE', supplier: 'Green Recycle BD', quantityKg: 300, ratePerKg: 75, totalCost: 22500, purchaseDate: '2025-05-03', notes: '' },
    { name: 'PET', type: 'PET', supplier: 'Meghna Polymer', quantityKg: 200, ratePerKg: 150, totalCost: 30000, purchaseDate: '2025-04-28', notes: 'Food grade' },
    { name: 'Color Masterbatch - Blue', type: 'Color Masterbatch', supplier: 'Color BD', quantityKg: 50, ratePerKg: 280, totalCost: 14000, purchaseDate: '2025-05-02', notes: '' },
    { name: 'Cap Material', type: 'Cap Material', supplier: 'Plastic House', quantityKg: 80, ratePerKg: 120, totalCost: 9600, purchaseDate: '2025-05-04', notes: '' },
  ];
  for (const m of materials) await addRecord(STORES.materials, m);

  // Material stock summary
  const stockSummary = [
    { materialType: 'Virgin HDPE', availableKg: 500, usedKg: 120, balanceKg: 380, avgCostPerKg: 130 },
    { materialType: 'Recycle HDPE', availableKg: 300, usedKg: 80, balanceKg: 220, avgCostPerKg: 75 },
    { materialType: 'PET', availableKg: 200, usedKg: 60, balanceKg: 140, avgCostPerKg: 150 },
    { materialType: 'Color Masterbatch', availableKg: 50, usedKg: 10, balanceKg: 40, avgCostPerKg: 280 },
    { materialType: 'Cap Material', availableKg: 80, usedKg: 15, balanceKg: 65, avgCostPerKg: 120 },
  ];
  for (const s of stockSummary) await addRecord(STORES.material_stock, s);

  // Customers
  const customers = [
    { name: 'Rahim Trading', phone: '01711223344', address: 'Mirpur-10, Dhaka', dueBalance: 15000 },
    { name: 'Karim Distributors', phone: '01811334455', address: 'Gazipur Sadar', dueBalance: 0 },
    { name: 'Hasan Enterprise', phone: '01911445566', address: 'Narayanganj', dueBalance: 8500 },
    { name: 'Nabil Plastic Store', phone: '01612556677', address: 'Uttara, Dhaka', dueBalance: 0 },
  ];
  for (const c of customers) await addRecord(STORES.customers, c);

  // Orders
  const orders = [
    { orderId: 'ORD-001', customerId: 1, customerName: 'Rahim Trading', phone: '01711223344', address: 'Mirpur-10, Dhaka', productType: '5L Bottle', capIncluded: true, quantity: 500, pricePerPiece: 45, totalAmount: 22500, advancePaid: 10000, dueAmount: 12500, deliveryDate: '2025-05-20', status: 'In Production', notes: '' },
    { orderId: 'ORD-002', customerId: 2, customerName: 'Karim Distributors', phone: '01811334455', address: 'Gazipur Sadar', productType: '10L Bottle', capIncluded: false, quantity: 200, pricePerPiece: 85, totalAmount: 17000, advancePaid: 17000, dueAmount: 0, deliveryDate: '2025-05-18', status: 'Completed', notes: 'Urgent delivery' },
    { orderId: 'ORD-003', customerId: 3, customerName: 'Hasan Enterprise', phone: '01911445566', address: 'Narayanganj', productType: '5L Bottle', capIncluded: true, quantity: 1000, pricePerPiece: 44, totalAmount: 44000, advancePaid: 20000, dueAmount: 24000, deliveryDate: '2025-05-25', status: 'Pending', notes: '' },
    { orderId: 'ORD-004', customerId: 4, customerName: 'Nabil Plastic Store', phone: '01612556677', address: 'Uttara, Dhaka', productType: '10L Bottle', capIncluded: true, quantity: 150, pricePerPiece: 90, totalAmount: 13500, advancePaid: 13500, dueAmount: 0, deliveryDate: '2025-05-15', status: 'Delivered', notes: '' },
  ];
  for (const o of orders) await addRecord(STORES.orders, o);

  // Production entries
  const production = [
    { date: '2025-05-12', shift: 'Morning', machineName: 'Blow Mold Machine #1', operatorName: 'Rafiq', materialUsedKg: 120, bottlesProduced: 420, rejectQuantity: 12, productType: '5L Bottle', electricityHours: 8, notes: '' },
    { date: '2025-05-12', shift: 'Evening', machineName: 'Blow Mold Machine #1', operatorName: 'Sumon', materialUsedKg: 115, bottlesProduced: 380, rejectQuantity: 8, productType: '5L Bottle', electricityHours: 8, notes: '' },
    { date: '2025-05-11', shift: 'Morning', machineName: 'Blow Mold Machine #1', operatorName: 'Rafiq', materialUsedKg: 80, bottlesProduced: 180, rejectQuantity: 5, productType: '10L Bottle', electricityHours: 8, notes: '' },
    { date: '2025-05-10', shift: 'Morning', machineName: 'Blow Mold Machine #1', operatorName: 'Rafiq', materialUsedKg: 125, bottlesProduced: 440, rejectQuantity: 10, productType: '5L Bottle', electricityHours: 8, notes: '' },
  ];
  for (const p of production) await addRecord(STORES.production, p);

  // Cap production
  const capProduction = [
    { date: '2025-05-12', color: 'Blue', materialUsedKg: 8, totalCapsProduced: 1600, rejectCaps: 45, machineName: 'Injection Mold Hand Press', operatorName: 'Kamal', notes: '' },
    { date: '2025-05-11', color: 'White', materialUsedKg: 10, totalCapsProduced: 2000, rejectCaps: 60, machineName: 'Injection Mold Hand Press', operatorName: 'Kamal', notes: '' },
    { date: '2025-05-10', color: 'Red', materialUsedKg: 6, totalCapsProduced: 1200, rejectCaps: 30, machineName: 'Injection Mold Hand Press', operatorName: 'Raju', notes: '' },
  ];
  for (const c of capProduction) await addRecord(STORES.cap_production, c);

  // Inventory
  const inventory = [
    { category: 'Finished Goods', item: '5L Bottle', quantity: 800, unit: 'pcs', lastUpdated: '2025-05-12' },
    { category: 'Finished Goods', item: '10L Bottle', quantity: 175, unit: 'pcs', lastUpdated: '2025-05-12' },
    { category: 'Finished Goods', item: 'Caps', quantity: 4800, unit: 'pcs', lastUpdated: '2025-05-12' },
    { category: 'Scrap / Reject', item: 'Rejected Bottles', quantity: 35, unit: 'pcs', lastUpdated: '2025-05-12' },
    { category: 'Scrap / Reject', item: 'Rejected Caps', quantity: 135, unit: 'pcs', lastUpdated: '2025-05-12' },
  ];
  for (const i of inventory) await addRecord(STORES.inventory, i);

  // Sales
  const sales = [
    { invoiceNumber: 'INV-001', customerId: 4, customerName: 'Nabil Plastic Store', product: '10L Bottle', quantity: 150, rate: 90, total: 13500, paid: 13500, due: 0, paymentMethod: 'Bank', date: '2025-05-14' },
    { invoiceNumber: 'INV-002', customerId: 2, customerName: 'Karim Distributors', product: '10L Bottle', quantity: 200, rate: 85, total: 17000, paid: 17000, due: 0, paymentMethod: 'Cash', date: '2025-05-13' },
    { invoiceNumber: 'INV-003', customerId: 1, customerName: 'Rahim Trading', product: '5L Bottle', quantity: 200, rate: 45, total: 9000, paid: 9000, due: 0, paymentMethod: 'Mobile Banking', date: '2025-05-11' },
  ];
  for (const s of sales) await addRecord(STORES.sales, s);

  // Expenses
  const expenses = [
    { category: 'Electricity', amount: 8500, date: '2025-05-01', notes: 'May first week bill' },
    { category: 'Labor', amount: 25000, date: '2025-05-05', notes: 'Worker salaries partial' },
    { category: 'Machine Repair', amount: 3500, date: '2025-05-08', notes: 'Blow mold machine #2 repair' },
    { category: 'Transport', amount: 2000, date: '2025-05-10', notes: 'Delivery charges' },
    { category: 'Oil / Mobil', amount: 1200, date: '2025-05-10', notes: 'Machine oil' },
    { category: 'Miscellaneous', amount: 800, date: '2025-05-11', notes: 'Office supplies' },
  ];
  for (const e of expenses) await addRecord(STORES.expenses, e);

  // Notifications
  const notifications = [
    { type: 'low_stock', title: 'Low Stock Alert', message: 'Color Masterbatch is running low (40 KG remaining)', read: false, createdAt: new Date().toISOString() },
    { type: 'pending_order', title: 'Pending Order', message: 'Order ORD-003 from Hasan Enterprise needs production start', read: false, createdAt: new Date().toISOString() },
    { type: 'due_payment', title: 'Due Payment', message: 'Rahim Trading has BDT 12,500 pending payment', read: false, createdAt: new Date().toISOString() },
    { type: 'maintenance', title: 'Maintenance Due', message: 'Blow Mold Machine #2 is under maintenance', read: true, createdAt: new Date().toISOString() },
  ];
  for (const n of notifications) await addRecord(STORES.notifications, n);

  // Activity log
  const activities = [
    { type: 'production', message: 'Added production: 420 x 5L Bottles (Morning shift)', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { type: 'order', message: 'New order ORD-003 from Hasan Enterprise for 1000 x 5L Bottles', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { type: 'sale', message: 'Sale INV-002: 200 x 10L Bottles to Karim Distributors', createdAt: new Date(Date.now() - 10800000).toISOString() },
    { type: 'material', message: 'Added 500 KG Virgin HDPE from Bashundhara Chemicals', createdAt: new Date(Date.now() - 14400000).toISOString() },
    { type: 'expense', message: 'Recorded Machine Repair expense: BDT 3,500', createdAt: new Date(Date.now() - 18000000).toISOString() },
  ];
  for (const a of activities) await addRecord(STORES.activity_log, a);
};
