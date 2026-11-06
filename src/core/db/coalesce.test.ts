// Kiểm tra gộp nhiều lần báo thay đổi thành một lần đọc lại (#12).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { coalesce } from './coalesce'

describe('coalesce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('nhiều lần gọi sát nhau chỉ chạy một lần, sau khoảng chờ', () => {
    const fn = vi.fn()
    const c = coalesce(fn, 100)
    c.call(); c.call(); c.call()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('thay đổi dồn dập liên tục vẫn chạy ít nhất mỗi maxWait', () => {
    const fn = vi.fn()
    const c = coalesce(fn, 100, 400)
    for (let t = 0; t < 1000; t += 50) { c.call(); vi.advanceTimersByTime(50) }
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('cancel bỏ lần đang chờ', () => {
    const fn = vi.fn()
    const c = coalesce(fn, 100)
    c.call(); c.cancel()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })
})
