/**
 * GỘP NHIỀU LẦN GỌI SÁT NHAU THÀNH MỘT
 * Dùng cho việc đọc lại dữ liệu khi có thay đổi: một thao tác (vd bấm "Được" khi ôn) có thể ghi
 * vài bảng liên tiếp, mỗi lần ghi lại báo thay đổi. Thay vì đọc lại ngay mỗi lần, chờ `ms` mili giây
 * kể từ lần báo cuối rồi mới đọc một lần. Nếu thay đổi cứ dồn dập liên tục (vd đang gõ chữ được lưu
 * từng phím), vẫn chạy ít nhất một lần mỗi `maxWait` mili giây để màn hình không bị "đứng".
 *
 *   const c = coalesce(load, 100)
 *   c.call(); c.call(); c.call()   // load() chỉ chạy 1 lần, sau 100 ms
 *   c.cancel()                     // bỏ lần đang chờ (vd khi màn hình đóng)
 */
export function coalesce(fn: () => void, ms: number, maxWait = ms * 4): { call: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  let firstAt = 0
  const run = () => { timer = undefined; fn() }
  return {
    call() {
      const now = Date.now()
      if (timer === undefined) firstAt = now
      else clearTimeout(timer)
      timer = setTimeout(run, Math.max(0, Math.min(ms, firstAt + maxWait - now)))
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
    },
  }
}
