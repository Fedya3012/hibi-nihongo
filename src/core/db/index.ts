/**
 * KHO DỮ LIỆU OFFLINE — điểm vào duy nhất cho các module.
 * Mọi module chỉ import từ '@/core/db', không import thẳng từng file bên trong.
 * Hướng dẫn dùng chi tiết: src/core/db/README.md
 */
export {
  STORES, DB_NAME, DB_VERSION, type StoreName, type Migration,
  splitCardMedia, MEDIA_FIELDS, type MediaField, type CardMediaRecord,
} from './schema'
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
export {
  createBackup, createBackupZip, downloadBackup, restoreBackup, inspectBackup, lastBackupAt, markBackedUp, saveBlob,
  getRestoreSnapshot, undoLastRestore, deleteRestoreSnapshot, downloadRestoreSnapshot, SafetySnapshotError,
  deviceId, lastLocalChangeAt,
  type BackupFile, type BackupManifest, type BackupSummary, type BuiltBackup, type RestoreResult, type RestoreSnapshotInfo,
} from './backup'
export { requestPersistentStorage, getStorageInfo, formatBytes, type StorageInfo } from './storage'
export { isQuotaError, reportQuotaError, onQuotaError, lastQuotaErrorAt, QUOTA_MESSAGE } from './quota'
export { STORE_LABELS } from './labels'
