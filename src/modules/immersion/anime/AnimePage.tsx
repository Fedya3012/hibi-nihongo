/**
 * MODULE XEM ANIME — trang chính (/immersion/anime)
 * Các màn hình, chọn bằng tham số trên đường dẫn (nút Quay lại của trình duyệt hoạt động đúng):
 *   /immersion/anime                              → Thư viện
 *   /immersion/anime?series=<id>[&study=<epId>]   → Một series (mở sẵn từ vựng của tập study)
 *   /immersion/anime?watch=<id>[&t=<giây>]        → Trình xem (t: mở đúng giây, vd từ kết quả tìm kiếm)
 *   /immersion/anime?review=1[&series=..&season=..&episode=..&recent=2] → Ôn theo cảnh phim
 */
import { useSearchParams } from 'react-router-dom'
import { AnimeReview, scopeFromParams } from './AnimeReview'
import { Library } from './Library'
import { SeriesView } from './SeriesView'
import { Player } from './Player'
import { getEpisode } from './store'

export default function AnimePage() {
  const [params, setParams] = useSearchParams()
  const watch = params.get('watch')
  const seriesId = params.get('series')
  const review = params.get('review')

  const openSeries = (id: string) => setParams({ series: id })
  const openPlayer = (episodeId: string) => setParams({ watch: episodeId })
  const openPlayerAt = (episodeId: string, sec: number) => setParams({ watch: episodeId, t: String(Math.round(sec * 10) / 10) })
  const openReview = (scope: Record<string, string>) => setParams({ review: '1', ...scope })

  if (watch) {
    const t = Number(params.get('t'))
    return (
      <Player
        key={watch + (params.get('t') ?? '')}
        episodeId={watch}
        startAt={Number.isFinite(t) && t > 0 ? t : undefined}
        onClose={async () => {
          const e = await getEpisode(watch)
          setParams(e ? { series: e.seriesId } : {})
        }}
        // Đổi tập: thay đường dẫn hiện tại (không chồng lịch sử) để nút Quay lại về danh sách tập
        onOpenEpisode={(id) => setParams({ watch: id }, { replace: true })}
        onStudyEpisode={async (id) => {
          const e = await getEpisode(id)
          if (e) setParams({ series: e.seriesId, study: id })
        }}
        onReview={(episodeId) => openReview({ episode: episodeId })}
      />
    )
  }
  if (review) {
    return (
      <AnimeReview
        key={params.toString()}
        initial={scopeFromParams(params)}
        onClose={() => (seriesId ? openSeries(seriesId) : setParams({}))}
        openAt={openPlayerAt}
      />
    )
  }
  if (seriesId) {
    return (
      <SeriesView seriesId={seriesId} back={() => setParams({})} openPlayer={openPlayer}
        openReview={openReview} focusEpisode={params.get('study') ?? undefined} />
    )
  }
  return <Library openSeries={openSeries} openPlayer={openPlayer} openPlayerAt={openPlayerAt} openReview={openReview} />
}
