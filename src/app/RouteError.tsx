/** Trang báo lỗi thân thiện thay cho trang lỗi mặc định của React Router. */
import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { useT } from '@/core/i18n'
import { Button } from '@/design/components/Button'
import { APP } from './strings'
import { isStaleChunkError, reloadOnce } from './staleChunk'

export function RouteError() {
  const t = useT(APP)
  const error = useRouteError()
  const stale = isStaleChunkError(error)

  // App vừa có bản mới: tự tải lại một lần là hết lỗi
  useEffect(() => {
    if (stale) reloadOnce()
  }, [stale])

  const detail = error instanceof Error ? error.message : String(error ?? '')
  return (
    <div role="alert" className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">{stale ? t('errUpdatedTitle') : t('errTitle')}</h1>
      <p>{stale ? t('errUpdatedHint') : t('errHint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.location.reload()}>{t('errReload')}</Button>
        <Button variant="soft" onClick={() => (window.location.hash = '#/')}>{t('home')}</Button>
      </div>
      {detail && (
        <details className="text-sm opacity-70">
          <summary>{t('errDetail')}</summary>
          <pre className="whitespace-pre-wrap break-all">{detail}</pre>
        </details>
      )}
    </div>
  )
}
