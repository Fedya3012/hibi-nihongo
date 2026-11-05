/**
 * MODULE ĐỌC VĂN BẢN — trang chính (/immersion/reader)
 *   /immersion/reader            → Thư viện
 *   /immersion/reader?doc=<id>   → Trình đọc
 */
import { useSearchParams } from 'react-router-dom'
import { Library } from './Library'
import { ReaderView } from './ReaderView'

export default function ReaderPage() {
  const [params, setParams] = useSearchParams()
  const doc = params.get('doc')
  if (doc) return <ReaderView key={doc} docId={doc} onClose={() => setParams({})} />
  return <Library openDoc={(id) => setParams({ doc: id })} />
}
