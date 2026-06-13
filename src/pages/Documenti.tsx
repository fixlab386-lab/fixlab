import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppWindows } from '../contexts/AppWindowsContext'
import { isActiveDocumentType } from '../gestionale/features/documenti'

/** Apre la finestra Documenti e torna allo Start. */
export default function Documenti() {
  const { type } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openDocumenti } = useAppWindows()

  useEffect(() => {
    const typeParam = searchParams.get('type')
    const resolvedType =
      type && isActiveDocumentType(type)
        ? type
        : typeParam && isActiveDocumentType(typeParam)
          ? typeParam
          : null
    openDocumenti(resolvedType)
    navigate('/', { replace: true })
  }, [type, searchParams, openDocumenti, navigate])

  return null
}
