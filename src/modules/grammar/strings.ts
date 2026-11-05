/** Chữ giao diện của module Ngữ pháp (3 ngôn ngữ). Nội dung bài học (giải thích, nghĩa) chỉ có tiếng Việt. */
import { defineStrings } from '@/core/i18n'
import type { GrammarCat } from './types'

export const S = defineStrings({
  vi: {
    title: 'Ngữ pháp', tabList: 'Danh sách', tabPractice: 'Luyện tập', tabLabel: 'Mục',
    soon: 'sắp có', search: 'Lọc: mẫu, nghĩa, ví dụ…', allCats: 'Tất cả',
    learnedOf: 'Đã học {n}/{total} mẫu', inReviewN: '{n} mẫu trong Ôn tập',
    addNext: '+ {n} mẫu tiếp theo vào Ôn tập', added: 'Đã thêm {n} thẻ vào Ôn tập', nothingToAdd: 'Các mẫu này đã có trong Ôn tập',
    empty: 'Không có mẫu nào khớp.', loading: 'Đang tải…',
    back: '‹ Về danh sách', prev: '‹ Mẫu trước', next: 'Mẫu sau ›',
    form: 'Cách ghép', explain: 'Giải thích', notes: 'Lưu ý', examples: 'Ví dụ', related: 'Mẫu liên quan', textbooks: 'Trong giáo trình',
    lesson: '{book} bài {n}',
    markLearned: 'Đánh dấu đã hiểu', learned: '✓ Đã hiểu', addReview: '+ Ôn tập', inReview: '● Đã có trong Ôn tập', practiceThis: 'Luyện mẫu này',
    lookupHint: 'Bấm vào một cụm chữ để tra từ.', listen: 'Nghe đọc', translate: 'Nghĩa',
    pLevel: 'Cấp', pScope: 'Mẫu', pAll: 'Tất cả', pLearned: 'Đã học', pWeak: 'Hay sai', pCount: 'Số câu', pTypes: 'Dạng câu hỏi',
    tCloze: 'Điền chỗ trống', tOrder: 'Sắp xếp câu', tMeaning: 'Chọn nghĩa',
    start: 'Bắt đầu', noPoints: 'Chưa có mẫu nào phù hợp. Hãy chọn "Tất cả" hoặc đánh dấu vài mẫu đã học.',
    qCloze: 'Chọn phần đúng để điền vào chỗ trống', qOrder: 'Bấm các cụm theo đúng thứ tự', qMeaning: 'Mẫu này nghĩa là gì?',
    check: 'Kiểm tra', undo: 'Bỏ cụm cuối', right: 'Đúng rồi!', wrong: 'Chưa đúng', answerIs: 'Đáp án:', nextQ: 'Câu tiếp ›', finish: 'Xem kết quả',
    openPoint: 'Xem bài', result: 'Kết quả: {right}/{total} câu đúng', again: 'Luyện lại', toList: 'Về danh sách', wrongList: 'Nên xem lại',
    progressQ: 'Câu {i}/{n}', quit: 'Dừng',
    credit: 'Giải thích và câu ví dụ: Hibi Nihongo tự soạn. Số bài giáo trình chỉ để tham khảo, app không chứa nội dung sách.',
  },
  en: {
    title: 'Grammar', tabList: 'List', tabPractice: 'Practice', tabLabel: 'Section',
    soon: 'coming soon', search: 'Filter: pattern, meaning, example…', allCats: 'All',
    learnedOf: 'Learned {n}/{total} points', inReviewN: '{n} points in Review',
    addNext: '+ Next {n} points to Review', added: 'Added {n} cards to Review', nothingToAdd: 'These points are already in Review',
    empty: 'No matching points.', loading: 'Loading…',
    back: '‹ Back to list', prev: '‹ Previous', next: 'Next ›',
    form: 'Formation', explain: 'Explanation', notes: 'Notes', examples: 'Examples', related: 'Related', textbooks: 'In textbooks',
    lesson: '{book} lesson {n}',
    markLearned: 'Mark as understood', learned: '✓ Understood', addReview: '+ Review', inReview: '● In Review', practiceThis: 'Practice this',
    lookupHint: 'Click a phrase to look it up.', listen: 'Listen', translate: 'Meaning',
    pLevel: 'Level', pScope: 'Points', pAll: 'All', pLearned: 'Learned', pWeak: 'Often wrong', pCount: 'Questions', pTypes: 'Question types',
    tCloze: 'Fill the blank', tOrder: 'Sentence order', tMeaning: 'Meaning',
    start: 'Start', noPoints: 'No matching points. Choose "All" or mark some points as learned.',
    qCloze: 'Choose the part that fills the blank', qOrder: 'Tap the phrases in the right order', qMeaning: 'What does this pattern mean?',
    check: 'Check', undo: 'Remove last', right: 'Correct!', wrong: 'Not quite', answerIs: 'Answer:', nextQ: 'Next ›', finish: 'See results',
    openPoint: 'Open lesson', result: 'Score: {right}/{total}', again: 'Practice again', toList: 'Back to list', wrongList: 'Worth reviewing',
    progressQ: 'Question {i}/{n}', quit: 'Stop',
    credit: 'Explanations and examples written by Hibi Nihongo. Textbook lesson numbers are for reference only; no book content is included.',
  },
  ja: {
    title: '文法', tabList: '一覧', tabPractice: '練習', tabLabel: 'メニュー',
    soon: '準備中', search: '絞り込み：文型・意味・例文…', allCats: 'すべて',
    learnedOf: '{total}項目中{n}項目習得', inReviewN: '復習に{n}項目',
    addNext: '次の{n}項目を復習に追加', added: '復習に{n}枚追加しました', nothingToAdd: 'すでに復習に入っています',
    empty: '該当する項目がありません。', loading: '読み込み中…',
    back: '‹ 一覧に戻る', prev: '‹ 前へ', next: '次へ ›',
    form: '接続', explain: '解説', notes: '注意', examples: '例文', related: '関連項目', textbooks: '教科書',
    lesson: '{book} 第{n}課',
    markLearned: '理解した', learned: '✓ 理解済み', addReview: '+ 復習', inReview: '● 復習に追加済み', practiceThis: 'この文型を練習',
    lookupHint: '語句をクリックすると辞書が開きます。', listen: '読み上げ', translate: '意味',
    pLevel: 'レベル', pScope: '対象', pAll: 'すべて', pLearned: '習得済み', pWeak: '苦手', pCount: '問題数', pTypes: '問題の形式',
    tCloze: '穴埋め', tOrder: '並べ替え', tMeaning: '意味を選ぶ',
    start: '開始', check: '確認', undo: '一つ戻す', right: '正解！', wrong: '不正解', answerIs: '答え：', nextQ: '次へ ›', finish: '結果を見る',
    openPoint: '解説を見る', result: '結果：{total}問中{right}問正解', again: 'もう一度', toList: '一覧へ', wrongList: '見直したい項目',
    progressQ: '{i}/{n}問', quit: 'やめる',
  },
})

export const CAT_LABEL: Record<GrammarCat, { vi: string; en: string; ja: string }> = {
  particle: { vi: 'Trợ từ', en: 'Particles', ja: '助詞' },
  verb: { vi: 'Động từ, thể', en: 'Verb forms', ja: '動詞・活用' },
  adjective: { vi: 'Tính từ', en: 'Adjectives', ja: '形容詞' },
  connect: { vi: 'Nối câu', en: 'Connecting clauses', ja: '接続' },
  ending: { vi: 'Cuối câu, suy đoán', en: 'Sentence endings', ja: '文末表現' },
  compare: { vi: 'So sánh', en: 'Comparison', ja: '比較' },
  demonstrative: { vi: 'Chỉ định, hỏi', en: 'Demonstratives', ja: '指示詞' },
  expression: { vi: 'Mẫu khác', en: 'Other expressions', ja: 'その他' },
}

/** Tên sách cho mã trong `lessons`. Sách mới: thêm một dòng. */
export const BOOK_NAME: Record<string, string> = {
  minna: 'Minna no Nihongo',
  genki: 'Genki',
}
