import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppWindows } from '../contexts/AppWindowsContext'
import { isActiveDocumentType } from '../gestionale/features/documenti'

/** Link diretto /documenti/tipo/:type → apre finestra elenco e torna allo Start. */
export default function Documenti() {
  const { type } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openDocumentiType } = useAppWindows()

  useEffect(() => {
    const typeParam = searchParams.get('type')
    const resolvedType =
      type && isActiveDocumentType(type)
        ? type
        : typeParam && isActiveDocumentType(typeParam)
          ? typeParam
          : null
    if (resolvedType) {
      openDocumentiType(resolvedType)
    }
    navigate('/', { replace: true })
  }, [type, searchParams, openDocumentiType, navigate])

  return null
}
