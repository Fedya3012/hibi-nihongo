/**
 * LƯU VÀ ĐỌC DỮ LIỆU ÔN TẬP (qua kho dữ liệu chung @/core/db)
 * - Bảng srsCards: mọi thẻ. Bảng srsLogs: lịch sử từng lần ôn.
 * - Cài đặt ôn tập lưu trong kv với khóa "review:settings".
 * - Bảng srsMedia: ảnh, tiếng của thẻ, tách riêng để đọc thẻ nhanh (xem media.ts).
 * Mọi thứ được sao lưu cùng file sao lưu của app.
 */
import {
  get, getAll, getAllByIndex, put, putMany, transaction, promisify, kvGet, kvSet,
} from '@/core/db'
import { cardsWithSources, possibleDuplicates } from './bySource'
import { DAY, newSchedule, schedule, type SchedulerOptions } from './fsrs'
import { loadCardMedia, stripMedia, withMedia, writeCards } from './media'
import { newPerDayToday, type DueLoad } from './load'
import { activeVacation, dayKeyOf, getVacations } from './vacation'
import {
  CardState, DEFAULT_SETTINGS, type CardKind, type QuestionType, type Rating,
  type ReviewSettings, type SrsCard, type SrsLog,
} from './types'

const SETTINGS_KEY = 'review:settings'

export async function getSettings(): Promise<ReviewSettings> {
  const saved = await kvGet<Partial<ReviewSettings>>(SETTINGS_KEY, {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(patch: Partial<ReviewSettings>) {
  await kvSet(SETTINGS_KEY, { ...(await getSettings()), ...patch })
}

/** Thời điểm bắt đầu "hôm nay" (theo giờ bắt đầu ngày mới trong cài đặt). */
export function startOfStudyDay(now: number, dayStartHour: number): number {
  const d = new Date(now)
  d.setHours(dayStartHour, 0, 0, 0)
  if (d.getTime() > now) d.setDate(d.getDate() - 1)
  return d.getTime()
}

// ---------- Thẻ ----------

export interface NewCardInput {
  deck: string
  kind: CardKind
  front: string
  reading?: string
  meaning: string
  example?: string
  exampleMeaning?: string
  notes?: string
  /** Ảnh minh họa: data URL, hoặc Blob/File (tự nén thành JPEG ≤ 900px). */
  image?: string | Blob
  /** Ảnh mặt hỏi (thay cho chữ mặt trước), vd panel manga đã che chữ. Blob tự nén như `image`. */
  frontImage?: string | Blob
  /** Tiếng nói gốc: data URL, hoặc Blob (vd đoạn thoại anime ghi bằng MediaRecorder). */
  audio?: string | Blob
  tags?: string[]
  source?: { module: string; ref: string }
}

/** Nội dung thẻ sau khi đã xử lý ảnh (ảnh luôn là chuỗi data URL). */
type CleanInput = Omit<NewCardInput, 'image' | 'audio' | 'frontImage'> & { image?: string; audio?: string; frontImage?: string }

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Tạo thẻ mới từ nội dung (chưa lưu). */
export function buildCard(input: CleanInput, now = Date.now()): SrsCard {
  return {
    ...newSchedule(now),
    id: makeId(),
    createdAt: now,
    ...cleanInput(input),
  }
}

function cleanInput(input: CleanInput): CleanInput {
  const t = (s?: string) => (s && s.trim() ? s.trim() : undefined)
  return {
    image: input.image || undefined,
    frontImage: input.frontImage || undefined,
    audio: input.audio || undefined,
    deck: input.deck.trim() || 'Thẻ của tôi',
    kind: input.kind,
    front: input.front.trim(),
    meaning: input.meaning.trim(),
    reading: t(input.reading),
    example: t(input.example),
    exampleMeaning: t(input.exampleMeaning),
    notes: t(input.notes),
    tags: input.tags?.length ? input.tags : undefined,
    source: input.source,
  }
}

/**
 * Thêm nhiều thẻ. Bỏ qua thẻ trùng (cùng nguồn, hoặc cùng bộ + cùng mặt trước + cùng loại).
 * Trả về số thẻ thật sự được thêm.
 */
export async function addCards(inputs: NewCardInput[]): Promise<number> {
  const existing = await possibleDuplicates(inputs)
  const seen = new Set(existing.map(dupKey))
  const seenSrc = new Set(existing.filter((c) => c.source).map((c) => `${c.source!.module}:${c.source!.ref}`))
  const now = Date.now()
  const fresh: SrsCard[] = []
  const prepared = await Promise.all(inputs.map(prepareImage))
  prepared.forEach((input, i) => {
    const card = buildCard(input, now + i) // +i để thẻ mới giữ đúng thứ tự khi học
    const src = card.source ? `${card.source.module}:${card.source.ref}` : ''
    if (!card.front || !card.meaning || seen.has(dupKey(card)) || (src && seenSrc.has(src))) return
    seen.add(dupKey(card))
    if (src) seenSrc.add(src)
    fresh.push(card)
  })
  if (fresh.length) await writeCards(fresh)
  return fresh.length
}

/**
 * Gắn thêm nhãn cho các thẻ ĐÃ CÓ theo nguồn (vd giáo trình gắn nhãn "minna-5" cho từ đã thêm từ manga).
 * Trả về các nguồn đã có thẻ (dù thẻ đã có nhãn đó từ trước), để bên gọi biết không cần tạo thẻ mới.
 */
export async function tagCardsBySource(sources: { module: string; ref: string }[], tag: string): Promise<Set<string>> {
  const want = new Set(sources.map((s) => `${s.module}:${s.ref}`))
  const found = new Set<string>()
  if (!want.size) return found
  const existing = await cardsWithSources(sources)
  const changed: SrsCard[] = []
  for (const c of existing) {
    if (!c.source) continue
    const key = `${c.source.module}:${c.source.ref}`
    if (!want.has(key)) continue
    found.add(key)
    if (!c.tags?.includes(tag)) changed.push({ ...c, tags: [...(c.tags ?? []), tag] })
  }
  if (changed.length) await putMany('srsCards', changed)
  return found
}

/**
 * Đổi ảnh Blob/File thành data URL JPEG nhỏ gọn (cạnh dài ≤ 900px).
 * Lưu dạng chữ để ảnh đi kèm file sao lưu .json.
 */
export async function imageToDataUrl(img: Blob, maxSide = 900): Promise<string> {
  try {
    const bmp = await createImageBitmap(img)
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale)
    c.height = Math.round(bmp.height * scale)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    return c.toDataURL('image/jpeg', 0.85)
  } catch {
    // Không vẽ lại được (định dạng lạ): lưu nguyên file
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(r.error)
      r.readAsDataURL(img)
    })
  }
}

/** Đổi Blob bất kỳ (vd tiếng nói) thành data URL, để lưu trong thẻ và đi kèm file sao lưu. */
export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

async function prepareImage(input: NewCardInput): Promise<CleanInput> {
  const { image, audio, frontImage, ...rest } = input
  return {
    ...rest,
    image: !image || typeof image === 'string' ? image : await imageToDataUrl(image),
    frontImage: !frontImage || typeof frontImage === 'string' ? frontImage : await imageToDataUrl(frontImage),
    audio: !audio || typeof audio === 'string' ? audio : await blobToDataUrl(audio),
  }
}

/**
 * Gắn ảnh / tiếng nói vào thẻ ĐÃ CÓ theo nguồn (vd từ đã thêm từ Từ điển, nay lấy được cảnh anime).
 * Chỉ ghi đè phần được truyền vào. Trả về số thẻ được cập nhật.
 */
export async function attachMediaBySource(
  source: { module: string; ref: string },
  media: { image?: string | Blob; audio?: string | Blob },
): Promise<number> {
  const key = `${source.module}:${source.ref}`
  const cards = (await cardsWithSources([source])).filter((c) => c.source && `${c.source.module}:${c.source.ref}` === key)
  if (!cards.length) return 0
  const { image, audio } = await prepareImage({ deck: '', kind: 'vocab', front: '', meaning: '', ...media })
  const updated: SrsCard[] = []
  for (const c of cards) {
    const old = await loadCardMedia(c.id)
    updated.push({ ...c, image: image || old?.image, audio: audio || old?.audio, frontImage: old?.frontImage })
  }
  await writeCards(updated)
  return cards.length
}

const dupKey = (c: Pick<SrsCard, 'deck' | 'kind' | 'front'>) => `${c.deck}\u0000${c.kind}\u0000${c.front}`

/** Sửa nội dung thẻ (không đổi lịch ôn). */
// ---------- Đổi trạng thái thẻ (mọi hàm đều trả về "bản cũ" để hoàn tác được) ----------

/**
 * Bản chụp để hoàn tác: thẻ như trước khi đổi, và lịch sử ôn nếu thẻ bị xóa.
 * Gọi restoreSnapshot(snap) để trả lại y như cũ.
 */
export interface CardSnapshot {
  card: SrsCard
  logs?: SrsLog[]
}

async function change(id: string, fn: (c: SrsCard) => SrsCard): Promise<CardSnapshot | undefined> {
  const card = await get<SrsCard>('srsCards', id)
  if (!card) return undefined
  await put('srsCards', stripMedia(fn(card)))
  return { card }
}

/**
 * Sửa nội dung thẻ (không đổi lịch ôn). `input` là toàn bộ nội dung mới, kể cả ảnh/tiếng:
 * thiếu image/audio/frontImage nghĩa là bỏ ảnh/tiếng đó (form sửa thẻ đọc kèm ảnh/tiếng có sẵn).
 */
export async function updateCardContent(id: string, input: NewCardInput) {
  const clean = cleanInput(await prepareImage(input))
  const card = await get<SrsCard>('srsCards', id)
  if (!card) return undefined
  const before = await withMedia(card) // bản chụp đủ ảnh/tiếng, để hoàn tác trả lại đúng
  await writeCards([{ ...card, ...clean }])
  return { card: before }
}

export const setSuspended = (id: string, suspended: boolean) => change(id, (c) => ({ ...c, suspended }))

/** Chôn thẻ tới đầu "ngày học" kế tiếp. */
export async function buryCard(id: string) {
  const s = await getSettings()
  const until = startOfStudyDay(Date.now(), s.dayStartHour) + DAY
  return change(id, (c) => ({ ...c, buriedUntil: until }))
}

export const unburyCard = (id: string) => change(id, (c) => ({ ...c, buriedUntil: undefined }))

/** Bỏ nhãn "khó nhớ" và cho thẻ quay lại lịch ôn (thường dùng sau khi đã sửa thẻ cho dễ nhớ hơn). */
export const clearLeech = (id: string) =>
  change(id, (c) => ({ ...c, suspended: false, lapses: 0, tags: c.tags?.filter((t) => t !== LEECH_TAG) }))

/** Học lại từ đầu: đưa thẻ về trạng thái "mới". */
export const resetCard = (id: string) =>
  change(id, (c) => ({ ...c, ...newSchedule(Date.now()), lastReview: undefined, buriedUntil: undefined }))

/** Xóa thẻ, ảnh/tiếng và lịch sử ôn của nó. Trả về bản chụp để hoàn tác. */
export async function deleteCard(id: string): Promise<CardSnapshot | undefined> {
  return transaction(['srsCards', 'srsLogs', 'srsMedia'], 'readwrite', async (tx) => {
    const card = await promisify<SrsCard | undefined>(tx.objectStore('srsCards').get(id))
    if (!card) return undefined
    const media = await promisify<{ image?: string; audio?: string; frontImage?: string } | undefined>(tx.objectStore('srsMedia').get(id))
    const logs = tx.objectStore('srsLogs')
    const old = await promisify<SrsLog[]>(logs.index('by_card').getAll(id))
    tx.objectStore('srsCards').delete(id)
    tx.objectStore('srsMedia').delete(id)
    for (const l of old) logs.delete(l.id!)
    return { card: { ...card, image: media?.image, audio: media?.audio, frontImage: media?.frontImage }, logs: old }
  })
}

/** Hoàn tác: ghi lại thẻ (kèm ảnh/tiếng, và lịch sử nếu thẻ đã bị xóa) đúng như bản chụp. */
export async function restoreSnapshot(snap: CardSnapshot) {
  await writeCards([snap.card])
  if (snap.logs?.length) {
    await transaction('srsLogs', 'readwrite', (tx) => {
      for (const l of snap.logs ?? []) tx.objectStore('srsLogs').put(l)
    })
  }
}

export const isBuried = (c: SrsCard, now = Date.now()) => !!c.buriedUntil && c.buriedUntil > now
export const LEECH_TAG = 'leech'
export const isLeech = (c: SrsCard) => !!c.tags?.includes(LEECH_TAG)

export const allCards = () => getAll<SrsCard>('srsCards')

// ---------- Thống kê nhanh ----------

export interface DeckStats {
  deck: string
  total: number
  due: number // thẻ đã thuộc/đang học, đến hạn
  fresh: number // thẻ mới chưa học
  suspended: number
  buried: number
  leeches: number
}

export interface Overview {
  decks: DeckStats[]
  dueNow: number
  newAvailable: number // thẻ mới còn được học hôm nay (theo giới hạn mỗi ngày)
  reviewedToday: number
  newToday: number
  dueTomorrow: number
  learningLater: number // thẻ đang học, hẹn lại sau ít phút/giờ nữa trong hôm nay
}

/** Tổng quan cho trang Ôn tập và màn hình Hôm nay. */
export async function getOverview(now = Date.now()): Promise<Overview> {
  const [cards, settings, vacations] = await Promise.all([allCards(), getSettings(), getVacations()])
  const dayStart = startOfStudyDay(now, settings.dayStartHour)
  // Thẻ mới hôm nay: giảm vào ngày học nhẹ, bằng 0 khi đang nghỉ
  const newLimit = activeVacation(vacations, dayKeyOf(dayStart)) ? 0 : newPerDayToday(settings, dayStart)
  const todayLogs = await getAllByIndex<SrsLog>('srsLogs', 'by_time', IDBKeyRange.lowerBound(dayStart))
  const newToday = todayLogs.filter((l) => l.stateBefore === CardState.New).length
  const map = new Map<string, DeckStats>()
  let dueNow = 0
  let fresh = 0
  let dueTomorrow = 0
  let learningLater = 0
  for (const c of cards) {
    const s = map.get(c.deck) ?? { deck: c.deck, total: 0, due: 0, fresh: 0, suspended: 0, buried: 0, leeches: 0 }
    s.total++
    if (isLeech(c)) s.leeches++
    if (c.suspended) s.suspended++
    else if (isBuried(c, now)) s.buried++
    else if (c.state === CardState.New) { s.fresh++; fresh++ }
    else if (c.due <= now) { s.due++; dueNow++ }
    else if (c.state !== CardState.Review && c.due < dayStart + DAY) learningLater++
    else if (c.due < dayStart + 2 * DAY) dueTomorrow++
    map.set(c.deck, s)
  }
  return {
    decks: [...map.values()].sort((a, b) => a.deck.localeCompare(b.deck, 'vi')),
    dueNow,
    newAvailable: Math.min(fresh, Math.max(0, newLimit - newToday)),
    reviewedToday: todayLogs.length,
    newToday,
    dueTomorrow,
    learningLater,
  }
}

// ---------- Chấm thẻ và hoàn tác ----------

/** Thông tin để hoàn tác một lần chấm. */
export interface UndoEntry {
  before: SrsCard
  /** Thẻ sau khi chấm (để bảng tải trong buổi ôn trả lại đúng ngày cũ khi hoàn tác). */
  after?: SrsCard
  logId: number
}

/**
 * Chấm thẻ: tính lịch mới bằng FSRS, lưu thẻ + ghi lịch sử trong cùng một giao dịch
 * (mất điện giữa chừng cũng không bị lệch giữa thẻ và lịch sử).
 */
export async function rateCard(
  card: SrsCard, rating: Rating,
  opts: { settings: ReviewSettings; durationMs: number; question: QuestionType; load?: DueLoad | null },
): Promise<{ card: SrsCard; undo: UndoEntry; leech: boolean }> {
  const now = Date.now()
  const sched = schedule(card, rating, now, schedulerOptions(opts.settings, opts.load), card.id)
  // Thẻ đang hiện có thể đã kèm ảnh/tiếng: không ghi chúng vào srsCards (chúng nằm ở srsMedia)
  const updated: SrsCard = stripMedia({ ...card, ...sched, buriedUntil: undefined })
  // Thẻ khó nhớ: vừa quên thêm lần nữa và đã chạm ngưỡng
  const leech = sched.lapses > card.lapses && sched.lapses >= opts.settings.leechThreshold
  if (leech) {
    updated.tags = [...new Set([...(card.tags ?? []), LEECH_TAG])]
    if (opts.settings.leechAction === 'suspend') updated.suspended = true
  }
  const log: SrsLog = {
    cardId: card.id,
    rating,
    reviewedAt: now,
    stateBefore: card.state,
    elapsedDays: card.lastReview ? (now - card.lastReview) / DAY : 0,
    scheduledDays: (updated.due - now) / DAY,
    durationMs: Math.min(opts.durationMs, 5 * 60_000),
    question: opts.question,
  }
  const logId = await transaction(['srsCards', 'srsLogs'], 'readwrite', async (tx) => {
    tx.objectStore('srsCards').put(updated)
    return (await promisify(tx.objectStore('srsLogs').add(log))) as number
  })
  opts.load?.move(card, updated)
  return { card: updated, undo: { before: stripMedia(card), after: updated, logId }, leech }
}

/** Tùy chọn cho FSRS từ cài đặt: tham số riêng (nếu đã tối ưu) và dàn đều thẻ (nếu bật và có bảng tải). */
export function schedulerOptions(settings: ReviewSettings, load?: DueLoad | null): SchedulerOptions {
  return {
    retention: settings.retention,
    maxInterval: settings.maxInterval,
    weights: settings.weights,
    pickDay: settings.loadBalance && load ? load.picker() : null,
  }
}

/** Hoàn tác: trả thẻ về đúng như trước khi chấm và xóa dòng lịch sử. */
export async function undoRating(entry: UndoEntry) {
  await transaction(['srsCards', 'srsLogs'], 'readwrite', (tx) => {
    tx.objectStore('srsCards').put(entry.before)
    tx.objectStore('srsLogs').delete(entry.logId)
  })
}

export const logsOfCard = (id: string) => getAllByIndex<SrsLog>('srsLogs', 'by_card', id)

