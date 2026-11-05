/**
 * CẤU TRÚC ĐỀ THI THEO TỪNG CẤP (thời gian, số câu, cách tính điểm), mô phỏng theo đề JLPT từ 2020.
 *
 * Thời gian các buổi thi và thang điểm / điểm đỗ / điểm liệt là của kỳ thi JLPT thật
 * (jlpt.jp). Số câu từng dạng là gần đúng. Đọc hiểu gồm câu ngắn + bài đọc dài (data/passages.ts);
 * nghe gồm từ, câu ngắn + hội thoại (data/dialogues.ts). Xem README.md.
 *
 * Muốn đổi số câu một dạng: sửa số `n` bên dưới. Đổi giờ: sửa `minutes`.
 */
import type { GroupId, Level, PartId } from '../types'

export interface SectionFormat {
  id: string
  /** Tên buổi thi như trên đề thật. */
  title: string
  minutes: number
  parts: { part: PartId; n: number }[]
}

export interface GroupFormat { id: GroupId; parts: PartId[]; max: number; min: number }

export interface LevelFormat {
  level: Level
  sections: SectionFormat[]
  groups: GroupFormat[]
  /** Điểm đỗ (tổng). */
  pass: number
}

const LANG: PartId[] = ['kanji', 'writing', 'context', 'meaning', 'grammar', 'order']
const READ: PartId[] = ['reading', 'passage']
const LISTEN: PartId[] = ['listenWord', 'listenSentence', 'dialogue']

/** N5, N4: "Kiến thức ngôn ngữ + Đọc hiểu" gộp một nhóm 0–120, Nghe 0–60. */
const groupsLow: GroupFormat[] = [
  { id: 'langRead', parts: [...LANG, ...READ], max: 120, min: 38 },
  { id: 'listen', parts: LISTEN, max: 60, min: 19 },
]
/** N3, N2, N1: ba nhóm, mỗi nhóm 0–60, điểm liệt 19. */
const groupsHigh: GroupFormat[] = [
  { id: 'lang', parts: LANG, max: 60, min: 19 },
  { id: 'read', parts: READ, max: 60, min: 19 },
  { id: 'listen', parts: LISTEN, max: 60, min: 19 },
]

export const FORMATS: Record<Level, LevelFormat> = {
  5: {
    level: 5, pass: 80, groups: groupsLow,
    sections: [
      { id: 'vocab', title: '言語知識（文字・語彙）', minutes: 20, parts: [{ part: 'kanji', n: 7 }, { part: 'writing', n: 5 }, { part: 'context', n: 6 }, { part: 'meaning', n: 3 }] },
      { id: 'grammar', title: '言語知識（文法）・読解', minutes: 40, parts: [{ part: 'grammar', n: 9 }, { part: 'order', n: 4 }, { part: 'reading', n: 3 }, { part: 'passage', n: 4 }] },
      { id: 'listen', title: '聴解', minutes: 30, parts: [{ part: 'listenWord', n: 6 }, { part: 'listenSentence', n: 6 }, { part: 'dialogue', n: 4 }] },
    ],
  },
  4: {
    level: 4, pass: 90, groups: groupsLow,
    sections: [
      { id: 'vocab', title: '言語知識（文字・語彙）', minutes: 25, parts: [{ part: 'kanji', n: 7 }, { part: 'writing', n: 5 }, { part: 'context', n: 8 }, { part: 'meaning', n: 4 }] },
      { id: 'grammar', title: '言語知識（文法）・読解', minutes: 55, parts: [{ part: 'grammar', n: 13 }, { part: 'order', n: 4 }, { part: 'reading', n: 4 }, { part: 'passage', n: 4 }] },
      { id: 'listen', title: '聴解', minutes: 35, parts: [{ part: 'listenWord', n: 8 }, { part: 'listenSentence', n: 8 }, { part: 'dialogue', n: 4 }] },
    ],
  },
  3: {
    level: 3, pass: 95, groups: groupsHigh,
    sections: [
      { id: 'vocab', title: '言語知識（文字・語彙）', minutes: 30, parts: [{ part: 'kanji', n: 8 }, { part: 'writing', n: 6 }, { part: 'context', n: 11 }, { part: 'meaning', n: 5 }] },
      { id: 'grammar', title: '言語知識（文法）・読解', minutes: 70, parts: [{ part: 'grammar', n: 13 }, { part: 'order', n: 5 }, { part: 'reading', n: 6 }, { part: 'passage', n: 4 }] },
      { id: 'listen', title: '聴解', minutes: 40, parts: [{ part: 'listenWord', n: 8 }, { part: 'listenSentence', n: 8 }, { part: 'dialogue', n: 4 }] },
    ],
  },
  2: {
    level: 2, pass: 90, groups: groupsHigh,
    sections: [
      { id: 'lang', title: '言語知識（文字・語彙・文法）・読解', minutes: 105, parts: [
        { part: 'kanji', n: 5 }, { part: 'writing', n: 5 }, { part: 'context', n: 7 }, { part: 'meaning', n: 5 },
        { part: 'grammar', n: 12 }, { part: 'order', n: 5 }, { part: 'reading', n: 8 }, { part: 'passage', n: 4 },
      ] },
      { id: 'listen', title: '聴解', minutes: 50, parts: [{ part: 'listenWord', n: 10 }, { part: 'listenSentence', n: 10 }, { part: 'dialogue', n: 4 }] },
    ],
  },
  1: {
    level: 1, pass: 100, groups: groupsHigh,
    sections: [
      // N1 thật không có dạng 表記 (viết Kanji)
      { id: 'lang', title: '言語知識（文字・語彙・文法）・読解', minutes: 110, parts: [
        { part: 'kanji', n: 6 }, { part: 'context', n: 7 }, { part: 'meaning', n: 6 },
        { part: 'grammar', n: 10 }, { part: 'order', n: 5 }, { part: 'reading', n: 8 }, { part: 'passage', n: 4 },
      ] },
      { id: 'listen', title: '聴解', minutes: 55, parts: [{ part: 'listenWord', n: 10 }, { part: 'listenSentence', n: 10 }, { part: 'dialogue', n: 4 }] },
    ],
  },
}

export const LEVELS: Level[] = [5, 4, 3, 2, 1]

/** Đề rút gọn: khoảng 1/3 số câu và 1/3 thời gian. */
export function sectionsFor(level: Level, mini: boolean): SectionFormat[] {
  const f = FORMATS[level]
  if (!mini) return f.sections
  return f.sections.map((s) => ({
    ...s,
    minutes: Math.max(5, Math.ceil(s.minutes / 3)),
    parts: s.parts.map((p) => ({ ...p, n: Math.max(1, Math.ceil(p.n / 3)) })),
  }))
}

/** Đề bài của từng dạng câu, viết như trên đề thật (kèm nghĩa tiếng Việt trong strings.ts). */
export const PART_JP: Record<PartId, string> = {
  kanji: '＿＿のことばは ひらがなで どう かきますか。',
  writing: '＿＿のことばは どう かきますか。',
  context: '（　　）に なにを いれますか。',
  meaning: '＿＿のことばの いみに いちばん ちかいものを えらんで ください。',
  grammar: '（　　）に 何を 入れますか。',
  order: '★ に 入る ものは どれですか。',
  reading: 'つぎの 文を 読んで、いみに いちばん ちかいものを えらんで ください。',
  listenWord: 'ことばを きいて、ただしい かきかたを えらんで ください。',
  listenSentence: '文を きいて、いちばん いいものを えらんで ください。',
  passage: 'つぎの 文章を 読んで、しつもんに こたえて ください。',
  dialogue: 'はなしを きいて、しつもんに こたえて ください。',
}
