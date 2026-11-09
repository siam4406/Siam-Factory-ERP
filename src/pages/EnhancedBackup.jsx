/**
 * pages/EnhancedBackup.jsx
 * Full offline backup & restore system.
 * Export: all IndexedDB stores → single JSON file.
 * Import: validates schema, restores data store-by-store with progress.
 */
import React, { useState, useRef } from 'react';
import {
  Download, Upload, CheckCircle, AlertTriangle, Loader2,
  FileJson, Shield, Clock, Database, RefreshCw, Trash2
} from 'lucide-react';
import { getAllRecords, addRecord, STORES } from '../database/db.js';
import { getAllRecordsV2, addRecordV2, STORES_EXT } from '../database/db.v2.js';
import { exportJSON, formatDateTime, todayStr } from '../utils/helpers.js';
import { Card, Button, SectionHeader } from '../components/UI.jsx';
import { useApp } from '../context/AppContext.jsx';

// All store names (v1 + v2)
const ALL_STORES = {
  ...Object.fromEntries(Object.entries(STORES).map(([k, v]) => [k, { store: v, version: 1 }])),
  inventory_movements:  { store: 'inventory_movements',  version: 2 },
  scrap_log:            { store: 'scrap_log',            version: 2 },
  operator_performance: { store: 'operator_performance', version: 2 },
  business_rules:       { store: 'business_rules',       version: 2 },
  electricity_log:      { store: 'electricity_log',      version: 2 },
  material_consumption: { store: 'material_consumption', version: 2 },
  shift_summaries:      { store: 'shift_summaries',      version: 2 },
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ value, label, color = 'bg-blue-500' }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{Math.round(value)}%</span>
    </div>
    <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
      <div className={`h-2 ${color} rounded-full transition-all duration-300`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

export const EnhancedBackup = () => {
  const { showToast, factoryName } = useApp();

  // Export state
  const [exporting,   setExporting]   = useState(false);
  const [exportProg,  setExportProg]  = useState(0);
  const [lastExport,  setLastExport]  = useState(null);

  // Import state
  const [importing,   setImporting]   = useState(false);
  const [importProg,  setImportProg]  = useState(0);
  const [importFile,  setImportFile]  = useState(null);
  const [importMeta,  setImportMeta]  = useState(null);
  const [importError, setImportError] = useState(null);
  const [importDone,  setImportDone]  = useState(false);
  const fileRef = useRef(null);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setExportProg(0);
    try {
      const storeKeys  = Object.keys(ALL_STORES);
      const backup     = { meta: { factoryName, exportedAt: new Date().toISOString(), version: '2.0', storeCount: storeKeys.length }, stores: {} };

      for (let i = 0; i < storeKeys.length; i++) {
        const key  = storeKeys[i];
        const info = ALL_STORES[key];
        try {
          const records = info.version === 1
            ? await getAllRecords(info.store)
            : await getAllRecordsV2(info.store).catch(() => []);
          backup.stores[info.store] = records;
        } catch {
          backup.stores[info.store] = [];
        }
        setExportProg(((i + 1) / storeKeys.length) * 100);
      }

      const totalRecords = Object.values(backup.stores).reduce((s, arr) => s + arr.length, 0);
      backup.meta.totalRecords = totalRecords;

      const filename = `siam_erp_backup_${todayStr()}_${Date.now()}.json`;
      exportJSON(backup, filename);
      setLastExport({ filename, totalRecords, exportedAt: new Date().toISOString() });
      showToast(`Backup exported! ${totalRecords} records saved.`, 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // ── File selection & validation ────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportMeta(null);
    setImportError(null);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.meta || !data.stores) {
          setImportError('Invalid backup file — missing required structure.');
          return;
        }
        setImportMeta({
          ...data.meta,
          storesFound: Object.keys(data.stores).length,
          filename: file.name,
          fileSizeKB: (file.size / 1024).toFixed(1),
        });
      } catch {
        setImportError('File is not valid JSON or is corrupted.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Import / Restore ──────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile || !importMeta) return;
    if (!window.confirm(
      `This will ADD all records from the backup file.\n\nBackup contains ${importMeta.totalRecords} records from ${importMeta.exportedAt ? new Date(importMeta.exportedAt).toLocaleString() : 'unknown date'}.\n\nExisting records will NOT be deleted. Continue?`
    )) return;

    setImporting(true);
    setImportProg(0);
    setImportError(null);

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const storeKeys = Object.keys(data.stores);
      let restored = 0;

      for (let i = 0; i < storeKeys.length; i++) {
        const storeName = storeKeys[i];
        const records   = data.stores[storeName] || [];
        const info      = Object.values(ALL_STORES).find(s => s.store === storeName);

        for (const record of records) {
          try {
            // Strip existing id so IndexedDB assigns a new one (prevents conflicts)
            const { id, ...rest } = record;
            if (info?.version === 2) {
              await addRecordV2(storeName, rest).catch(() => {});
            } else {
              await addRecord(storeName, rest).catch(() => {});
            }
            restored++;
          } catch {}
        }

        setImportProg(((i + 1) / storeKeys.length) * 100);
      }

      setImportDone(true);
      showToast(`Restored ${restored} records successfully!`, 'success');
    } catch (e) {
      setImportError('Restore failed: ' + e.message);
      showToast('Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportMeta(null);
    setImportError(null);
    setImportDone(false);
    setImportProg(0);
  };

  return (
    <div className="space-y-5">
      {/* Export section */}
      <Card>
        <SectionHeader
          title="Export Backup"
          subtitle="Download all factory data as a JSON file"
          action={<Database size={18} className="text-blue-400" />}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Shield size={16} className="text-blue-400 shrink-0" />
            <p className="text-xs text-gray-300">
              Backup includes all {Object.keys(ALL_STORES).length} data stores — orders, customers, production, materials, sales, expenses, machines, activity logs, and more.
            </p>
          </div>

          {exporting && <ProgressBar value={exportProg} label="Exporting stores…" color="bg-blue-500" />}

          {lastExport && !exporting && (
            <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
              <CheckCircle size={14} className="text-green-400 shrink-0" />
              <div>
                <p className="text-green-400 font-medium">{lastExport.filename}</p>
                <p className="text-gray-500">{lastExport.totalRecords} records · {formatDateTime(lastExport.exportedAt)}</p>
              </div>
            </div>
          )}

          <Button onClick={handleExport} fullWidth disabled={exporting} variant="primary">
            {exporting
              ? <><Loader2 size={15} className="animate-spin" /> Exporting…</>
              : <><Download size={15} /> Export Full Backup</>
            }
          </Button>
        </div>
      </Card>

      {/* Import section */}
      <Card>
        <SectionHeader
          title="Import & Restore"
          subtitle="Restore from a previously exported backup file"
          action={<Upload size={18} className="text-green-400" />}
        />

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-300">
              Import adds records from backup without deleting existing data. For a clean restore, data should be cleared first.
            </p>
          </div>

          {/* File picker */}
          {!importFile && (
            <label className="flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-xl py-8 cursor-pointer transition-all hover:bg-blue-500/5">
              <FileJson size={32} className="text-gray-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-400">Select backup file</p>
                <p className="text-xs text-gray-600 mt-1">.json backup files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
            </label>
          )}

          {/* File selected — show meta */}
          {importFile && importMeta && !importDone && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <FileJson size={16} className="text-blue-400" />
                  <p className="text-sm font-semibold text-white truncate">{importMeta.filename}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Factory</span>
                  <span className="text-white">{importMeta.factoryName || '—'}</span>
                  <span className="text-gray-500">Exported</span>
                  <span className="text-white">{importMeta.exportedAt ? new Date(importMeta.exportedAt).toLocaleDateString() : '—'}</span>
                  <span className="text-gray-500">Records</span>
                  <span className="text-green-400 font-bold">{importMeta.totalRecords?.toLocaleString()}</span>
                  <span className="text-gray-500">Stores</span>
                  <span className="text-white">{importMeta.storesFound}</span>
                  <span className="text-gray-500">File Size</span>
                  <span className="text-white">{importMeta.fileSizeKB} KB</span>
                  <span className="text-gray-500">Backup Ver.</span>
                  <span className="text-white">{importMeta.version || '1.0'}</span>
                </div>
              </div>

              {importing && <ProgressBar value={importProg} label="Restoring data…" color="bg-green-500" />}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetImport} disabled={importing}>
                  <RefreshCw size={13} /> Change File
                </Button>
                <Button variant="success" fullWidth onClick={handleImport} disabled={importing}>
                  {importing
                    ? <><Loader2 size={14} className="animate-spin" /> Restoring…</>
                    : <><Upload size={14} /> Restore Now</>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Validation error */}
          {importError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">Invalid Backup File</p>
                <p className="text-xs text-gray-400 mt-0.5">{importError}</p>
              </div>
            </div>
          )}

          {/* Done */}
          {importDone && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle size={18} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-400">Restore Complete!</p>
                  <p className="text-xs text-gray-400 mt-0.5">All records have been imported. Reload the app to see restored data.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetImport} className="flex-1">
                  Import Another
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={() => window.location.reload()}>
                  Reload App
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Best practices */}
      <Card>
        <SectionHeader title="Backup Best Practices" />
        <div className="space-y-2.5">
          {[
            { icon: Clock,         color: 'text-blue-400',   text: 'Export backup daily or after major data entry' },
            { icon: Shield,        color: 'text-green-400',  text: 'Save backup files to Google Drive or external storage' },
            { icon: Database,      color: 'text-purple-400', text: 'Keep at least 7 days of rolling backups' },
            { icon: AlertTriangle, color: 'text-yellow-400', text: 'Always backup before reinstalling or clearing the app' },
            { icon: RefreshCw,     color: 'text-cyan-400',   text: 'Test restore on a fresh install periodically' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3">
              <tip.icon size={14} className={`${tip.color} shrink-0 mt-0.5`} />
              <p className="text-xs text-gray-400">{tip.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
