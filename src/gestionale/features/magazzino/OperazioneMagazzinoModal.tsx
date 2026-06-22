import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Product } from '../../../types'
import { searchClients, searchProducts, searchSuppliers } from '../../../lib/firestorePagination'
import { loadRecentClients, loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import type { Prodotto } from '../prodotti/types'
import {
  OPERAZIONE_MAGAZZINO_SUBTITLES,
  OPERAZIONE_MAGAZZINO_TITLES,
  type OperazioneMagazzinoMode,
} from './constants'
import { loadCausali, saveCausali } from './causali'
import ElencoCausaliModal from './ElencoCausaliModal'
import '../../../theme/gestionale-dialog.css'
import '../../theme/movimenti-section.css'

export type OperazioneMagazzinoLine = {
  id: string
  productId: string
  productCode: string
  productName: string
  supplierCode: string
  um: string
  quantity: number
  unitCost: number
  unitPrice: number
  currentStock: number
  newStock: number
}

export type OperazioneMagazzinoState = {
  subjectType: 'client' | 'supplier'
  subjectId: string
  subjectName: string
  date: string
  cause: string
  updateSupplierPrice: boolean
  lines: OperazioneMagazzinoLine[]
}

function buildOperazioneLineFromProduct(mode: OperazioneMagazzinoMode, product: Product): OperazioneMagazzinoLine {
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    productCode: product.code || '',
    productName: product.name,
    supplierCode: product.barcode || '',
    um: product.unitOfMeasure || 'pz',
    quantity: 1,
    unitCost: product.purchasePrice || 0,
    unitPrice: product.price || 0,
    currentStock: product.stock ?? 0,
    newStock: product.stock ?? 0,
  }
}

export function createOperazioneMagazzinoWithProduct(
  mode: OperazioneMagazzinoMode,
  product: Product,
): OperazioneMagazzinoState {
  return { ...createEmptyOperazioneMagazzino(mode), lines: [buildOperazioneLineFromProduct(mode, product)] }
}

export function createOperazioneMagazzinoWithProdotto(
  mode: OperazioneMagazzinoMode,
  prodotto: Prodotto,
): OperazioneMagazzinoState {
  const line: OperazioneMagazzinoLine = {
    id: crypto.randomUUID(),
    productId: prodotto.id,
    productCode: prodotto.codProdotto,
    productName: prodotto.descrizione,
    supplierCode: prodotto.dettagli.codProdFornitore || prodotto.dettagli.codBarre || '',
    um: prodotto.um || 'pz',
    quantity: 1,
    unitCost: prodotto.prezzoCosto || 0,
    unitPrice: prodotto.prezzi.find(p => p.listinoId === 'privati')?.valore ?? 0,
    currentStock: prodotto.magazzino?.giacenza ?? 0,
    newStock: prodotto.magazzino?.giacenza ?? 0,
  }
  return { ...createEmptyOperazioneMagazzino(mode), lines: [line] }
}

export function createEmptyOperazioneMagazzino(mode: OperazioneMagazzinoMode): OperazioneMagazzinoState {
  const today = new Date().toISOString().slice(0, 10)
  const defaultCause = loadCausali(mode)[0] ?? ''
  return {
    subjectType: mode === 'unload' ? 'client' : 'supplier',
    subjectId: '',
    subjectName: '',
    date: today,
    cause: defaultCause,
    updateSupplierPrice: false,
    lines: [],
  }
}

type Props = {
  open: boolean
  mode: OperazioneMagazzinoMode
  state: OperazioneMagazzinoState
  studioId: string
  saving: boolean
  saveError: string | null
  onChange: (state: OperazioneMagazzinoState) => void
  onSave: () => void
  onClose: () => void
}

export default function OperazioneMagazzinoModal({
  open,
  mode,
  state,
  studioId,
  saving,
  saveError,
  onChange,
  onSave,
  onClose,
}: Props) {
  const [productSearch, setProductSearch] = useState('')
  const [searchField, setSearchField] = useState<'descrizione' | 'codice'>('descrizione')
  const [showPicker, setShowPicker] = useState(false)
  const [productResults, setProductResults] = useState<Product[]>([])
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [causali, setCausali] = useState<string[]>(() => loadCausali(mode))
  const [causaliOpen, setCausaliOpen] = useState(false)
  const subjectInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCausali(loadCausali(mode))
  }, [mode])

  const handleCausaliChange = useCallback(
    (next: string[]) => {
      setCausali(next)
      saveCausali(mode, next)
    },
    [mode],
  )

  useEffect(() => {
    if (!open || !studioId) return
    let cancelled = false
    const load = mode === 'unload' ? loadRecentClients(studioId) : loadRecentSuppliers(studioId)
    void load.then(rows => {
      if (cancelled) return
      setSubjects(rows.map(r => ({ id: r.id, name: r.name })))
    })
    return () => {
      cancelled = true
    }
  }, [open, studioId, mode])

  useEffect(() => {
    if (!open || !studioId) return
    const term = subjectSearch.trim()
    const timer = window.setTimeout(() => {
      const load =
        mode === 'unload'
          ? term
            ? searchClients(studioId, term, 20)
            : loadRecentClients(studioId)
          : term
            ? searchSuppliers(studioId, term, 20)
            : loadRecentSuppliers(studioId)
      void load.then(rows => {
        setSubjects(rows.map(r => ({ id: r.id, name: r.name })))
      })
    }, term ? 250 : 0)
    return () => clearTimeout(timer)
  }, [open, studioId, mode, subjectSearch])

  useEffect(() => {
    if (!open) {
      setProductSearch('')
      setShowPicker(false)
      setSubjectSearch('')
      setCausaliOpen(false)
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const searchLower = productSearch.trim().toLowerCase()

  useEffect(() => {
    if (!open || !studioId || !searchLower) {
      setProductResults([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void searchProducts(studioId, searchLower, 12).then(items => {
        if (!cancelled) {
          setProductResults(
            items.filter(p => {
              const hay =
                searchField === 'codice'
                  ? `${p.code} ${p.barcode || ''}`.toLowerCase()
                  : `${p.name} ${p.brand || ''} ${p.model || ''}`.toLowerCase()
              return hay.includes(searchLower)
            }),
          )
        }
      })
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, studioId, searchLower, searchField])

  const filteredProducts = productResults

  const patch = useCallback(
    (partial: Partial<OperazioneMagazzinoState>) => onChange({ ...state, ...partial }),
    [onChange, state],
  )

  const addProduct = useCallback(
    (product: Product) => {
      if (state.lines.some(l => l.productId === product.id)) return
      const line: OperazioneMagazzinoLine = {
        id: crypto.randomUUID(),
        productId: product.id,
        productCode: product.code || '',
        productName: product.name,
        supplierCode: product.barcode || '',
        um: product.unitOfMeasure || 'pz',
        quantity: 1,
        unitCost: product.purchasePrice || 0,
        unitPrice: product.price || 0,
        currentStock: product.stock ?? 0,
        newStock: product.stock ?? 0,
      }
      patch({ lines: [...state.lines, line] })
      setProductSearch('')
      setShowPicker(false)
    },
    [patch, state.lines],
  )

  const updateLine = useCallback(
    (lineId: string, partial: Partial<OperazioneMagazzinoLine>) => {
      patch({
        lines: state.lines.map(l => (l.id === lineId ? { ...l, ...partial } : l)),
      })
    },
    [patch, state.lines],
  )

  const removeLine = useCallback(
    (lineId: string) => patch({ lines: state.lines.filter(l => l.id !== lineId) }),
    [patch, state.lines],
  )

  const subjectLabel = mode === 'unload' ? 'Destinatario merce' : 'Provenienza merce'
  const subjectDisabled = mode === 'adjust'

  const handleSubjectInput = (value: string) => {
    setSubjectSearch(value)
    const match = subjects.find(s => s.name === value)
    patch({
      subjectId: match?.id || '',
      subjectName: value,
      subjectType: mode === 'unload' ? 'client' : 'supplier',
    })
  }

  const linesHeadLabel =
    mode === 'adjust'
      ? 'Elenco prodotti da rettificare:'
      : mode === 'unload'
        ? 'Elenco prodotti da scaricare:'
        : 'Elenco prodotti da caricare:'

  const amountHeader = mode === 'load' ? 'Costo unitario' : 'Prezzo unitario'

  if (!open) return null

  return createPortal(
    <div className="gestionale-dialog-overlay magazzino-dialog-overlay" onClick={onClose}>
      <div
        className="gestionale-dialog-card opmag2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operazione-magazzino-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="opmag2__titlebar">
          <span className="opmag2__titlebar-title">
            <span className="opmag2__titlebar-icon" aria-hidden="true">📦</span>
            FixLab
          </span>
          <button type="button" className="opmag2__titlebar-close" onClick={onClose} aria-label="Chiudi" disabled={saving}>
            ✕
          </button>
        </div>

        <div className="opmag2__header">
          <div className="opmag2__header-text">
            <h2 id="operazione-magazzino-title">{OPERAZIONE_MAGAZZINO_TITLES[mode]}</h2>
            <p>{OPERAZIONE_MAGAZZINO_SUBTITLES[mode]}</p>
          </div>
          <span className="opmag2__header-icon" aria-hidden="true">
            {mode === 'unload' ? '📤' : mode === 'adjust' ? '🛠️' : '📥'}
          </span>
        </div>

        <div className="opmag2__form">
          <div className="opmag2__row">
            <label className="opmag2__field opmag2__field--wide">
              <span className="opmag2__field-label">{subjectLabel}</span>
              <div className="opmag2__field-control">
                <input
                  ref={subjectInputRef}
                  className="opmag2__input"
                  list={`opmag2-subjects-${mode}`}
                  value={subjectDisabled ? '' : subjectSearch || state.subjectName}
                  disabled={subjectDisabled}
                  placeholder={subjectDisabled ? '' : 'Seleziona o cerca…'}
                  onChange={e => handleSubjectInput(e.target.value)}
                />
                <datalist id={`opmag2-subjects-${mode}`}>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className="opmag2__icon-btn opmag2__icon-btn--green"
                  title={mode === 'unload' ? 'Cerca cliente' : 'Cerca fornitore'}
                  disabled={subjectDisabled}
                  onClick={() => subjectInputRef.current?.focus()}
                >
                  🔍
                </button>
              </div>
            </label>
            <label className="opmag2__field opmag2__field--date">
              <span className="opmag2__field-label">Data operazione</span>
              <input
                className="opmag2__input"
                type="date"
                value={state.date}
                onChange={e => patch({ date: e.target.value })}
              />
            </label>
          </div>

          <div className="opmag2__row">
            <label className="opmag2__field opmag2__field--wide">
              <span className="opmag2__field-label">Causale</span>
              <div className="opmag2__field-control">
                <input
                  className="opmag2__input"
                  list={`opmag2-cause-${mode}`}
                  value={state.cause}
                  onChange={e => patch({ cause: e.target.value })}
                />
                <datalist id={`opmag2-cause-${mode}`}>
                  {causali.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className="opmag2__icon-btn"
                  title="Elenco causali"
                  onClick={() => setCausaliOpen(true)}
                >
                  📝
                </button>
              </div>
            </label>
          </div>

          {mode === 'load' ? (
            <label className="opmag2__check">
              <input
                type="checkbox"
                checked={state.updateSupplierPrice}
                onChange={e => patch({ updateSupplierPrice: e.target.checked })}
              />
              Aggiorna il prezzo fornitore
            </label>
          ) : null}
        </div>

        <div className="opmag2__lines-head">
          <span>{linesHeadLabel}</span>
          {mode === 'adjust' ? (
            <button type="button" className="opmag2__link" disabled>
              Azzera giacenza dei prodotti non in elenco
            </button>
          ) : (
            <button type="button" className="opmag2__link" disabled>
              Importa da terminale portatile
            </button>
          )}
        </div>

        <div className="opmag2__table-wrap">
          <table className="opmag2__table">
            <thead>
              <tr>
                <th>Cod.</th>
                <th>Cod. prod. forn.</th>
                <th>Prodotto</th>
                {mode === 'adjust' ? (
                  <>
                    <th className="opmag2__th-num">Giac. attuale</th>
                    <th className="opmag2__th-num">Nuova giac.</th>
                    <th>U.m.</th>
                  </>
                ) : (
                  <>
                    <th className="opmag2__th-num">Q.tà</th>
                    <th>U.m.</th>
                    <th className="opmag2__th-num">{amountHeader}</th>
                  </>
                )}
                <th className="opmag2__th-del" />
              </tr>
            </thead>
            <tbody>
              {state.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="opmag2__table-empty">
                    (Non vi sono dati da visualizzare)
                  </td>
                </tr>
              ) : (
                state.lines.map(line => (
                  <tr key={line.id}>
                    <td>{line.productCode}</td>
                    <td>{line.supplierCode || ''}</td>
                    <td>{line.productName}</td>
                    {mode === 'adjust' ? (
                      <>
                        <td className="opmag2__td-num">{line.currentStock}</td>
                        <td className="opmag2__td-num">
                          <input
                            type="number"
                            value={line.newStock}
                            onChange={e => updateLine(line.id, { newStock: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td>{line.um}</td>
                      </>
                    ) : (
                      <>
                        <td className="opmag2__td-num">
                          <input
                            type="number"
                            min={0}
                            value={line.quantity}
                            onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td>{line.um}</td>
                        <td className="opmag2__td-num">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={mode === 'load' ? line.unitCost : line.unitPrice}
                            onChange={e =>
                              updateLine(line.id, {
                                ...(mode === 'load'
                                  ? { unitCost: parseFloat(e.target.value) || 0 }
                                  : { unitPrice: parseFloat(e.target.value) || 0 }),
                              })
                            }
                          />
                        </td>
                      </>
                    )}
                    <td className="opmag2__td-del">
                      <button type="button" onClick={() => removeLine(line.id)} title="Rimuovi">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="opmag2__add">
          <span>Inserisci prodotto con</span>
          <select
            className="opmag2__add-field"
            value={searchField}
            onChange={e => setSearchField(e.target.value as 'descrizione' | 'codice')}
          >
            <option value="descrizione">descrizione</option>
            <option value="codice">codice</option>
          </select>
          <input
            className="opmag2__add-input"
            value={productSearch}
            onChange={e => {
              setProductSearch(e.target.value)
              setShowPicker(true)
            }}
            onFocus={() => setShowPicker(true)}
            placeholder=""
          />
          <button
            type="button"
            className="opmag2__add-btn"
            disabled={!filteredProducts[0]}
            onClick={() => filteredProducts[0] && addProduct(filteredProducts[0])}
          >
            <span aria-hidden="true">＋</span> Aggiungi
          </button>
        </div>

        {showPicker && filteredProducts.length > 0 ? (
          <ul className="opmag2__picker">
            {filteredProducts.map(p => (
              <li key={p.id}>
                <button type="button" className="opmag2__picker-item" onClick={() => addProduct(p)}>
                  <span className="opmag2__picker-code">{p.code}</span>
                  <span className="opmag2__picker-name">{p.name}</span>
                  <span className="opmag2__picker-stock">Giac. {p.stock ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {saveError ? <p className="opmag2__error">{saveError}</p> : null}

        <div className="opmag2__footer">
          <button
            type="button"
            className="opmag2__btn opmag2__btn--primary"
            disabled={saving || state.lines.length === 0}
            onClick={onSave}
          >
            {saving ? 'Salvataggio…' : 'OK'}
          </button>
          <button type="button" className="opmag2__btn" disabled title="Stampa etichette (non disponibile)">
            Etichette
          </button>
          <button type="button" className="opmag2__btn" onClick={onClose} disabled={saving}>
            Annulla
          </button>
          <button type="button" className="opmag2__btn opmag2__btn--help" disabled title="Aiuto">
            ?
          </button>
        </div>
      </div>

      {causaliOpen ? (
        <ElencoCausaliModal
          causali={causali}
          onChange={handleCausaliChange}
          onClose={() => setCausaliOpen(false)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
