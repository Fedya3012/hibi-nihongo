/**
 * TRANG POMODORO (/pomodoro) = CHUYẾN BAY TẬP TRUNG TỚI NHẬT BẢN
 * Tab: Chuyến bay (đặt vé → sân bay → bay → tới nơi) · Hộ chiếu · Sổ vé · Hẹn giờ (Pomodoro cổ điển).
 * Thời gian tập trung = thời gian bay. Chỉ bay trong Nhật Bản, hoặc từ nước ngoài tới Nhật Bản.
 */
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/design/components/Segmented'
import { useFlight } from './flight/store'
import { ArrivalStep, BookStep, CheckInStep, GateStep, LandedStep, SecurityStep } from './flight/Airport'
import { InFlightStep } from './flight/InFlight'
import { LogbookTab, PassportTab } from './flight/Journal'
import { ClassicTimer } from './PomodoroPage'

type Tab = 'fly' | 'passport' | 'log' | 'timer'

function FlightFlow({ onPassport }: { onPassport: () => void }) {
  const status = useFlight((s) => s.status)
  switch (status) {
    case 'checkin': return <CheckInStep />
    case 'security': return <SecurityStep />
    case 'gate': return <GateStep />
    case 'flying': case 'paused': return <InFlightStep />
    case 'arrival': return <ArrivalStep />
    case 'landed': return <LandedStep onPassport={onPassport} />
    default: return <BookStep />
  }
}

export default function FlightPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'fly'
  const go = (t: Tab) => setParams(t === 'fly' ? {} : { tab: t }, { replace: true })
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Chuyến bay tập trung <span className="jp text-lg font-normal text-muted">集中フライト</span></h1>
          <p className="mt-1 text-muted">Chọn điểm đến ở Nhật Bản theo thời gian muốn học, làm thủ tục, rồi cất cánh. Hạ cánh là xong một phiên Pomodoro.</p>
        </div>
        <Segmented<Tab> label="Mục" value={tab} onChange={go}
          options={[{ value: 'fly', label: 'Chuyến bay' }, { value: 'passport', label: 'Hộ chiếu' }, { value: 'log', label: 'Sổ vé' }, { value: 'timer', label: 'Hẹn giờ' }]} />
      </div>
      {tab === 'fly' && <FlightFlow onPassport={() => go('passport')} />}
      {tab === 'passport' && <PassportTab />}
      {tab === 'log' && <LogbookTab />}
      {tab === 'timer' && <ClassicTimer />}
    </div>
  )
}
