/** Tiện ích ngẫu nhiên dùng chung trong module. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Đặt đáp án đúng vào một vị trí ngẫu nhiên trong 4 lựa chọn. Trả về null nếu thiếu đáp án sai. */
export function withAnswer(right: string, wrong: string[]): { options: string[]; answer: number } | null {
  const uniq = [...new Set(wrong.filter((w) => w && w !== right))].slice(0, 3)
  if (uniq.length < 3) return null
  const options = shuffle([right, ...uniq])
  return { options, answer: options.indexOf(right) }
}

/** Sắp danh sách theo độ dài gần với `target` nhất (sau khi xáo, để mỗi lần mỗi khác). */
export function byClosestLength<T>(list: T[], target: number, len: (x: T) => number): T[] {
  return shuffle(list).sort((a, b) => Math.abs(len(a) - target) - Math.abs(len(b) - target))
}
