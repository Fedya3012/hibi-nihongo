/**
 * NHẬP GÓI ANKI VÀO ÔN TẬP
 * Ghép các bước: đọc gói (read.ts) → đổi ghi chú thành thẻ (convert.ts) → lưu vào bảng srsCards.
 */
import { getAll, putMany } from '@/core/db'
import { blobToDataUrl, buildCard, imageToDataUrl } from '../store'
import type { CardKind, SrsCard } from '../types'
import { convertNote, convertSchedule, mainCard, HIBI_NOTE_TYPE, type ConvertedNote, type Target } from './convert'
import type { AnkiNote, AnkiPackage } from './read'

/** Cách nhập một loại ghi chú: trường nào vào ô nào, và là loại thẻ gì. */
export interface TypePlan {
  include: boolean
  kind: CardKind
  mapping: Target[]
}

export interface ImportOptions {
  plans: Map<number, TypePlan>
  /** Giữ tiến độ học từ Anki (hạn ôn, độ thuộc, số lần quên). Tắt = mọi thẻ thành thẻ mới. */
  keepProgress: boolean
  /** Giữ tên bộ của Anki. Nếu điền, mọi thẻ vào bộ này. */
  deckName?: string
  includeImages: boolean
  /** Nhập kèm tiếng ([sound:…]) để phát ở mặt đáp án. */
  includeAudio?: boolean
  /** Giữ trạng thái "tạm ẩn" của Anki. */
  keepSuspended: boolean
}

export interface ImportResult {
  added: number
  duplicates: number
  empty: number // ghi chú thiếu chữ hoặc nghĩa nên bỏ qua
  images: number
  audio: number
}

/** File tiếng lớn hơn mức này bị bỏ qua để bản sao lưu .json không quá nặng. */
const MAX_AUDIO_BYTES = 2_000_000

export const deckOf = (pkg: AnkiPackage, note: AnkiNote) => pkg.decks.get(mainCard(note).deckId) ?? 'Anki'

export function previewNote(pkg: AnkiPackage, note: AnkiNote, plan: TypePlan): ConvertedNote {
  const nt = pkg.noteTypes.get(note.typeId)
  return convertNote(note, plan.mapping, { hibi: !!nt?.name.startsWith(HIBI_NOTE_TYPE) })
}

const dupKey = (c: Pick<SrsCard, 'deck' | 'kind' | 'front'>) => `${c.deck}\u0000${c.kind}\u0000${c.front}`

export async function importAnki(
  pkg: AnkiPackage, opts: ImportOptions, onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const existing = await getAll<SrsCard>('srsCards')
  const seen = new Set(existing.map(dupKey))
  const seenSrc = new Set(existing.filter((c) => c.source).map((c) => `${c.source!.module}:${c.source!.ref}`))
  const now = Date.now()
  const result: ImportResult = { added: 0, duplicates: 0, empty: 0, images: 0, audio: 0 }
  const notes = pkg.notes.filter((n) => opts.plans.get(n.typeId)?.include)
  const BATCH = 300 // lưu từng đợt để bộ thẻ lớn (hàng chục nghìn thẻ) không làm treo trang

  for (let start = 0; start < notes.length; start += BATCH) {
    const chunk = notes.slice(start, start + BATCH)
    const converted = chunk.map((n) => ({ note: n, plan: opts.plans.get(n.typeId)!, c: previewNote(pkg, n, opts.plans.get(n.typeId)!) }))
    const names = converted.flatMap((x) => [
      ...(opts.includeImages && x.c.imageName ? [x.c.imageName] : []),
      ...(opts.includeAudio && x.c.audioName ? [x.c.audioName] : []),
    ]).filter((x) => pkg.mediaNames.has(x))
    const media = names.length ? pkg.readMedia(names) : new Map<string, Blob>()
    const fresh: SrsCard[] = []
    for (const [i, { note, plan, c }] of converted.entries()) {
      if (!c.front || !c.meaning) { result.empty++; continue }
      const deck = opts.deckName?.trim() || deckOf(pkg, note)
      const kind = c.kind ?? plan.kind
      const source = { module: 'anki', ref: note.guid }
      const card = buildCard({
        deck, kind, front: c.front, reading: c.reading, meaning: c.meaning, example: c.example,
        exampleMeaning: c.exampleMeaning, notes: c.notes,
        tags: [...new Set(['anki', ...note.tags.filter((t) => t.toLowerCase() !== 'leech' || opts.keepProgress)])],
        source,
      }, now + start + i) // +i để thẻ mới giữ đúng thứ tự như trong Anki
      if (seen.has(dupKey(card)) || seenSrc.has(`anki:${note.guid}`)) { result.duplicates++; continue }
      seen.add(dupKey(card))
      seenSrc.add(`anki:${note.guid}`)

      if (opts.keepProgress) Object.assign(card, convertSchedule(mainCard(note), pkg.createdSec, now))
      if (opts.keepSuspended && note.cards.every((x) => x.queue === -1)) card.suspended = true
      const blob = opts.includeImages && c.imageName ? media.get(c.imageName) : undefined
      if (blob && blob.type.startsWith('image/')) {
        try { card.image = await imageToDataUrl(blob); result.images++ } catch { /* ảnh hỏng: bỏ qua ảnh, vẫn giữ thẻ */ }
      }
      const sound = opts.includeAudio && c.audioName ? media.get(c.audioName) : undefined
      if (sound && sound.type.startsWith('audio/') && sound.size <= MAX_AUDIO_BYTES) {
        try { card.audio = await blobToDataUrl(sound); result.audio++ } catch { /* tiếng hỏng: bỏ qua, vẫn giữ thẻ */ }
      }
      fresh.push(card)
    }
    if (fresh.length) await putMany('srsCards', fresh)
    result.added += fresh.length
    onProgress?.(Math.min(notes.length, start + BATCH), notes.length)
  }
  return result
}
