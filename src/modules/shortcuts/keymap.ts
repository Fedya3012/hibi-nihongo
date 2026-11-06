/**
 * HỆ THỐNG PHÍM TẮT TÙY CHỈNH
 * ---------------------------
 * Mọi phím tắt đổi được đều khai báo ở bảng ACTIONS bên dưới (mỗi hành động có id, nhóm, phím mặc định).
 * Phím người dùng tự đổi lưu trong localStorage ('hibi-shortcuts'), chỉ lưu hành động đã đổi.
 *
 * Module khác dùng thế nào:
 *   import { actionFor, matches } from '@/modules/shortcuts/keymap'
 *   if (matches(e, 'review.undo')) ...           // phím vừa bấm có phải phím của "Hoàn tác" không
 *   const id = actionFor(e, 'anime')              // phím vừa bấm ứng với hành động nào trong nhóm
 *
 * Cách ghi phím (dạng chữ, để lưu và so sánh): "Ctrl+K", "Alt+1", "Space", "Enter", "Z", "?", "ArrowLeft".
 *   - Thứ tự cố định: Ctrl, Alt, Shift, rồi phím chính. Phím ⌘ trên Mac được coi như Ctrl.
 *   - Chữ cái luôn viết hoa ("Z"), bấm kèm Shift thì thành "Shift+Z".
 *   - Ký hiệu như "?" hay "+" đã gồm Shift sẵn nên không ghi Shift.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Group = 'global' | 'review' | 'anime' | 'manga'
type Label = { vi: string; en?: string; ja?: string }

export interface ActionDef {
  id: string
  group: Group
  defaults: string[]
  label: Label
}

const a = (id: string, defaults: string[], vi: string, en?: string, ja?: string): ActionDef => ({
  id, group: id.split('.')[0] as Group, defaults, label: { vi, en, ja },
})

/** Bảng mọi phím tắt đổi được. Thêm hành động mới: thêm một dòng vào CUỐI nhóm của nó. */
export const ACTIONS: ActionDef[] = [
  // Toàn app (dùng ở mọi trang)
  a('global.search', ['Ctrl+K', '/'], 'Mở ô tìm kiếm', 'Open search', '検索を開く'),
  a('global.help', ['?'], 'Xem bảng phím tắt', 'Show keyboard shortcuts', 'ショートカット一覧'),
  a('global.pomodoro', ['Alt+P'], 'Bắt đầu / tạm dừng Pomodoro', 'Start / pause Pomodoro', 'ポモドーロ開始・一時停止'),
  a('global.goToday', ['Alt+1'], 'Mở Hôm nay', 'Go to Today', '今日へ'),
  a('global.goLearn', ['Alt+2'], 'Mở Học', 'Go to Learn', '学習へ'),
  a('global.goReview', ['Alt+3'], 'Mở Ôn tập', 'Go to Review', '復習へ'),
  a('global.goImmersion', ['Alt+4'], 'Mở Immersion', 'Go to Immersion', 'イマージョンへ'),
  a('global.goMe', ['Alt+5'], 'Mở Tiến độ', 'Go to Progress', '進捗へ'),
  a('global.goDictionary', ['Alt+6'], 'Mở Từ điển', 'Go to Dictionary', '辞書へ'),
  a('global.goPomodoro', ['Alt+7'], 'Mở trang Pomodoro', 'Go to Pomodoro', 'ポモドーロへ'),
  a('global.goSettings', ['Alt+0'], 'Mở Cài đặt', 'Go to Settings', '設定へ'),

  // Ôn tập (trong lúc ôn thẻ)
  a('review.reveal', ['Space', 'Enter'], 'Lật thẻ / chấm mức gợi ý', 'Show answer / rate suggested', '答えを見る・推奨で評価'),
  a('review.again', ['1'], 'Quên (Again)', 'Again', 'もう一度'),
  a('review.hard', ['2'], 'Khó (Hard)', 'Hard', '難しい'),
  a('review.good', ['3'], 'Nhớ (Good)', 'Good', '正解'),
  a('review.easy', ['4'], 'Dễ (Easy)', 'Easy', '簡単'),
  a('review.undo', ['Z', 'Ctrl+Z'], 'Hoàn tác thẻ vừa chấm', 'Undo last rating', '元に戻す'),
  a('review.bury', ['B'], 'Để thẻ sang ngày mai', 'Bury card', 'カードを延期'),
  a('review.suspend', ['S'], 'Tạm ngưng thẻ', 'Suspend card', 'カードを保留'),
  a('review.replay', ['R'], 'Nghe lại', 'Replay audio', 'もう一度聞く'),
  a('review.exit', ['Escape'], 'Thoát buổi ôn', 'Exit session', '終了'),

  // Xem anime
  a('anime.play', ['Space', 'K'], 'Phát / dừng', 'Play / pause', '再生・一時停止'),
  a('anime.back5', ['ArrowLeft'], 'Lùi 5 giây', 'Back 5 seconds', '5秒戻る'),
  a('anime.fwd5', ['ArrowRight'], 'Tới 5 giây', 'Forward 5 seconds', '5秒進む'),
  a('anime.prevLine', ['A'], 'Câu trước', 'Previous line', '前のセリフ'),
  a('anime.nextLine', ['D'], 'Câu sau', 'Next line', '次のセリフ'),
  a('anime.repeat', ['S'], 'Nghe lại câu', 'Repeat line', 'セリフをもう一度'),
  a('anime.loop', ['L'], 'Lặp câu', 'Loop line', 'セリフをループ'),
  a('anime.ab', ['B'], 'Lặp đoạn A-B', 'A-B loop', 'A-Bループ'),
  a('anime.autoPause', ['P'], 'Bật/tắt tự dừng sau mỗi câu', 'Toggle auto-pause', '自動一時停止'),
  a('anime.subMode', ['H'], 'Đổi chế độ phụ đề', 'Cycle subtitle mode', '字幕モード切替'),
  a('anime.translation', ['T'], 'Hiện/ẩn bản dịch', 'Toggle translation', '翻訳の表示'),
  a('anime.furigana', ['R'], 'Hiện/ẩn furigana', 'Toggle furigana', 'ふりがなの表示'),
  a('anime.offsetMinus', ['Z'], 'Phụ đề sớm hơn 0,1 giây', 'Subtitles 0.1s earlier', '字幕を0.1秒早く'),
  a('anime.offsetPlus', ['X'], 'Phụ đề trễ hơn 0,1 giây', 'Subtitles 0.1s later', '字幕を0.1秒遅く'),
  a('anime.slower', ['['], 'Chậm lại', 'Slower', '遅く'),
  a('anime.faster', [']'], 'Nhanh lên', 'Faster', '速く'),
  a('anime.fullscreen', ['F'], 'Toàn màn hình', 'Fullscreen', '全画面'),
  a('anime.mine', ['C'], 'Tạo thẻ từ câu này', 'Make a card from this line', 'このセリフでカード作成'),

  // Đọc manga
  a('manga.left', ['ArrowLeft'], 'Lật sang trái', 'Turn left', '左へ'),
  a('manga.right', ['ArrowRight'], 'Lật sang phải', 'Turn right', '右へ'),
  a('manga.next', ['Space', 'PageDown'], 'Trang sau', 'Next page', '次のページ'),
  a('manga.prev', ['PageUp'], 'Trang trước', 'Previous page', '前のページ'),
  a('manga.first', ['Home'], 'Trang đầu', 'First page', '最初のページ'),
  a('manga.last', ['End'], 'Trang cuối', 'Last page', '最後のページ'),
  a('manga.zoomIn', ['+', '='], 'Phóng to', 'Zoom in', '拡大'),
  a('manga.zoomOut', ['-', '_'], 'Thu nhỏ', 'Zoom out', '縮小'),
  a('manga.zoomReset', ['0'], 'Về cỡ gốc', 'Reset zoom', '元のサイズ'),
  a('manga.double', ['D'], 'Một trang / hai trang', 'Single / double page', '単ページ・見開き'),
  a('manga.direction', ['R'], 'Đổi chiều đọc', 'Reading direction', '読む方向'),
  a('manga.mode', ['M'], 'Chế độ học / thư giãn', 'Study / chill mode', '学習・リラックス'),
  a('manga.bubble', ['N'], 'Ghi chú bong bóng thoại', 'Note a speech bubble', '吹き出しメモ'),
  a('manga.bookmark', ['B'], 'Đánh dấu trang', 'Bookmark page', 'しおり'),
  a('manga.fullscreen', ['F'], 'Toàn màn hình', 'Fullscreen', '全画面'),
  a('manga.close', ['Escape'], 'Đóng / thoát', 'Close / exit', '閉じる'),
]

export const GROUPS: { id: Group; label: Label }[] = [
  { id: 'global', label: { vi: 'Toàn app', en: 'Everywhere', ja: 'アプリ全体' } },
  { id: 'review', label: { vi: 'Ôn tập', en: 'Review', ja: '復習' } },
  { id: 'anime', label: { vi: 'Xem anime', en: 'Anime player', ja: 'アニメ' } },
  { id: 'manga', label: { vi: 'Đọc manga', en: 'Manga reader', ja: 'マンガ' } },
]

const byId = new Map(ACTIONS.map((x) => [x.id, x]))
export const actionDef = (id: string) => byId.get(id)

/** Chọn chữ theo ngôn ngữ giao diện, thiếu thì dùng tiếng Anh rồi tiếng Việt. */
export function pickLabel(l: Label, lang: string): string {
  if (lang === 'ja') return l.ja ?? l.en ?? l.vi
  if (lang === 'en') return l.en ?? l.vi
  return l.vi
}

// ---------- Phím người dùng tự đổi ----------

interface KeymapState {
  /** Chỉ chứa hành động đã đổi. Mảng rỗng = đã gỡ hết phím của hành động đó. */
  custom: Record<string, string[]>
  setKeys: (id: string, keys: string[]) => void
  resetAction: (id: string) => void
  resetAll: () => void
}

export const useKeymap = create<KeymapState>()(
  persist(
    (set) => ({
      custom: {},
      setKeys: (id, keys) => set((s) => {
        const def = byId.get(id)
        const same = def && def.defaults.length === keys.length && def.defaults.every((k, i) => k === keys[i])
        const custom = { ...s.custom }
        if (same) delete custom[id] // trùng mặc định thì không cần lưu
        else custom[id] = keys
        return { custom }
      }),
      resetAction: (id) => set((s) => {
        const custom = { ...s.custom }
        delete custom[id]
        return { custom }
      }),
      resetAll: () => set({ custom: {} }),
    }),
    { name: 'hibi-shortcuts' },
  ),
)

// Đổi phím ở tab này thì các tab khác đang mở cũng nhận ngay
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === 'hibi-shortcuts') void useKeymap.persist.rehydrate() })
}

/** Phím đang dùng của một hành động (đã đổi thì lấy bản đã đổi, chưa thì mặc định). */
export function keysFor(id: string, custom = useKeymap.getState().custom): string[] {
  return custom[id] ?? byId.get(id)?.defaults ?? []
}

// ---------- Đọc phím từ sự kiện bàn phím ----------

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead', 'Process', 'Unidentified', 'OS'])

/**
 * Sự kiện bàn phím → chữ như "Ctrl+K". Trả về '' nếu chỉ bấm phím bổ trợ (Ctrl, Shift...) hoặc đang gõ bộ gõ.
 * Khi giữ Ctrl/Alt, lấy chữ theo VỊ TRÍ phím (e.code), vì trên Mac Option+1 cho ra "¡" chứ không phải "1".
 */
export function comboOf(e: KeyboardEvent): string {
  if (e.isComposing || MODIFIER_KEYS.has(e.key)) return ''
  const ctrl = e.ctrlKey || e.metaKey
  let key = e.key
  if (ctrl || e.altKey) {
    const m = /^(?:Key([A-Z])|Digit(\d))$/.exec(e.code)
    if (m) key = m[1] ?? m[2]
  }
  if (key === ' ' || key === 'Spacebar') key = 'Space'
  else if (key === 'Esc') key = 'Escape'
  else if (key.length === 1) key = key.toUpperCase()
  // Shift chỉ ghi khi đi với chữ cái hoặc phím đặc biệt (Enter, mũi tên...). Ký hiệu như "?" đã gồm Shift.
  const showShift = e.shiftKey && (key.length > 1 || /[A-Z0-9]/.test(key))
  return [ctrl && 'Ctrl', e.altKey && 'Alt', showShift && 'Shift', key].filter(Boolean).join('+')
}

/** Phím có kèm Ctrl hoặc Alt (dùng được cả khi đang gõ chữ trong ô nhập). */
export const hasModifier = (combo: string) => /^(Ctrl|Alt)\+/.test(combo)

/** Phím vừa bấm có phải một phím của hành động `id` không. */
export function matches(e: KeyboardEvent, id: string): boolean {
  const c = comboOf(e)
  return !!c && keysFor(id).includes(c)
}

/** Phím vừa bấm ứng với hành động nào trong nhóm (hành động khai báo trước được ưu tiên). */
export function actionFor(e: KeyboardEvent, group: Group): string | undefined {
  const c = comboOf(e)
  if (!c) return undefined
  const { custom } = useKeymap.getState()
  return ACTIONS.find((x) => x.group === group && keysFor(x.id, custom).includes(c))?.id
}

/** Các hành động khác đang dùng chung phím `combo` mà có thể "đá" nhau (cùng nhóm, hoặc với nhóm Toàn app). */
export function conflictsOf(id: string, combo: string, custom = useKeymap.getState().custom): ActionDef[] {
  const me = byId.get(id)
  if (!me) return []
  return ACTIONS.filter((x) =>
    x.id !== id &&
    (x.group === me.group || x.group === 'global' || me.group === 'global') &&
    keysFor(x.id, custom).includes(combo),
  )
}

// ---------- Hiển thị ----------

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const PRETTY: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Escape: 'Esc', PageDown: 'PgDn', PageUp: 'PgUp', Backspace: '⌫', Delete: 'Del',
}

/** "Ctrl+K" → "Ctrl K" (Windows) hoặc "⌘K" (Mac), "ArrowLeft" → "←". */
export function formatCombo(combo: string): string {
  const parts = combo.split('+')
  // Phím chính có thể chính là "+", khi đó split để lại phần rỗng ở cuối
  const key = combo.endsWith('+') ? '+' : parts.pop()!
  const mods = combo.endsWith('+') ? parts.filter(Boolean) : parts
  const mac = isMac()
  const m = mods.map((x) => (mac ? ({ Ctrl: '⌘', Alt: '⌥', Shift: '⇧' } as Record<string, string>)[x] ?? x : x))
  const k = PRETTY[key] ?? key
  return mac ? m.join('') + k : [...m, k].join(' ')
}

/** Chuỗi cho thuộc tính aria-keyshortcuts (trình đọc màn hình). */
export function ariaCombo(combo: string): string {
  return combo.replace(/^Ctrl\+/, 'Control+')
}
