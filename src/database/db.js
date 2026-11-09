/**
 * db.js — Single unified IndexedDB module.
 * One DB, one version (3), one open connection.
 * Replaces the old db.js (v1) + db.v2.js (v2) split that caused version conflicts.
 */

const DB_NAME    = 'SiamPlasticDB';
const DB_VERSION = 3;   // higher than any previously stored version

const STORES = {
  users:                'users',
  orders:               'orders',
  customers:            'customers',
  materials:            'materials',
  material_stock:       'material_stock',
  production:           'production',
  cap_production:       'cap_production',
  inventory:            'inventory',
  sales:                'sales',
  expenses:             'expenses',
  machines:             'machines',
  dies:                 'dies',
  settings:             'settings',
  notifications:        'notifications',
  activity_log:         'activity_log',
  // v2 extended stores
  inventory_movements:  'inventory_movements',
  scrap_log:            'scrap_log',
  operator_performance: 'operator_performance',
  business_rules:       'business_rules',
  electricity_log:      'electricity_log',
  material_consumption: 'material_consumption',
  shift_summaries:      'shift_summaries',
};

// Alias for code that imports STORES_EXT
const STORES_EXT = STORES;

let _db = null;

// ─── Open / upgrade ───────────────────────────────────────────────────────────
const openDB = () => new Promise((resolve, reject) => {
  if (_db) { resolve(_db); return; }

  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onupgradeneeded = (e) => {
    const db = e.target.result;

    const ensure = (name, keyPath, indexes = []) => {
      let store;
      if (!db.objectStoreNames.contains(name)) {
        store = db.createObjectStore(name, { keyPath, autoIncrement: true });
      } else {
        store = e.target.transaction.objectStore(name);
      }
      indexes.forEach(([idx, unique = false]) => {
        if (!store.indexNames.contains(idx)) {
          store.createIndex(idx, idx, { unique });
        }
      });
      return store;
    };

    const ensureKey = (name) => {
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, { keyPath: 'key' });
      }
    };

    ensure('users',                'id', [['pin', false]]);
    ensure('orders',               'id', [['orderId', true], ['status', false], ['customerId', false], ['createdAt', false]]);
    ensure('customers',            'id', [['phone', false], ['name', false]]);
    ensure('materials',            'id', [['type', false], ['purchaseDate', false]]);
    ensure('material_stock',       'id', [['materialType', false]]);
    ensure('production',           'id', [['date', false], ['productType', false]]);
    ensure('cap_production',       'id', [['date', false]]);
    ensure('inventory',            'id');
    ensure('sales',                'id', [['invoiceNumber', true], ['date', false], ['customerId', false]]);
    ensure('expenses',             'id', [['date', false], ['category', false]]);
    ensure('machines',             'id');
    ensure('dies',                 'id');
    ensureKey('settings');
    ensure('notifications',        'id', [['read', false], ['createdAt', false]]);
    ensure('activity_log',         'id', [['createdAt', false]]);
    ensure('inventory_movements',  'id', [['date', false], ['type', false], ['category', false], ['reference', false]]);
    ensure('scrap_log',            'id', [['date', false], ['scrapType', false], ['productionId', false]]);
    ensure('operator_performance', 'id', [['operatorName', false], ['date', false]]);
    // business_rules uses keyPath='key' (not autoIncrement)
    if (!db.objectStoreNames.contains('business_rules')) {
      db.createObjectStore('business_rules', { keyPath: 'key' });
    }
    ensure('electricity_log',      'id', [['productionId', false], ['date', false]]);
    ensure('material_consumption', 'id', [['productionId', false], ['materialType', false], ['date', false]]);
    ensure('shift_summaries',      'id', [['date', false], ['shift', false]]);


  };

  req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
  req.onerror    = ()  => reject(req.error);
  req.onblocked  = ()  => {
    // Another tab has the DB open at an older version
    console.warn('IndexedDB upgrade blocked — close other tabs and reload.');
    reject(new Error('Database upgrade blocked. Close other tabs and reload.'));
  };
});

export const getDB    = openDB;
export const getDBv2  = openDB;   // alias used by services
export const initDB   = openDB;
export const initDBv2 = openDB;   // alias used by App.jsx

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();

export const addRecord = async (storeName, data) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).add({ ...data, createdAt: data.createdAt || now(), updatedAt: now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
};

export const addRecordV2 = addRecord;   // alias

export const updateRecord = async (storeName, data) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put({ ...data, updatedAt: now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
};

export const updateRecordV2 = updateRecord;   // alias

export const deleteRecord = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
};

export const deleteRecordV2 = deleteRecord;

export const getRecord = async (storeName, id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
};

export const getRecordV2 = getRecord;

export const getAllRecords = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
};

export const getAllRecordsV2 = getAllRecords;   // alias

export const getRecordByIndex = async (storeName, indexName, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror   = () => reject(req.error);
  });
};

export const getByIndexV2 = getRecordByIndex;

export const getSetting = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror   = () => reject(req.error);
  });
};

export const getSettingV2 = getSetting;

export const setSetting = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('settings', 'readwrite');
    const req = tx.objectStore('settings').put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
};

export const setSettingV2 = setSetting;

export { STORES, STORES_EXT };
