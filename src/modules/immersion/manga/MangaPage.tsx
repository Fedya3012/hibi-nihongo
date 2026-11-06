/**
 * MODULE ĐỌC MANGA — trang chính (/immersion/manga)
 * Ba màn hình, chọn bằng tham số trên đường dẫn (để nút Quay lại của trình duyệt hoạt động đúng):
 *   /immersion/manga                  → Thư viện
 *   /immersion/manga?series=<id>      → Một series
 *   /immersion/manga?read=<id>&page=N → Trình đọc (page không bắt buộc, mặc định là trang đang đọc dở)
 *   /immersion/manga?series=<id>&tab=notebook → Sổ tay & nhân vật của series
 *   /immersion/manga?view=sfx&tab=sfx|slang&q=… → Thư viện từ tượng thanh & khẩu ngữ
 */
import { useSearchParams } from 'react-router-dom'
import { Library } from './Library'
import { SeriesView } from './SeriesView'
import { Reader } from './Reader'
import { SfxLibrary } from './SfxLibrary'
import { getChapter } from './store'

export default function MangaPage() {
  const [params, setParams] = useSearchParams()
  const read = params.get('read')
  const seriesId = params.get('series')
  const pageParam = params.get('page')

  const openSeries = (id: string) => setParams({ series: id })
  const openReader = (chapterId: string, page?: number) =>
    setParams(page != null ? { read: chapterId, page: String(page) } : { read: chapterId })

  if (read) {
    return (
      <Reader
        chapterId={read}
        startPage={pageParam != null ? Number(pageParam) : undefined}
        onClose={async () => {
          const c = await getChapter(read)
          setParams(c ? { series: c.seriesId } : {})
        }}
        // Đổi chương: thay đường dẫn hiện tại (không chồng lịch sử) để nút Quay lại về danh sách chương
        onOpenChapter={(id, page) => setParams(page != null ? { read: id, page: String(page) } : { read: id }, { replace: true })}
      />
    )
  }
  if (params.get('view') === 'sfx') return <SfxLibrary back={() => setParams({})} openReader={openReader} />
  if (seriesId) {
    return (
      <SeriesView seriesId={seriesId} back={() => setParams({})} openReader={openReader}
        tab={params.get('tab') === 'notebook' ? 'notebook' : 'chapters'}
        setTab={(t) => setParams(t === 'notebook' ? { series: seriesId, tab: t } : { series: seriesId }, { replace: true })} />
    )
  }
  return <Library openSeries={openSeries} openReader={openReader} openSfx={() => setParams({ view: 'sfx' })} />
}
