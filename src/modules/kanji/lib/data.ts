/**
 * DỮ LIỆU KANJI: đọc từ 2 gói nội dung trên máy (IndexedDB, chạy offline)
 *  - `kanjidic`    (của module Từ điển): âm On/Kun, âm Hán Việt, nghĩa, số nét, JLPT, bộ thủ
 *  - `kanji-study` (của module này): nét viết KanjiVG, thành phần, từ ví dụ, danh sách JLPT/bộ thủ
 * và câu chuyện ghi nhớ tự soạn trong data/stories.ts.
 */
import { useState } from 'react'
import {
  fetchManifest, getItem, listPacks, planUpdates, runUpdates, useDbQuery,
  type Progress, type UpdatePlanItem,
} from '@/core/db'
import { getKanji, KANJI_PACK, type KanjiData } from '@/modules/dictionary'
import { STORIES, type Story } from '../data/stories'

export const STUDY_PACK = 'kanji-study'
export const KANJI_PACKS = [KANJI_PACK, STUDY_PACK]

/** Một thành phần của chữ (theo KanjiVG). s = chỉ số các nét, r = 1 nếu là bộ thủ. */
export interface Component { e: string; s: number[]; r?: 1; d?: 1 }
/** Từ ví dụ: [id JMdict, chữ viết, cách đọc, nghĩa tiếng Anh, cấp JLPT?] */
export type ExampleWord = [id: string, word: string, reading: string, gloss: string, jlpt?: number]

export interface StudyData {
  p: string[] // các nét (đường SVG trong khung 109×109) theo đúng thứ tự viết
  c?: Component[]
  w?: ExampleWord[]
}

export interface StudyIndex {
  jlpt: Record<string, string> // '5' → '日一人…' (chuỗi các chữ)
  rad: Record<string, string> // số bộ thủ → các chữ thuộc bộ đó
  joyo: string // chữ Jōyō không có cấp JLPT
}

/** Tất cả những gì cần để hiện một chữ. */
export interface KanjiFull {
  char: string
  dic?: KanjiData
  study?: StudyData
  story?: Story
}

const cache = new Map<string, Promise<StudyData | undefined>>()
export function getStudy(char: string): Promise<StudyData | undefined> {
  let p = cache.get(char)
  if (!p) {
    p = getItem<StudyData>(STUDY_PACK, char).then((it) => it?.data)
    cache.set(char, p)
    p.catch(() => cache.delete(char))
  }
  return p
}

export async function getKanjiFull(char: string): Promise<KanjiFull> {
  const [dic, study] = await Promise.all([getKanji(char), getStudy(char)])
  return { char, dic, study, story: STORIES[char] }
}

let indexPromise: Promise<StudyIndex | undefined> | null = null
export function getStudyIndex(): Promise<StudyIndex | undefined> {
  if (!indexPromise) {
    indexPromise = getItem<StudyIndex>(STUDY_PACK, '_index').then((it) => it?.data)
    indexPromise.then((d) => { if (!d) indexPromise = null }, () => { indexPromise = null })
  }
  return indexPromise
}

/** Hook: thông tin đầy đủ một chữ (tự đọc lại khi gói được cài/cập nhật). */
export function useKanjiFull(char: string | undefined) {
  return useDbQuery(() => (char ? getKanjiFull(char) : Promise.resolve(undefined)), [char], ['packs'])
}

export function useStudyIndex() {
  return useDbQuery(() => getStudyIndex(), [], ['packs']).data
}

/** Thông tin KANJIDIC cho nhiều chữ (danh sách, lưới). */
export function useKanjiDicMany(chars: string) {
  return useDbQuery(async () => {
    const list = [...chars]
    const items = await Promise.all(list.map((c) => getKanji(c)))
    return new Map(list.map((c, i) => [c, items[i]]))
  }, [chars], ['packs']).data
}

// ---------------------------------------------------------------------------
// Cài / cập nhật dữ liệu Kanji
// ---------------------------------------------------------------------------

/** Hook: hai gói cần cho module đã sẵn sàng chưa. */
export function useKanjiPacks() {
  const { data, loading } = useDbQuery(() => listPacks(), [], ['packs'])
  const ready = (id: string) => data?.find((p) => p.id === id)?.status === 'ready'
  return { loading, ready: ready(KANJI_PACK) && ready(STUDY_PACK), study: data?.find((p) => p.id === STUDY_PACK) }
}

export function useKanjiInstaller() {
  const [state, setState] = useState<{ running: boolean; progress?: Progress; error?: string; plan?: UpdatePlanItem[] }>({ running: false })

  async function check() {
    const plan = await planUpdates(await fetchManifest(), { only: KANJI_PACKS })
    setState((s) => ({ ...s, plan }))
    return plan
  }

  async function install() {
    setState({ running: true })
    try {
      const plan = await planUpdates(await fetchManifest(), { only: KANJI_PACKS })
      const res = await runUpdates(plan, (progress) => setState((s) => ({ ...s, progress })))
      cache.clear()
      indexPromise = null
      setState({ running: false, plan: [], error: res.failed.length ? res.failed.map((f) => `${f.pack}: ${f.error}`).join('\n') : undefined })
    } catch (e) {
      setState({ running: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return { ...state, check, install }
}

// ---------------------------------------------------------------------------
// Tiện ích hiển thị
// ---------------------------------------------------------------------------

/** "た.べる" → "た(べる)" ; "-び" giữ nguyên. Dấu "." trong KANJIDIC tách phần okurigana. */
export const formatKun = (k: string) => (k.includes('.') ? k.replace('.', '(') + ')' : k)

/** Nghĩa ngắn để hiện trong danh sách: ưu tiên nghĩa tiếng Việt tự soạn, không có thì nghĩa tiếng Anh. */
export function shortMeaning(char: string, d?: KanjiData): string {
  return STORIES[char]?.v ?? d?.m?.slice(0, 2).join(', ') ?? ''
}

/** Âm Hán Việt in hoa: "THỰC" */
export const hanViet = (d?: KanjiData) => d?.hv?.[0]?.toUpperCase() ?? ''

/**
 * Tách câu có furigana dạng "{漢字|かんじ}" thành các mảnh để hiện bằng <ruby>.
 * Trả về [chữ, cách đọc?][]
 */
export function parseFurigana(s: string): [string, string?][] {
  const out: [string, string?][] = []
  const re = /\{([^|}]+)\|([^}]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push([s.slice(last, m.index)])
    out.push([m[1], m[2]])
    last = m.index + m[0].length
  }
  if (last < s.length) out.push([s.slice(last)])
  return out
}

/** Câu không có furigana (để tra từ, đọc to, đưa vào thẻ ôn). */
export const plainSentence = (s: string) => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1')
