/**
 * TRANG HIRAGANA & KATAKANA (module kana) — đường dẫn /learn/kana
 * 4 tab: Bảng chữ · Luyện viết · Nghe · Nhận diện nhanh.
 * Mở thẳng một tab: /learn/kana?tab=write (chart | write | listen | quick)
 * Tiến độ lưu trong kv "kana:progress"; chữ đã thuộc được đưa vào Ôn tập qua @/modules/review/api.
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/design/components/Segmented'
import { Chart } from './Chart'
import { Drill } from './Drill'
import { WritePractice } from './WritePractice'
import type { Script } from './data'

type Tab = 'chart' | 'write' | 'listen' | 'quick'
const TABS: Tab[] = ['chart', 'write', 'listen', 'quick']

export default function KanaPage() {
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('tab') as Tab | null
  const tab: Tab = fromUrl && TABS.includes(fromUrl) ? fromUrl : 'chart'
  const setTab = (t: Tab) => setParams(t === 'chart' ? {} : { tab: t }, { replace: true })
  const [script, setScript] = useState<Script>('hiragana')
  const [writeChar, setWriteChar] = useState<string | undefined>()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Hiragana &amp; Katakana <span className="jp ml-1 text-lg font-normal text-muted">ひらがな・カタカナ</span>
        </h1>
        <Segmented<Tab> label="Mục" value={tab} onChange={setTab}
          options={[
            { value: 'chart', label: 'Bảng chữ' },
            { value: 'write', label: 'Viết' },
            { value: 'listen', label: 'Nghe' },
            { value: 'quick', label: 'Nhanh' },
          ]} />
      </div>

      {tab === 'chart' && (
        <Chart script={script} onScript={setScript} onWrite={(c) => { setWriteChar(c); setTab('write') }} />
      )}
      {tab === 'write' && <WritePractice initialChar={writeChar} script={script} onScript={setScript} />}
      {tab === 'listen' && <Drill key="listen" mode="listen" />}
      {tab === 'quick' && <Drill key="quick" mode="quick" />}

      <p className="mt-8 text-xs text-muted">
        Thứ tự nét: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer" className="underline">KanjiVG</a>{' '}
        © Ulrich Apel, giấy phép CC BY-SA 3.0. Âm đọc: giọng tiếng Nhật có sẵn trong máy.
      </p>
    </div>
  )
}
