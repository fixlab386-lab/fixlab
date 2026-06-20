import { useSearchParams } from 'react-router-dom'
import SituazioneScorteSection from './SituazioneScorteSection'
import MovimentiSection from './MovimentiSection'
import '../../theme/magazzino-section.css'

export default function MagazzinoSection() {
  const [searchParams] = useSearchParams()
  // Nessun tab visibile (come in Danea): di default mostra i Movimenti magazzino.
  // La «Situazione scorte» resta raggiungibile dai link rapidi dello Start (?tab=situazione).
  const showSituazione = searchParams.get('tab') === 'situazione'

  return (
    <div className="gestionale-magazzino-section">
      <div className="gestionale-magazzino-tabs__panel" role="tabpanel">
        {showSituazione ? <SituazioneScorteSection /> : <MovimentiSection />}
      </div>
    </div>
  )
}
