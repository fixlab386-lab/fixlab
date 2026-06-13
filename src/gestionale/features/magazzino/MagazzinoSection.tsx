import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SituazioneScorteSection from './SituazioneScorteSection'
import MovimentiSection from './MovimentiSection'
import '../../theme/magazzino-section.css'

type MagazzinoTab = 'situazione' | 'movimenti'

export default function MagazzinoSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<MagazzinoTab>(tabParam === 'movimenti' ? 'movimenti' : 'situazione')

  useEffect(() => {
    if (tabParam === 'movimenti') setTab('movimenti')
    else if (tabParam === 'situazione') setTab('situazione')
  }, [tabParam])

  const selectTab = (next: MagazzinoTab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="gestionale-magazzino-section">
      <div className="gestionale-magazzino-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`gestionale-magazzino-tabs__tab${tab === 'situazione' ? ' gestionale-magazzino-tabs__tab--active' : ''}`}
          onClick={() => selectTab('situazione')}
        >
          Situazione scorte
        </button>
        <button
          type="button"
          role="tab"
          className={`gestionale-magazzino-tabs__tab${tab === 'movimenti' ? ' gestionale-magazzino-tabs__tab--active' : ''}`}
          onClick={() => selectTab('movimenti')}
        >
          Movimenti
        </button>
      </div>
      <div role="tabpanel">
        {tab === 'situazione' ? <SituazioneScorteSection /> : <MovimentiSection />}
      </div>
    </div>
  )
}
