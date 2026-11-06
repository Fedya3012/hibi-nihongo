/** Tính lại thành tích và ghép nội dung thông báo (nạp khi cần từ watcher.ts). */
import { currentLang, translate, type TFunction } from '@/core/i18n'
import { S, type Key } from '../strings'
import { rankOf } from './level'
import { syncAchievements } from './store'
import { rankName, tierKeyTitle } from './text'
import type { ShowToast } from './watcher'

export async function check(showToast: ShowToast) {
  const { fresh, levelUp, progress, prevLevel } = await syncAchievements()
  if (!fresh.length && !levelUp) return
  const lang = currentLang()
  const t: TFunction<Key> = (k, v) => translate(S, lang, k, v)
  const lines: string[] = []
  let head = ''
  if (levelUp) {
    head = t('toastLevel', { n: levelUp })
    const { rank } = rankOf(levelUp)
    // Vừa bước sang hạng mới thì báo chú cáo đổi hạng
    if (rank.id !== rankOf(prevLevel).rank.id) lines.push(t('toastRank', { name: `${rankName(t, rank)} ${rank.jp}` }))
  }
  const names = fresh.map((k) => tierKeyTitle(t, k)).filter((x): x is string => !!x)
  if (names.length) {
    if (!head) head = t('toastBadge', { name: names[0] })
    else lines.push(t('toastBadge', { name: names[0] }))
    if (names.length > 1) lines.push(`+ ${names.slice(1, 3).join(', ')}${names.length > 3 ? '…' : ''}`)
  }
  showToast(levelUp ? '🦊' : '🏅', head, lines, t('toastOpen'), progress.level.pct)
}

