import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppWindows } from '../contexts/AppWindowsContext'
import { resolveOpzioniTab } from '../components/settings/opzioni/resolveOpzioniTab'

/** Apre la finestra Opzioni applicazione e torna alla pagina precedente. */
export default function ImpostazioniOpener() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { openOpzioni } = useAppWindows()

  useEffect(() => {
    openOpzioni(resolveOpzioniTab(searchParams.get('tab')))
    navigate('/', { replace: true })
    // Apri una sola volta al mount (deep link /impostazioni?tab=…)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
