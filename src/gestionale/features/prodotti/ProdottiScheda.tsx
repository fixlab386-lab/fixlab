import { useMemo } from 'react'
import { SCHEDA_TABS } from './constants'
import type { Prodotto, SchedaTabId } from './types'
import { tipologiaHaMagazzino } from './types'
import TabCaratteristiche from './tabs/TabCaratteristiche'
import TabDimensioniPeso from './tabs/TabDimensioniPeso'
import TabDettagli from './tabs/TabDettagli'
import TabMagazzino from './tabs/TabMagazzino'

type Props = {
  prodotto: Prodotto | null
  activeTab: SchedaTabId
  categorie: string[]
  sottocategorieMap: Record<string, string[]>
  fornitori: string[]
  produttori: string[]
  prezziEspansi: boolean
  onTabChange: (tab: SchedaTabId) => void
  onChange: (p: Prodotto) => void
  onTogglePrezzi: () => void
  onPrezziMenu: (azione: string) => void
  onCategorie: () => void
  onAllegati: () => void
  onImmagine: () => void
  onCodiciAggiuntivi: () => void
  onComponenti: () => void
  onCarica: () => void
  onScarica: () => void
  onRettifica: () => void
}

export default function ProdottiScheda({
  prodotto,
  activeTab,
  categorie,
  sottocategorieMap,
  fornitori,
  produttori,
  prezziEspansi,
  onTabChange,
  onChange,
  onTogglePrezzi,
  onPrezziMenu,
  onCategorie,
  onAllegati,
  onImmagine,
  onCodiciAggiuntivi,
  onComponenti,
  onCarica,
  onScarica,
  onRettifica,
}: Props) {
  const tabs = useMemo(() => {
    if (!prodotto) return SCHEDA_TABS.filter(t => !t.requiresMagazzino)
    if (tipologiaHaMagazzino(prodotto.tipologia)) return SCHEDA_TABS
    return SCHEDA_TABS.filter(t => !t.requiresMagazzino)
  }, [prodotto])

  const sottocategorie = prodotto ? sottocategorieMap[prodotto.categoria] || [] : []

  if (!prodotto) {
    return (
      <div className="prodotti-section__scheda">
        <div className="prodotti-empty-scheda">
          Seleziona un prodotto nell&apos;elenco oppure usa «Nuovo» per crearne uno.
        </div>
      </div>
    )
  }

  return (
    <div className="prodotti-section__scheda">
      <div className="prodotti-scheda__tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`prodotti-scheda__tab${activeTab === tab.id ? ' prodotti-scheda__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="prodotti-scheda__body">
        {activeTab === 'caratteristiche' ? (
          <TabCaratteristiche
            prodotto={prodotto}
            categorie={categorie}
            sottocategorie={sottocategorie}
            prezziEspansi={prezziEspansi}
            onChange={onChange}
            onTogglePrezzi={onTogglePrezzi}
            onPrezziMenu={onPrezziMenu}
            onCategorie={onCategorie}
            onAllegati={onAllegati}
            onImmagine={onImmagine}
          />
        ) : null}
        {activeTab === 'dimensioni' ? <TabDimensioniPeso prodotto={prodotto} onChange={onChange} /> : null}
        {activeTab === 'dettagli' ? (
          <TabDettagli
            prodotto={prodotto}
            fornitori={fornitori}
            produttori={produttori}
            onChange={onChange}
            onCodiciAggiuntivi={onCodiciAggiuntivi}
            onComponenti={onComponenti}
          />
        ) : null}
        {activeTab === 'magazzino' ? (
          <TabMagazzino
            prodotto={prodotto}
            onChange={onChange}
            onCarica={onCarica}
            onScarica={onScarica}
            onRettifica={onRettifica}
          />
        ) : null}
      </div>

      {activeTab === 'caratteristiche' ? (
        <div className="prodotti-scheda-footer">
          <button type="button" className="prodotti-actionbar__btn" onClick={onAllegati}>
            <span>📎</span> Allegati…
          </button>
          <button type="button" className="prodotti-actionbar__btn" onClick={onImmagine}>
            <span>🖼</span> Immagine…
          </button>
        </div>
      ) : null}
    </div>
  )
}
