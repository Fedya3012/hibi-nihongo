/**
 * Tên và mô tả các module trên thanh điều hướng, theo ngôn ngữ giao diện.
 * Tiếng Việt lấy thẳng từ src/modules/registry.ts (title, description), nên module mới
 * không cần thêm gì ở đây; muốn có bản tiếng Anh/Nhật thì thêm một dòng theo id của module.
 */
import { useCallback } from 'react'
import type { AppModule } from '@/modules/registry'
import { FALLBACK, useLang, type Lang } from './index'

type Text = { title: string; description?: string }

const MODULE_TEXT: Record<'en' | 'ja', Record<string, Text>> = {
  en: {
    today: { title: 'Today', description: 'Home: continue where you left off, quick review, streak, daily goal' },
    review: { title: 'Review', description: 'SRS flashcards (FSRS), Again/Hard/Good/Easy, several question types' },
    immersion: { title: 'Immersion', description: 'Read manga from your files and watch anime with clickable subtitles' },
    manga: { title: 'Manga reader', description: 'CBZ, CBR, PDF, image folders; zoom, two pages, right-to-left, remembers your page' },
    anime: { title: 'Anime player', description: 'Video + .srt/.ass/.vtt subtitles, click to look up, comprehension score, cards from subtitles, shadowing' },
    learn: { title: 'Learn', description: 'Kana, Kanji, Grammar, Textbooks' },
    me: { title: 'Me', description: 'Progress, heatmap, history, summaries' },
    kana: { title: 'Hiragana & Katakana', description: 'Charts, writing practice, listening, quick recognition' },
    kanji: { title: 'Kanji', description: 'By JLPT level and radical, mnemonics, stroke order, on/kun, examples, graded writing' },
    dictionary: { title: 'Dictionary', description: 'Offline JMdict/KANJIDIC, shared word lookup popup' },
    grammar: { title: 'Grammar', description: 'Explanations, drills, add to SRS' },
    textbook: { title: 'Textbooks', description: 'Minna no Nihongo and Genki lesson outlines; your own notes and audio' },
    roadmap: { title: 'Roadmap', description: 'N5→N1 roadmap, by series, customisable; onboarding' },
    assistant: { title: 'Assistant', description: 'Fox AI assistant, sentence correction, role-play' },
    settings: { title: 'Settings', description: 'Appearance, text size, furigana, sound, language' },
  },
  ja: {
    today: { title: '今日', description: 'ホーム：続きから、クイック復習、連続記録、今日の目標' },
    review: { title: '復習', description: 'SRSフラッシュカード（FSRS）、もう一度／難しい／正解／簡単' },
    immersion: { title: '多読・多聴', description: '自分のファイルで漫画を読み、字幕付きでアニメを見る' },
    manga: { title: '漫画リーダー', description: 'CBZ・CBR・PDF・画像フォルダ、ズーム、見開き、右→左、ページを記憶' },
    anime: { title: 'アニメプレーヤー', description: '動画＋字幕（.srt/.ass/.vtt）、クリックで辞書、理解度、字幕からカード作成' },
    learn: { title: '学習', description: 'かな・漢字・文法・教科書' },
    me: { title: 'マイページ', description: '進捗、ヒートマップ、履歴、まとめ' },
    kana: { title: 'ひらがな・カタカナ', description: '五十音表、書き取り、聞き取り、早押し認識' },
    kanji: { title: '漢字', description: 'JLPT・部首別、覚え方、筆順、音読み・訓読み、例、書き取り採点' },
    dictionary: { title: '辞書', description: 'オフライン辞書 JMdict/KANJIDIC、共通の単語ポップアップ' },
    grammar: { title: '文法', description: '解説、ドリル、SRSに追加' },
    textbook: { title: '教科書', description: 'みんなの日本語・げんきの課の構成、自分のメモと音声' },
    roadmap: { title: 'ロードマップ', description: 'N5→N1の学習計画、シリーズ別、カスタマイズ' },
    assistant: { title: 'アシスタント', description: 'キツネのAIアシスタント、添削、ロールプレイ' },
    settings: { title: '設定', description: '外観、文字サイズ、ふりがな、音、言語' },
  },
}

/** Tên + mô tả của module theo ngôn ngữ `lang` (dự phòng: Nhật → Anh → Việt). */
export function moduleText(m: Pick<AppModule, 'id' | 'title' | 'description'>, lang: Lang): Required<Text> {
  let title: string | undefined
  let description: string | undefined
  for (const l of FALLBACK[lang]) {
    if (l === 'vi') break
    const tx = MODULE_TEXT[l][m.id]
    title ??= tx?.title
    description ??= tx?.description
  }
  return { title: title ?? m.title, description: description ?? m.description }
}

/** Mọi tên của module ở cả 3 ngôn ngữ (để tìm kiếm "settings" vẫn ra "Cài đặt"). */
export function moduleNames(m: Pick<AppModule, 'id' | 'title'>): string[] {
  return [m.title, MODULE_TEXT.en[m.id]?.title, MODULE_TEXT.ja[m.id]?.title].filter((x): x is string => !!x)
}

/** Hook React: hàm (module) → { title, description } theo ngôn ngữ đang chọn. */
export function useModuleText() {
  const lang = useLang()
  return useCallback((m: Pick<AppModule, 'id' | 'title' | 'description'>) => moduleText(m, lang), [lang])
}
