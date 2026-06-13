import { useEffect } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DocumentiHub, DocumentiSection, isActiveDocumentType } from '../gestionale/features/documenti'

export default function Documenti() {
  const { type } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (!type && typeParam && typeParam !== 'all' && isActiveDocumentType(typeParam)) {
      const rest = new URLSearchParams(searchParams)
      rest.delete('type')
      const q = rest.toString()
      navigate(`/documenti/tipo/${typeParam}${q ? `?${q}` : ''}`, { replace: true })
    }
  }, [type, searchParams, navigate])

  if (type) {
    if (!isActiveDocumentType(type)) return <Navigate to="/documenti" replace />
    return <DocumentiSection lockedType={type} />
  }

  return <DocumentiHub />
}
