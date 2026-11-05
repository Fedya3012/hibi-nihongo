/**
 * TRANG GIÁO TRÌNH (module textbook) — đường dẫn /learn/textbook
 * Ba màn hình: Kệ sách → Một cuốn sách (lưới bài) → Một bài (7 mục).
 * Đường dẫn mở thẳng:
 *   /learn/textbook?b=minna-1            cuốn Minna I
 *   /learn/textbook?b=minna-1&l=5        bài 5
 *   /learn/textbook?b=minna-1&l=5&s=kanji  mục Kanji của bài 5
 *   /learn/textbook?b=minna-1&read=<mã file>&p=12  đọc file sách gốc ở trang 13 (p đếm từ 0)
 * Xem README.md trong thư mục này.
 */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shelf } from './Shelf'
import { BookView } from './BookView'
import { LessonView } from './LessonView'
import { BookReader } from './reader/BookReader'
import { SECTIONS, type Section } from './types'

export default function TextbookPage() {
  const [params, setParams] = useSearchParams()
  const bookId = params.get('b') ?? undefined
  const lesson = params.has('l') ? Number(params.get('l')) : undefined
  const sParam = params.get('s') as Section | null
  const read = params.get('read') ?? undefined
  const page = params.has('p') ? Number(params.get('p')) : undefined
  const section: Section = sParam && SECTIONS.includes(sParam) ? sParam : 'vocab'

  const go = useCallback((patch: Record<string, string | number | undefined>, push = true) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k)
      else next.set(k, String(v))
    }
    if (next.get('s') === 'vocab') next.delete('s')
    setParams(next, { replace: !push })
  }, [params, setParams])

  return (
    <div className="mx-auto max-w-5xl">
      {bookId && read ? (
        <BookReader key={read} bookId={bookId} fileId={read} page={page != null && !Number.isNaN(page) ? page : undefined}
          onPage={(p) => go({ p }, false)}
          onBack={() => go({ read: undefined, p: undefined, l: lesson })}
          onLesson={(n) => go({ read: undefined, p: undefined, l: n, s: undefined })} />
      ) : !bookId ? (
        <Shelf onOpen={(b, l) => go({ b, l })} />
      ) : lesson == null || Number.isNaN(lesson) ? (
        <BookView bookId={bookId} onBack={() => go({ b: undefined })} onOpen={(n) => go({ l: n })}
          onRead={(fileId, p) => go({ read: fileId, p })} />
      ) : (
        <LessonView key={`${bookId}:${lesson}`} bookId={bookId} number={lesson} section={section}
          onSection={(s) => go({ s }, false)}
          onLesson={(n) => go({ l: n, s: undefined })}
          onBack={() => go({ l: undefined, s: undefined })}
          onRead={(fileId, p) => go({ read: fileId, p })} />
      )}
    </div>
  )
}
