/**
 * db.v2.js — Re-exports everything from the unified db.js.
 * Kept so that existing imports of db.v2.js continue to work without changes.
 */
export {
  getDB, getDBv2,
  initDB, initDBv2,
  addRecord, addRecordV2,
  updateRecord, updateRecordV2,
  deleteRecord, deleteRecordV2,
  getRecord, getRecordV2,
  getAllRecords, getAllRecordsV2,
  getRecordByIndex, getByIndexV2,
  getSetting, getSettingV2,
  setSetting, setSettingV2,
  STORES, STORES_EXT,
} from './db.js';
