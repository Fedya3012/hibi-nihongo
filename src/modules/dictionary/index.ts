/**
 * API CÔNG KHAI CỦA MODULE TỪ ĐIỂN cho các module khác (manga, anime, kanji, ngữ pháp...).
 * Chỉ import từ đây: import { JapaneseText, searchWords } from '@/modules/dictionary'
 * Xem hướng dẫn: src/modules/dictionary/README.md
 */
export { JapaneseText, type JapaneseTextProps } from './components/JapaneseText'
export { WordPopup, type WordPopupProps } from './components/WordPopup'
export { WordEntry } from './components/WordEntry'
export { KanjiInfo } from './components/KanjiInfo'
export { Furigana } from './components/Furigana'
export { PitchAccent } from './components/PitchAccent'
export { PackSetup } from './components/PackSetup'
export { searchWords, lookupAt, getWord, getKanji, getKanjiList } from './lib/search'
export { deinflect } from './lib/deinflect'
export { romajiToHiragana, kataToHira, hiraToKata, furiganaParts, isKanji, hasJapanese } from './lib/kana'
export { useDictPacks } from './lib/packs'
export { tokenize, tokenizeRaw, warmUpTokenizer, useTokenizerStatus } from './tokenizer'
export { headword, addWordToReview, addKanjiToReview } from './actions'
export { WORD_PACK, KANJI_PACK } from './types'
export type { WordData, KanjiData, WordResult, Segment, Sense, KanjiForm, ReadingForm } from './types'
