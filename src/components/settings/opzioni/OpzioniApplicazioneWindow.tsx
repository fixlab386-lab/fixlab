import { useAppWindows } from '../../../contexts/AppWindowsContext'
import ImpostazioniPanel from '../../../pages/Impostazioni'

export default function OpzioniApplicazioneWindow() {
  const { opzioniOpen, opzioniInitialTab, closeOpzioni } = useAppWindows()

  if (!opzioniOpen) return null

  return (
    <ImpostazioniPanel
      key={opzioniInitialTab ?? 'default'}
      onClose={closeOpzioni}
      initialTab={opzioniInitialTab ?? undefined}
    />
  )
}
