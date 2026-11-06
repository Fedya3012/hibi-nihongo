/**
 * SỔ CHUYẾN BAY (kv 'pomodoro:flights', có trong file sao lưu)
 * Mỗi lần hạ cánh thêm một vé. Hộ chiếu, sổ vé và thống kê đều đọc từ đây.
 */
import { useEffect, useState } from 'react'
import { kvGet, kvSet } from '@/core/db'
import type { Booking } from './store'

export const FLIGHTS_KEY = 'pomodoro:flights'
export const PASSPORT_KEY = 'pomodoro:passport'

export interface FlightRecord extends Booking {
  id: string
  landedAt: number
  /** Bay từ nước ngoài (có nhập cảnh + hải quan). */
  intl: boolean
  /** Số câu trả lời đúng ở quầy nhập cảnh / hải quan (nếu có). */
  immigration?: { correct: number; total: number }
  note?: string
}

export interface PassportInfo { name: string }

const CHANGED = 'pomodoro:flights-changed'

export async function getFlights(): Promise<FlightRecord[]> {
  return kvGet<FlightRecord[]>(FLIGHTS_KEY, [])
}

export async function addFlight(r: FlightRecord) {
  const list = await getFlights()
  if (list.some((x) => x.id === r.id)) return
  await kvSet(FLIGHTS_KEY, [...list, r])
  window.dispatchEvent(new Event(CHANGED))
}

export async function updateFlight(id: string, patch: Partial<FlightRecord>) {
  const list = await getFlights()
  await kvSet(FLIGHTS_KEY, list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  window.dispatchEvent(new Event(CHANGED))
}

/** Danh sách chuyến bay, tự cập nhật khi có chuyến mới / sửa ghi chú. */
export function useFlights(): FlightRecord[] | undefined {
  const [list, setList] = useState<FlightRecord[]>()
  useEffect(() => {
    const load = () => { void getFlights().then(setList) }
    load()
    window.addEventListener(CHANGED, load)
    return () => window.removeEventListener(CHANGED, load)
  }, [])
  return list
}

export async function getPassport(): Promise<PassportInfo> {
  return kvGet<PassportInfo>(PASSPORT_KEY, { name: '' })
}
export const savePassport = (p: PassportInfo) => kvSet(PASSPORT_KEY, p)
