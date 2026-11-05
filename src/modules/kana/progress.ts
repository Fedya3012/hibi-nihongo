/**
 * TIẾN ĐỘ HỌC KANA
 * ----------------
 * Lưu trong kho kv (được sao lưu cùng app), không cần bảng riêng:
 *   "kana:progress" → { [chữ]: { c: số lần đúng, w: số lần sai, wr: số lần viết đúng, last, srs } }
 *   "kana:settings" → { autoSrs: tự đưa chữ đã thuộc vào Ôn tập }
 *
 * Một chữ được coi là "đã thuộc" khi trả lời đúng ít nhất 3 lần và đúng từ 80% trở lên.
 */
import { kvGet, kvSet, useDbQuery } from '@/core/db'
import { addReviewCards } from '@/modules/review/api'
import { KANA_BY_CHAR, SCRIPT_LABEL, type Kana } from './data'

export interface KanaStat {
  c: number // đúng
  w: number // sai
  wr?: number // số lần viết đủ nét đúng
  last?: number // lần luyện gần nhất (Date.now())
  srs?: boolean // đã đưa vào Ôn tập
}
export type KanaProgress = Record<string, KanaStat>

export interface KanaSettings {
  autoSrs: boolean
}

const PROGRESS_KEY = 'kana:progress'
const SETTINGS_KEY = 'kana:settings'
const DEFAULT_SETTINGS: KanaSettings = { autoSrs: true }

export const getProgress = () => kvGet<KanaProgress>(PROGRESS_KEY, {})
export const getKanaSettings = async (): Promise<KanaSettings> => ({
  ...DEFAULT_SETTINGS,
  ...(await kvGet<Partial<KanaSettings>>(SETTINGS_KEY, {})),
})
export const saveKanaSettings = async (patch: Partial<KanaSettings>) =>
  kvSet(SETTINGS_KEY, { ...(await getKanaSettings()), ...patch })

export function useKanaProgress() {
  return useDbQuery(getProgress, [], ['kv']).data
}
export function useKanaSettings() {
  return useDbQuery(getKanaSettings, [], ['kv']).data
}

export type Level = 'new' | 'learning' | 'known'

export function levelOf(s: KanaStat | undefined): Level {
  if (!s || s.c + s.w === 0) return 'new'
  return s.c >= 3 && s.c / (s.c + s.w) >= 0.8 ? 'known' : 'learning'
}

/** Ghi kết quả một buổi luyện (nhiều chữ cùng lúc, một lần ghi). */
export async function recordResults(results: { char: string; ok: boolean }[]) {
  const p = await getProgress()
  const now = Date.now()
  for (const { char, ok } of results) {
    const s = p[char] ?? { c: 0, w: 0 }
    if (ok) s.c++
    else s.w++
    s.last = now
    p[char] = s
  }
  await kvSet(PROGRESS_KEY, p)
  return p
}

/** Ghi một lần viết đúng đủ nét. */
export async function recordWriting(char: string) {
  const p = await getProgress()
  const s = p[char] ?? { c: 0, w: 0 }
  s.wr = (s.wr ?? 0) + 1
  s.last = Date.now()
  p[char] = s
  await kvSet(PROGRESS_KEY, p)
}

/** Bộ thẻ trong Ôn tập: "Hiragana" hoặc "Katakana". */
export const deckOf = (k: Kana) => SCRIPT_LABEL[k.script]

/**
 * Đưa chữ vào Ôn tập (SRS). Không tạo trùng: thẻ có nguồn { module: 'kana', ref: chữ }.
 * Trả về số thẻ mới được thêm.
 */
export async function addKanaToSrs(chars: string[]): Promise<number> {
  const list = chars.map((c) => KANA_BY_CHAR.get(c)).filter((k): k is Kana => !!k)
  if (!list.length) return 0
  const added = await addReviewCards(
    list.map((k) => ({
      deck: deckOf(k),
      kind: 'vocab' as const,
      front: k.char,
      meaning: k.romaji,
      notes: `${SCRIPT_LABEL[k.script]} · hàng ${k.row}${k.alt.length ? ` · cũng gõ được: ${k.alt.join(', ')}` : ''}`,
      tags: ['kana', k.script],
      source: { module: 'kana', ref: k.char },
    })),
  )
  const p = await getProgress()
  for (const k of list) p[k.char] = { ...(p[k.char] ?? { c: 0, w: 0 }), srs: true }
  await kvSet(PROGRESS_KEY, p)
  return added
}
