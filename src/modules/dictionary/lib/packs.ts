/**
 * QUẢN LÝ GÓI TỪ ĐIỂN: kiểm tra đã cài chưa, tải và cài, cập nhật.
 * Dùng API gói nội dung của @/core/db (chỉ tải phần thay đổi khi có bản mới).
 */
import { create } from 'zustand'
import {
  fetchManifest, installPackFile, listPacks, planUpdates, runUpdates, useDbQuery,
  type InstalledPack, type Progress, type UpdatePlanItem,
} from '@/core/db'
import { KANJI_PACK, WORD_PACK } from '../types'
import { clearSearchCache } from './search'

export const DICT_PACKS = [WORD_PACK, KANJI_PACK]

export interface DictPackState {
  loading: boolean
  word?: InstalledPack
  kanji?: InstalledPack
  /** true khi gói từ vựng đã cài xong và dùng được. */
  ready: boolean
}

/** Hook: trạng thái các gói từ điển trên máy (tự cập nhật khi cài xong). */
export function useDictPacks(): DictPackState {
  const { data, loading } = useDbQuery(() => listPacks(), [], ['packs'])
  const word = data?.find((p) => p.id === WORD_PACK)
  const kanji = data?.find((p) => p.id === KANJI_PACK)
  return { loading, word, kanji, ready: word?.status === 'ready' }
}

export interface InstallState {
  running: boolean
  progress?: Progress
  error?: string
  plan?: UpdatePlanItem[]
}

/**
 * Trạng thái cài đặt dùng CHUNG cho mọi nơi hiện khối "Tải từ điển" (trang Từ điển, bảng từ vựng anime...).
 * Nhờ vậy khi đang cài ở một màn hình, màn hình khác thấy tiến độ thay vì một nút "Tải" thứ hai.
 * (Cài trùng giữa nhiều tab đã được chặn bằng khóa trong runUpdates của @/core/db.)
 */
const useInstallStore = create<InstallState>(() => ({ running: false }))
let running: Promise<void> | null = null

async function check(): Promise<UpdatePlanItem[]> {
  const plan = await planUpdates(await fetchManifest(), { only: DICT_PACKS })
  useInstallStore.setState({ plan })
  return plan
}

function install(): Promise<void> {
  if (running) return running // đang cài rồi: không bắt đầu lần thứ hai
  useInstallStore.setState({ running: true, error: undefined, progress: undefined })
  running = (async () => {
    try {
      const plan = await planUpdates(await fetchManifest(), { only: DICT_PACKS })
      // Gói Kanji nhỏ, cài trước để có thông tin Kanji sớm
      plan.sort((a, b) => (a.pack.id === KANJI_PACK ? -1 : 0) - (b.pack.id === KANJI_PACK ? -1 : 0))
      const res = await runUpdates(plan, (progress) => useInstallStore.setState({ progress }))
      clearSearchCache()
      useInstallStore.setState({
        running: false, plan: [], progress: undefined,
        error: res.failed.length ? res.failed.map((f) => `${f.pack}: ${f.error}`).join('\n') : undefined,
      })
    } catch (e) {
      useInstallStore.setState({ running: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      running = null
    }
  })()
  return running
}

/** Cài từ file .json.gz/.pack người dùng chọn (khi máy không có mạng). */
async function installFile(file: File) {
  if (running) return running
  useInstallStore.setState({ running: true, error: undefined })
  running = (async () => {
    try {
      await installPackFile(file, (progress) => useInstallStore.setState({ progress }))
      clearSearchCache()
      useInstallStore.setState({ running: false, progress: undefined })
    } catch (e) {
      useInstallStore.setState({ running: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      running = null
    }
  })()
  return running
}

/** Hook: kiểm tra bản mới và cài gói từ điển, có báo tiến độ. */
export function useDictInstaller() {
  const state = useInstallStore()
  return { ...state, check, install, installFile }
}
