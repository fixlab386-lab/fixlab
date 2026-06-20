import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import DocumentiHub from '../gestionale/features/documenti/DocumentiHub'
import DocumentiSection from '../gestionale/features/documenti/DocumentiSection'
import { isActiveDocumentType } from '../gestionale/features/documenti'
import type { ActiveDocumentType } from '../gestionale/features/documenti/constants'

/** Hub e elenco documenti a pagina intera (stile Danea Easyfatt). */
export default function Documenti() {
  const { type } = useParams()
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type')

  const resolvedType: ActiveDocumentType | null =
    type && isActiveDocumentType(type)
      ? type
      : typeParam && isActiveDocumentType(typeParam)
        ? typeParam
        : null

  if (resolvedType) {
    return <DocumentiSection lockedType={resolvedType} />
  }

  if (type || typeParam) {
    return <Navigate to="/documenti" replace />
  }

  return <DocumentiHub />
}
