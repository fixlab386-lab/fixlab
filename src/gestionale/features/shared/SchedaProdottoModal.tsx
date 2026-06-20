import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { updateProduct } from '../../../lib/firestore'
import type { Category, Product, StockMovement } from '../../../types'
import {
  CategorieProdottiDialog,
  ImmagineProdottoDialog,
} from '../prodotti/dialogs/ProdottiDialogs'
import TabCaratteristiche from '../prodotti/tabs/TabCaratteristiche'
import TabDimensioniPeso from '../prodotti/tabs/TabDimensioniPeso'
import TabMagazzino from '../prodotti/tabs/TabMagazzino'
import {
  productToProdotto,
  prodottoToProductPayload,
  tipologiaHaMagazzino,
  type Prodotto,
  type SchedaTabId,
} from '../prodotti/types'
import { MOVIMENTI_SCHEDA_TABS } from '../magazzino/schedaTabs'
import '../../theme/prodotti-section.css'
import '../../theme/movimenti-section.css'

export type SchedaProdottoPayload = {
  prodotto: Prodotto
  baseline: Prodotto
}

type Props = {
  studioId: string
  categories: Category[]
  payload: SchedaProdottoPayload
  onClose: () => void
  onSaved?: () => void
  onCarica?: () => void
  onScarica?: () => void
  onRettifica?: () => void
}

export function buildSchedaProdottoPayload(
  product: Product,
  movements: StockMovement[],
): SchedaProdottoPayload {
  const prodotto = productToProdotto(product, movements)
  return { prodotto, baseline: structuredClone(prodotto) }
}

export default function SchedaProdottoModal({
  studioId,
  categories,
  payload,
  onClose,
  onSaved,
  onCarica,
  onScarica,
  onRettifica,
}: Props) {
  const [activeTab, setActiveTab] = useState<SchedaTabId>('caratteristiche')
  const [prodotto, setProdotto] = useState<Prodotto>(payload.prodotto)
  const [baseline, setBaseline] = useState<Prodotto>(payload.baseline)
  const [prezziEspansi, setPrezziEspansi] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showCategorie, setShowCategorie] = useState(false)
  const [showImmagine, setShowImmagine] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const tabs = useMemo(() => {
    if (tipologiaHaMagazzino(prodotto.tipologia)) return MOVIMENTI_SCHEDA_TABS
    return MOVIMENTI_SCHEDA_TABS.filter(t => !t.requiresMagazzino)
  }, [prodotto.tipologia])

  const isDirty = useMemo(
    () => JSON.stringify(prodotto) !== JSON.stringify(baseline),
    [prodotto, baseline],
  )

  const handleOk = useCallback(async () => {
    if (!isDirty) {
      onClose()
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await updateProduct(prodotto.id, prodottoToProductPayload(prodotto, categories))
      const saved = structuredClone(prodotto)
      setBaseline(saved)
      setProdotto(saved)
      onSaved?.()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [isDirty, onClose, onSaved, prodotto, categories])

  const categoryPath =
    prodotto.categoryPath ||
    (prodotto.sottocategoria ? `${prodotto.categoria} » ${prodotto.sottocategoria}` : prodotto.categoria)

  return createPortal(
    <div className="prodotti-dialog-overlay scheda-prodotto-overlay" role="presentation">
      <div
        className="prodotti-dialog prodotti-dialog--lg scheda-prodotto-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheda-prodotto-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="prodotti-dialog__titlebar">
          <span id="scheda-prodotto-title">Scheda prodotto</span>
          <button
            type="button"
            className="prodotti-dialog__close prodotti-dialog__close--red"
            onClick={onClose}
            title="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="prodotti-scheda__tabs scheda-prodotto-modal__tabs" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`prodotti-scheda__tab${activeTab === tab.id ? ' prodotti-scheda__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="scheda-prodotto-modal__body" role="tabpanel">
          {activeTab === 'caratteristiche' ? (
            <TabCaratteristiche
              prodotto={prodotto}
              categories={categories}
              prezziEspansi={prezziEspansi}
              onChange={setProdotto}
              onTogglePrezzi={() => setPrezziEspansi(v => !v)}
              onPrezziMenu={() => {}}
              onCategorie={() => setShowCategorie(true)}
              onImmagine={() => setShowImmagine(true)}
            />
          ) : null}
          {activeTab === 'dimensioni' ? <TabDimensioniPeso prodotto={prodotto} onChange={setProdotto} /> : null}
          {activeTab === 'magazzino' ? (
            <TabMagazzino
              prodotto={prodotto}
              onChange={setProdotto}
              onCarica={() => onCarica?.()}
              onScarica={() => onScarica?.()}
              onRettifica={() => onRettifica?.()}
            />
          ) : null}
        </div>

        {saveError ? <p className="scheda-prodotto-modal__error">{saveError}</p> : null}

        <div className="prodotti-dialog__footer scheda-prodotto-modal__footer">
          <button type="button" className="prodotti-actionbar__btn" onClick={() => setShowImmagine(true)}>
            <span>🖼</span> Immagine…
          </button>
          <button
            type="button"
            className="prodotti-dialog__btn"
            disabled={saving}
            onClick={() => void handleOk()}
          >
            {saving ? 'Salvataggio…' : 'OK'}
          </button>
        </div>
      </div>

      {showCategorie ? (
        <CategorieProdottiDialog
          studioId={studioId}
          categories={categories}
          selectedPath={categoryPath}
          onSelect={selection => {
            setProdotto({
              ...prodotto,
              categoria: selection.categoria,
              sottocategoria: selection.sottocategoria,
              categoryPath: selection.categoryPath,
              categoryId: selection.categoryId,
              subcategoryId: selection.subcategoryId,
            })
          }}
          onClose={() => setShowCategorie(false)}
          onApplica={() => setShowCategorie(false)}
          onRefresh={async () => {}}
        />
      ) : null}

      {showImmagine ? (
        <ImmagineProdottoDialog
          imageUrl={prodotto.immagineUrl}
          onImport={url => {
            setProdotto({ ...prodotto, immagineUrl: url || undefined })
            setShowImmagine(false)
          }}
          onClose={() => setShowImmagine(false)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
