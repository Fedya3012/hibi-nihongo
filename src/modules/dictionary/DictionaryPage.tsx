/**
 * TRANG TỪ ĐIỂN (/dictionary)
 * - Tra từ: gõ Kanji, kana, romaji (taberu), tiếng Anh (eat) hoặc dạng đã chia (食べました)
 * - Phân tích câu: dán một câu tiếng Nhật, xem từng từ, bấm để tra
 * - Dữ liệu: tải/cập nhật từ điển offline, tùy chọn popup, ghi công nguồn dữ liệu
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/design/components/Card'
import { Segmented } from '@/design/components/Segmented'
import type { WordResult } from './types'
import { searchWords } from './lib/search'
import { useDictPacks } from './lib/packs'
import { headword } from './actions'
import { useDictPrefs } from './prefs'
import { warmUpTokenizer, useTokenizerStatus } from './tokenizer'
import { WordEntry } from './components/WordEntry'
import { PackSetup } from './components/PackSetup'
import { JapaneseText } from './components/JapaneseText'
import { SentenceBreakdown } from './components/SentenceBreakdown'
import { Furigana } from './components/Furigana'
import { openLookup } from './api'
import { HighlightSetting } from '@/modules/vocab/api'

type Tab = 'search' | 'sentence' | 'data'

export default function DictionaryPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'search'
  const setTab = (t: Tab) => setParams((p) => { p.set('tab', t); return p }, { replace: true })
  const packs = useDictPacks()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Từ điển</h1>
        <Segmented<Tab>
          label="Chức năng" value={tab} onChange={setTab}
          options={[{ value: 'search', label: 'Tra từ' }, { value: 'sentence', label: 'Phân tích câu' }, { value: 'data', label: 'Dữ liệu' }]}
        />
      </div>
      {tab !== 'data' && <PackSetup compact />}
      {tab === 'search' && packs.ready && <SearchTab />}
      {tab === 'sentence' && <SentenceTab />}
      {tab === 'data' && <DataTab />}
    </div>
  )
}

function SearchTab() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [results, setResults] = useState<WordResult[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  // Tìm sau khi ngừng gõ 200ms, và ghi từ khóa lên đường dẫn để quay lại được
  useEffect(() => {
    const t = window.setTimeout(async () => {
      setParams((p) => { if (q) p.set('q', q); else p.delete('q'); return p }, { replace: true })
      if (!q.trim()) { setResults(null); return }
      const r = await searchWords(q)
      setResults(r)
      setSelected(r[0]?.id ?? null)
    }, 200)
    return () => window.clearTimeout(t)
  }, [q]) // eslint-disable-line

  const current = results?.find((r) => r.id === selected)
  return (
    <div className="space-y-4">
      <input
        type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="食べる, たべる, taberu, eat, 食べました…" aria-label="Tra từ"
        className="jp min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-lg outline-none focus:border-primary"
      />
      {results && results.length === 0 && <p className="text-muted">Không tìm thấy từ nào.</p>}
      {results && results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
          <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible" aria-label="Kết quả">
            {results.map((r) => {
              const { word, reading } = headword(r.data)
              return (
                <li key={r.id} className="shrink-0">
                  <button
                    onClick={() => setSelected(r.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left transition ${r.id === selected ? 'bg-primary-soft' : 'hover:bg-surface-2'}`}
                  >
                    <span className="jp block text-lg leading-tight">{word}</span>
                    <span className="block max-w-56 truncate text-xs text-muted">
                      {word !== reading && <span className="jp">{reading} · </span>}{r.data.s[0]?.g[0]}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {current && <Card><WordEntry key={current.id} r={current} /></Card>}
        </div>
      )}
      {!results && <Tips />}
    </div>
  )
}

function Tips() {
  return (
    <Card className="space-y-2 text-sm text-muted">
      <p className="font-medium text-text">Mẹo tra từ</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Gõ romaji nếu chưa cài bàn phím tiếng Nhật: <b>taberu</b> → <span className="jp">たべる</span></li>
        <li>Dán thẳng dạng đã chia: <span className="jp">食べさせられた</span> → <span className="jp">食べる</span> (sai khiến ← bị động ← quá khứ)</li>
        <li>Tìm bằng tiếng Anh cho từ thông dụng: <b>eat</b>, <b>beautiful</b></li>
        <li>Mỗi chữ Kanji có kèm <b>âm Hán Việt</b>, ví dụ <span className="jp">食</span> = THỰC</li>
      </ul>
    </Card>
  )
}

const SAMPLE = '昨日、友達と駅前の新しいラーメン屋に行ってみたけど、すごく混んでいて食べられなかった。'

function SentenceTab() {
  const [text, setText] = useState(SAMPLE)
  const [shown, setShown] = useState(SAMPLE)
  const [furi, setFuri] = useState(true)
  const status = useTokenizerStatus()
  useEffect(() => { warmUpTokenizer() }, [])

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="jp-sentence">Dán câu hoặc đoạn văn tiếng Nhật</label>
        <textarea
          id="jp-sentence" value={text} onChange={(e) => setText(e.target.value)} rows={3}
          className="jp w-full rounded-xl border border-border bg-surface-2 p-3 outline-none focus:border-primary"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShown(text.trim())}
            className="min-h-11 rounded-xl bg-primary px-4 font-medium text-on-primary hover:opacity-90"
          >
            Phân tích
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={furi} onChange={(e) => setFuri(e.target.checked)} className="accent-[var(--primary)]" />
            Hiện furigana
          </label>
          {status.status === 'loading' && <span className="text-sm text-muted">Đang chuẩn bị bộ tách từ (lần đầu tải ~17 MB)…</span>}
          {status.status === 'error' && <span className="text-sm text-bad">Bộ tách từ lỗi: {status.error}</span>}
        </div>
      </Card>
      {shown && (
        <>
          <Card>
            <p className="mb-2 text-sm text-muted">Bấm vào từ để tra{useDictPrefs.getState().hover ? ' (hoặc di chuột qua)' : ''}:</p>
            <p className="text-2xl leading-loose"><JapaneseText text={shown} furigana={furi} /></p>
          </Card>
          <Card><SentenceBreakdown text={shown} /></Card>
        </>
      )}
    </div>
  )
}

function DataTab() {
  const prefs = useDictPrefs()
  return (
    <div className="space-y-4">
      <PackSetup />
      <Card className="space-y-3">
        <h2 className="font-semibold">Popup tra từ</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Trên máy tính, di chuột qua chữ là hiện nghĩa</p>
          <Segmented<'on' | 'off'>
            label="Di chuột để tra" value={prefs.hover ? 'on' : 'off'} onChange={(v) => prefs.set({ hover: v === 'on' })}
            options={[{ value: 'on', label: 'Bật' }, { value: 'off', label: 'Chỉ khi bấm' }]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Số nghĩa hiện trong popup</p>
          <Segmented<string>
            label="Số nghĩa" value={String(prefs.popupSenses)} onChange={(v) => prefs.set({ popupSenses: Number(v) })}
            options={['2', '3', '5', '99'].map((v) => ({ value: v, label: v === '99' ? 'Tất cả' : v }))}
          />
        </div>
        {/* Tô màu từ mới / đang học (tùy chọn chung của Kho từ, module vocab) */}
        <HighlightSetting />
        <p className="text-sm text-muted">
          Thử ngay: <span className="text-lg"><JapaneseText text="日本語を勉強しています" /></span>
        </p>
        <button
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => openLookup('先生に褒められて嬉しかった', { x: e.clientX, y: e.clientY + 12 })}
        >
          Thử popup tra cả câu (cách trình đọc manga dùng)
        </button>
      </Card>
      <Card className="space-y-2 text-sm text-muted">
        <h2 className="font-semibold text-text">Nguồn dữ liệu (đều là giấy phép mở)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>JMdict</b> và <b>KANJIDIC2</b> © Electronic Dictionary Research and Development Group (EDRDG), giấy phép CC BY-SA 4.0.</li>
          <li>Pitch accent và tần suất từ: dự án <b>Kanjium</b> của Uros O., CC BY-SA 4.0.</li>
          <li>Cấp JLPT: danh sách của <b>Jonathan Waller</b> (tanos.co.uk), CC BY; Kanji qua dự án kanji-data (MIT).</li>
          <li>Tách từ: <b>Kuromoji</b> (Apache-2.0) với từ điển <b>IPADIC</b>.</li>
          <li>
            Câu ví dụ: <a href="https://tatoeba.org" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Tatoeba</a>{' '}
            (tatoeba.org), giấy phép CC BY 2.0 FR. Mỗi câu có liên kết về câu gốc kèm tên người đóng góp.
            Furigana của câu được tạo tự động bằng Kuromoji nên đôi khi có thể sai.
          </li>
        </ul>
        <p>Nghĩa hiện là tiếng Anh vì chưa có từ điển Nhật–Việt nào giấy phép mở đủ lớn. Âm Hán Việt của Kanji lấy từ KANJIDIC2.</p>
        <p className="flex flex-wrap items-center gap-1">Ví dụ furigana: <Furigana text="日本語" reading="にほんご" className="text-base text-text" /></p>
      </Card>
    </div>
  )
}
