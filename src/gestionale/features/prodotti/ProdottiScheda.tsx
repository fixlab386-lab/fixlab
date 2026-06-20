import { useMemo } from 'react'
import { SCHEDA_TABS } from './constants'
import type { Prodotto, SchedaTabId } from './types'
import { tipologiaHaMagazzino } from './types'
import type { Category } from '../../../types'
import ProdottiFiltriPanel from './ProdottiFiltriPanel'
import TabCaratteristiche from './tabs/TabCaratteristiche'
import TabDimensioniPeso from './tabs/TabDimensioniPeso'
import TabDettagli from './tabs/TabDettagli'
import TabMagazzino from './tabs/TabMagazzino'

type Props = {
  prodotto: Prodotto | null
  activeTab: SchedaTabId
  categories: Category[]
  fornitori: string[]
  produttori: string[]
  prezziEspansi: boolean
  filtraAttivo: boolean
  prodotti: Prodotto[]
  categoryFilterId: string | null
  onCategoryFilter: (id: string | null) => void
  onTabChange: (tab: SchedaTabId) => void
  onChange: (p: Prodotto) => void
  onTogglePrezzi: () => void
  onPrezziMenu: (azione: string) => void
  onCategorie: () => void
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
  categories,
  fornitori,
  produttori,
  prezziEspansi,
  filtraAttivo,
  prodotti,
  categoryFilterId,
  onCategoryFilter,
  onTabChange,
  onChange,
  onTogglePrezzi,
  onPrezziMenu,
  onCategorie,
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

  if (!prodotto) {
    return (
      <div className="prodotti-section__scheda">
        {filtraAttivo ? (
          <ProdottiFiltriPanel
            categories={categories}
            prodotti={prodotti}
            categoryFilterId={categoryFilterId}
            onCategoryFilter={onCategoryFilter}
            onAzzera={() => onCategoryFilter(null)}
          />
        ) : null}
        <div className="prodotti-empty-scheda">
          Seleziona un prodotto nell&apos;elenco oppure usa «Nuovo» per crearne uno.
        </div>
      </div>
    )
  }

  return (
    <div className="prodotti-section__scheda">
      {filtraAttivo ? (
        <ProdottiFiltriPanel
          categories={categories}
          prodotti={prodotti}
          categoryFilterId={categoryFilterId}
          onCategoryFilter={onCategoryFilter}
          onAzzera={() => onCategoryFilter(null)}
        />
      ) : null}
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
            categories={categories}
            prezziEspansi={prezziEspansi}
            onChange={onChange}
            onTogglePrezzi={onTogglePrezzi}
            onPrezziMenu={onPrezziMenu}
            onCategorie={onCategorie}
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
        <div className="prodotti-scheda-footer clienti-scheda-footer">
          <button type="button" className="clienti-scheda-footer__btn" onClick={onImmagine}>
            Immagine…
          </button>
        </div>
      ) : null}
    </div>
  )
}
