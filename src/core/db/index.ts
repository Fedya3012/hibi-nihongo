/**
 * KHO DỮ LIỆU OFFLINE — điểm vào duy nhất cho các module.
 * Mọi module chỉ import từ '@/core/db', không import thẳng từng file bên trong.
 * Hướng dẫn dùng chi tiết: src/core/db/README.md
 */
export { STORES, DB_NAME, DB_VERSION, type StoreName, type Migration } from './schema'
export {
  openDb, transaction, promisify,
  get, getAll, getAllByIndex, count, put, putMany, remove, clear,
} from './idb'
export { onDbChange, emitChange } from './events'
export { kvGet, kvSet, kvDelete } from './kv'
export { useDbQuery, type DbQueryState } from './useDbQuery'
export {
  listPacks, getPack, getItem, findByKey, findByKeyPrefix, listItems,
  installPackData, installPackFile, removePack, parsePackBytes,
  fetchManifest, planUpdates, runUpdates, updateInstalledPacks, DEFAULT_MANIFEST_URL,
  type PackItem, type PackFileItem, type InstalledPack, type PackFull, type PackPatch,
  type PackManifest, type ManifestPack, type RemoteFile, type UpdatePlanItem, type Progress,
} from './content'
export { createBackup, downloadBackup, restoreBackup, lastBackupAt, type BackupFile } from './backup'
export { requestPersistentStorage, getStorageInfo, formatBytes, type StorageInfo } from './storage'
