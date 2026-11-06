/**
 * TRANG LUYỆN NGHE (module listening) — đường dẫn /learn/listening
 * Tab: Chép câu · Số đếm · Giờ · Ngày tháng. Mở thẳng một tab: /learn/listening?tab=time
 * Hướng dẫn: README.md
 */
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/design/components/Segmented'
import { useT } from '@/core/i18n'
import { S } from './strings'
import { Dictation } from './Dictation'
import { Drill } from './Drill'
import { ResetStats } from './components'
import { useJaVoice } from './lib/speech'

type Tab = 'sentence' | 'number' | 'time' | 'date'
const TABS: Tab[] = ['sentence', 'number', 'time', 'date']

export default function ListeningPage() {
  const t = useT(S)
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((x) => x === params.get('tab')) ?? 'sentence') as Tab
  const voice = useJaVoice()
  const canSpeak = voice.supported && voice.ready

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted">{t('subtitle')}</p>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Segmented<Tab> label={t('tabLabel')} value={tab} onChange={(v) => setParams(v === 'sentence' ? {} : { tab: v })}
            options={[
              { value: 'sentence', label: t('tabSentence') }, { value: 'number', label: t('tabNumber') },
              { value: 'time', label: t('tabTime') }, { value: 'date', label: t('tabDate') },
            ]} />
        </div>
      </div>

      {!canSpeak && (
        <p role="status" className="rounded-xl bg-bad/10 p-3 text-sm text-bad">{voice.supported ? t('noVoice') : t('noSpeech')}</p>
      )}

      {tab === 'sentence' ? <Dictation canSpeak={canSpeak} /> : <Drill key={tab} kind={tab} canSpeak={canSpeak} />}

      <div className="flex justify-end"><ResetStats /></div>
    </div>
  )
}
