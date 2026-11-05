/**
 * MODULE XEM ANIME — trang chính (/immersion/anime)
 * Ba màn hình, chọn bằng tham số trên đường dẫn (nút Quay lại của trình duyệt hoạt động đúng):
 *   /immersion/anime                 → Thư viện
 *   /immersion/anime?series=<id>     → Một series (danh sách tập, điểm hiểu, từ vựng)
 *   /immersion/anime?watch=<id>      → Trình xem
 */
import { useSearchParams } from 'react-router-dom'
import { Library } from './Library'
import { SeriesView } from './SeriesView'
import { Player } from './Player'
import { getEpisode } from './store'

export default function AnimePage() {
  const [params, setParams] = useSearchParams()
  const watch = params.get('watch')
  const seriesId = params.get('series')

  const openSeries = (id: string) => setParams({ series: id })
  const openPlayer = (episodeId: string) => setParams({ watch: episodeId })

  if (watch) {
    return (
      <Player
        key={watch}
        episodeId={watch}
        onClose={async () => {
          const e = await getEpisode(watch)
          setParams(e ? { series: e.seriesId } : {})
        }}
        // Đổi tập: thay đường dẫn hiện tại (không chồng lịch sử) để nút Quay lại về danh sách tập
        onOpenEpisode={(id) => setParams({ watch: id }, { replace: true })}
      />
    )
  }
  if (seriesId) return <SeriesView seriesId={seriesId} back={() => setParams({})} openPlayer={openPlayer} />
  return <Library openSeries={openSeries} openPlayer={openPlayer} />
}
