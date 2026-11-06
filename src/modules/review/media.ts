/**
 * ẢNH VÀ TIẾNG CỦA THẺ (bảng srsMedia, tách khỏi srsCards)
 * --------------------------------------------------------
 * Trước đây ảnh, tiếng nằm thẳng trong thẻ dạng chữ rất dài, nên mỗi lần đọc danh sách thẻ
 * (ôn tập, Kho từ, tìm kiếm...) app phải kéo theo hàng MB ảnh, tiếng. Bây giờ:
 *   - srsCards chỉ giữ cờ `media` (vd { image: true, audio: true }).
 *   - Ảnh, tiếng nằm trong srsMedia (khóa = id thẻ), chỉ đọc khi cần hiện thẻ đó.
 *
 *   const full = await withMedia(card)        // thẻ kèm image / audio / frontImage
 *   const shown = useCardMedia(card)          // hook React, tự đọc khi đổi thẻ
 */
import { useEffect, useState } from 'react'
import { get, getAll, splitCardMedia, transaction, MEDIA_FIELDS, type CardMediaRecord, type MediaField } from '@/core/db'
import type { SrsCard } from './types'

/** Thẻ có ảnh / tiếng không (cả thẻ đã đọc kèm media lẫn thẻ chỉ có cờ). */
export const hasMedia = (c: SrsCard, f: MediaField) => !!(c[f] || c.media?.[f])

/** Bỏ phần ảnh/tiếng đã đọc kèm, giữ cờ: dùng trước khi ghi thẻ mà không đổi ảnh/tiếng. */
export function stripMedia(card: SrsCard): SrsCard {
  if (!MEDIA_FIELDS.some((f) => f in card)) return card
  const c = { ...card }
  for (const f of MEDIA_FIELDS) delete c[f]
  return c
}

export const loadCardMedia = (id: string) => get<CardMediaRecord>('srsMedia', id)

/**
 * Thẻ kèm ảnh/tiếng. Luôn có đủ 3 khóa image/audio/frontImage (có thể undefined), để khi ghi lại
 * bằng writeCards thì ảnh/tiếng được đặt lại đúng như bản này (dùng cho hoàn tác).
 */
export async function withMedia(card: SrsCard): Promise<SrsCard> {
  const m = card.media ? await loadCardMedia(card.id) : undefined
  return { ...card, image: m?.image, audio: m?.audio, frontImage: m?.frontImage }
}

/** Đọc kèm ảnh/tiếng cho nhiều thẻ (vd xuất Anki). */
export async function withMediaMany(cards: SrsCard[]): Promise<SrsCard[]> {
  if (!cards.some((c) => c.media)) return cards.map((c) => ({ ...c }))
  const all = new Map((await getAll<CardMediaRecord>('srsMedia')).map((m) => [m.id, m]))
  return cards.map((c) => {
    const m = all.get(c.id)
    return { ...c, image: m?.image, audio: m?.audio, frontImage: m?.frontImage }
  })
}

/**
 * Ghi thẻ. Thẻ nào có khóa image/audio/frontImage thì ảnh/tiếng được ghi (hoặc xóa) theo đúng giá trị đó
 * trong srsMedia; thẻ không có các khóa này thì giữ nguyên ảnh/tiếng đang có.
 */
export async function writeCards(cards: SrsCard[]): Promise<void> {
  if (!cards.length) return
  await transaction(['srsCards', 'srsMedia'], 'readwrite', (tx) => {
    const cs = tx.objectStore('srsCards')
    const ms = tx.objectStore('srsMedia')
    for (const card of cards) {
      const split = splitCardMedia(card)
      if (split.changed) {
        if (split.media) ms.put(split.media)
        else ms.delete(card.id)
      }
      cs.put(split.card)
    }
  })
}

/** Hook: thẻ kèm ảnh/tiếng. Trong lúc đang đọc trả về thẻ không kèm (hiện chữ trước, ảnh hiện sau). */
export function useCardMedia<T extends SrsCard | null | undefined>(card: T): T {
  const [loaded, setLoaded] = useState<{ id: string; m: CardMediaRecord | undefined } | null>(null)
  const id = card?.id
  const want = !!card?.media
  useEffect(() => {
    if (!id || !want) return
    let alive = true
    loadCardMedia(id).then((m) => { if (alive) setLoaded({ id, m }) }, () => {})
    return () => { alive = false }
  }, [id, want])
  if (!card || !want || loaded?.id !== card.id || !loaded.m) return card
  const m = loaded.m
  return { ...card, image: card.image ?? m.image, audio: card.audio ?? m.audio, frontImage: card.frontImage ?? m.frontImage } as T
}
