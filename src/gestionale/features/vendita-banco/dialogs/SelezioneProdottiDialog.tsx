import { useCallback, useMemo, useState } from 'react'
import {
  addProduct,
  deleteProduct,
  getNextProductCode,
  updateProduct,
} from '../../../../lib/firestore'
import type { Category, Product } from '../../../../types'
import {
  categoryOptions,
  EMPTY_PRODUCT_FILTERS,
  filterProductsForSelection,
  formatCategoryPath,
  type ProductSelectionFilters,
} from '../productSelectionFilter'
import { calcRiga, emptyRiga, formatEuro, productListGrossPrice } from '../utils'
import type { RigaDocumento } from '../types'
import { WinButton, WinInput, WinSelect } from '../WinControls'

type Props = {
  products: Product[]
  categories: Category[]
  listino: string
  studioId: string
  onProductsChange: () => void
  onAdd: (riga: RigaDocumento) => void
  onClose: () => void
}

type GroupMode = 'none' | 'category'

type ColId = 'categoria' | 'codice' | 'descrizione' | 'produttore' | 'prezzo' | 'giacenza'

const DEFAULT_COLS: Record<ColId, boolean> = {
  categoria: true,
  codice: true,
  descrizione: true,
  produttore: true,
  prezzo: true,
  giacenza: false,
}

const UM_OPTIONS = ['pz', 'pr', 'kg', 'm', 'lt', 'h'] as const

function ModificaProdottoPanel({
  product,
  onSave,
  onCancel,
}: {
  product: Product
  onSave: (patch: { name: string; brand: string; price: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(product.name)
  const [brand, setBrand] = useState(product.brand || '')
  const [price, setPrice] = useState(String(product.prices?.privati ?? product.price ?? 0))

  return (
    <div className="vb-sp-modifica">
      <div className="vb-sp-modifica__title">Modifica prodotto — {product.code}</div>
      <div className="vb-sp-modifica__grid">
        <label>
          Descrizione
          <WinInput value={name} onChange={e => setName(e.target.value)} autoFocus />
        </label>
        <label>
          Produttore
          <WinInput value={brand} onChange={e => setBrand(e.target.value)} />
        </label>
        <label>
          Prezzo Privati
          <WinInput type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
        </label>
      </div>
      <div className="vb-sp-modifica__actions">
        <WinButton onClick={onCancel}>Annulla</WinButton>
        <WinButton
          onClick={() =>
            onSave({
              name: name.trim() || product.name,
              brand: brand.trim(),
              price: parseFloat(price) || 0,
            })
          }
        >
          Salva
        </WinButton>
      </div>
    </div>
  )
}

export default function SelezioneProdottiDialog({
  products,
  categories,
  listino,
  studioId,
  onProductsChange,
  onAdd,
  onClose,
}: Props) {
  const [filters, setFilters] = useState<ProductSelectionFilters>({ ...EMPTY_PRODUCT_FILTERS })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)
  const [um, setUm] = useState('pz')
  const [flashId, setFlashId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('none')
  const [filtraOpen, setFiltraOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [colonneOpen, setColonneOpen] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Record<ColId, boolean>>({ ...DEFAULT_COLS })
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [modificaTarget, setModificaTarget] = useState<Product | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const patchFilters = (patch: Partial<ProductSelectionFilters>) => setFilters(prev => ({ ...prev, ...patch }))

  const filtered = useMemo(
    () => filterProductsForSelection(products, filters, filtraOpen),
    [products, filters, filtraOpen],
  )

  const rows = useMemo(() => {
    if (groupMode === 'none') return filtered.map(p => ({ kind: 'product' as const, product: p }))
    const byCat = new Map<string, Product[]>()
    for (const p of filtered) {
      const cat = formatCategoryPath(p.categoryName) || '(Senza categoria)'
      const list = byCat.get(cat) || []
      list.push(p)
      byCat.set(cat, list)
    }
    const out: Array<
      { kind: 'group'; key: string; label: string; count: number } | { kind: 'product'; product: Product }
    > = []
    for (const [key, items] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it'))) {
      out.push({ kind: 'group', key, label: key, count: items.length })
      if (!collapsed.has(key)) items.forEach(product => out.push({ kind: 'product', product }))
    }
    return out
  }, [filtered, groupMode, collapsed])

  const selected = filtered.find(p => p.id === selectedId) || null
  const listinoColLabel = listino || 'Privati'

  const colSpan =
    1 +
    (visibleCols.categoria ? 1 : 0) +
    (visibleCols.codice ? 1 : 0) +
    (visibleCols.descrizione ? 1 : 0) +
    (visibleCols.produttore ? 1 : 0) +
    (visibleCols.prezzo ? 1 : 0) +
    (visibleCols.giacenza ? 1 : 0)

  const buildRiga = (p: Product, quantity: number, unit: string): RigaDocumento =>
    calcRiga({
      ...emptyRiga(),
      productId: p.id,
      cod: p.code || '',
      descrizione: p.name,
      um: unit || p.unitOfMeasure || 'pz',
      prezzoIvato: productListGrossPrice(p, listino),
      qta: quantity,
      iva: 22,
      scaricaMagazzino: p.typology === 'with_stock',
    })

  const flashAndToast = (p: Product, message: string) => {
    setFlashId(p.id)
    setToast(message)
    window.setTimeout(() => setFlashId(null), 900)
    window.setTimeout(() => setToast(null), 2500)
  }

  const addProducts = (items: Product[]) => {
    if (!items.length) {
      alert('Seleziona uno o più prodotti dalla griglia.')
      return
    }
    for (const p of items) {
      onAdd(buildRiga(p, qty, p.unitOfMeasure || um))
    }
    flashAndToast(items[items.length - 1], `Aggiunt${items.length === 1 ? 'a' : 'e'} ${items.length} voce/i.`)
  }

  const handleAggiungi = () => {
    if (selectionMode && checkedIds.size > 0) {
      addProducts(filtered.filter(p => checkedIds.has(p.id)))
      return
    }
    if (!selected) {
      alert('Seleziona un prodotto dalla griglia.')
      return
    }
    addProducts([selected])
  }

  const handleRowActivate = (p: Product) => {
    setSelectedId(p.id)
    setUm(p.unitOfMeasure || 'pz')
  }

  const handleRowDoubleClick = (p: Product) => {
    handleRowActivate(p)
    onAdd(buildRiga(p, qty, p.unitOfMeasure || um))
    flashAndToast(p, `Aggiunta: ${p.name}`)
  }

  const toggleChecked = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNuova = useCallback(async () => {
    const code = await getNextProductCode(studioId)
    const ref = await addProduct({
      studioId,
      code,
      name: 'Nuovo prodotto',
      categoryId: '',
      categoryName: '',
      brand: '',
      model: '',
      typology: 'with_stock',
      unitOfMeasure: 'pz',
      prices: { privati: 0 },
      price: 0,
      stock: 0,
    })
    onProductsChange()
    setSelectedId(ref.id)
    setModificaTarget(null)
    setToast('Prodotto creato.')
  }, [studioId, onProductsChange])

  const handleDuplica = useCallback(async () => {
    if (!selected) return
    const code = await getNextProductCode(studioId)
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = selected
    const ref = await addProduct({ ...rest, studioId, code, name: `${selected.name} (copia)` })
    onProductsChange()
    setSelectedId(ref.id)
    setToast('Prodotto duplicato.')
  }, [selected, studioId, onProductsChange])

  const handleElimina = useCallback(async () => {
    const target =
      selected ?? (checkedIds.size === 1 ? products.find(p => checkedIds.has(p.id)) : null)
    if (!target) {
      alert('Seleziona un prodotto da eliminare.')
      return
    }
    if (!confirm(`Eliminare il prodotto "${target.name}"?`)) return
    await deleteProduct(target.id)
    onProductsChange()
    setSelectedId(null)
    setCheckedIds(new Set())
    setModificaTarget(null)
    setToast('Prodotto eliminato.')
  }, [selected, checkedIds, products, onProductsChange])

  const handleSaveModifica = useCallback(
    async (patch: { name: string; brand: string; price: number }) => {
      if (!modificaTarget) return
      await updateProduct(modificaTarget.id, {
        name: patch.name,
        brand: patch.brand,
        prices: { ...modificaTarget.prices, privati: patch.price },
        price: patch.price,
      })
      onProductsChange()
      setModificaTarget(null)
      setToast('Prodotto aggiornato.')
    },
    [modificaTarget, onProductsChange],
  )

  const cats = categoryOptions(categories)

  return (
    <div className="vb-dialog-overlay vb-sp-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--selezione-prodotti">
        <div className="vb-dialog__titlebar vb-sp-titlebar">
          <span>Selezione prodotti</span>
        </div>

        <div className="vb-sp-toolbar">
          <div className="vb-sp-toolbar__search">
            <span className="vb-sp-toolbar__search-icon" aria-hidden="true">
              🔍
            </span>
            <WinInput
              className="vb-sp-toolbar__search-input"
              placeholder="Cerca codice, descrizione, categoria…"
              value={filters.quickSearch}
              onChange={e => patchFilters({ quickSearch: e.target.value })}
            />
          </div>
          <WinButton
            className={groupMode !== 'none' ? 'vb-sp-toolbar__btn--active' : undefined}
            onClick={() => setGroupMode(m => (m === 'none' ? 'category' : 'none'))}
          >
            Raggruppa
          </WinButton>
          <WinButton
            className={filtraOpen ? 'vb-sp-toolbar__btn--active' : undefined}
            onClick={() => setFiltraOpen(v => !v)}
          >
            Filtra
          </WinButton>
          <WinButton
            className={selectionMode ? 'vb-sp-toolbar__btn--active' : undefined}
            onClick={() => {
              setSelectionMode(v => !v)
              if (selectionMode) setCheckedIds(new Set())
            }}
          >
            Seleziona
          </WinButton>
          <div className="vb-sp-toolbar__colonne">
            <WinButton onClick={() => setColonneOpen(v => !v)}>Colonne ▾</WinButton>
            {colonneOpen ? (
              <div className="vb-sp-colonne-menu">
                {(Object.keys(DEFAULT_COLS) as ColId[]).map(id => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={visibleCols[id]}
                      onChange={() => setVisibleCols(prev => ({ ...prev, [id]: !prev[id] }))}
                    />
                    {id === 'prezzo' ? listinoColLabel : id.charAt(0).toUpperCase() + id.slice(1)}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {filtraOpen ? (
          <div className="vb-sp-filtri">
            <label>
              Codice / barcode
              <WinInput value={filters.codice} onChange={e => patchFilters({ codice: e.target.value })} />
            </label>
            <label>
              Descrizione
              <WinInput value={filters.descrizione} onChange={e => patchFilters({ descrizione: e.target.value })} />
            </label>
            <label>
              Categoria
              <WinSelect value={filters.categoriaId} onChange={e => patchFilters({ categoriaId: e.target.value })}>
                <option value="">(Tutte)</option>
                {cats.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {formatCategoryPath(cat.name)}
                  </option>
                ))}
              </WinSelect>
            </label>
            <label>
              Produttore
              <WinInput value={filters.produttore} onChange={e => patchFilters({ produttore: e.target.value })} />
            </label>
            <label className="vb-sp-filtri__check">
              <input
                type="checkbox"
                checked={filters.soloConGiacenza}
                onChange={e => patchFilters({ soloConGiacenza: e.target.checked })}
              />
              Solo con giacenza
            </label>
            <label className="vb-sp-filtri__check">
              <input
                type="checkbox"
                checked={filters.soloServizi}
                onChange={e => patchFilters({ soloServizi: e.target.checked })}
              />
              Solo servizi
            </label>
            <WinButton
              onClick={() => {
                setFilters({ ...EMPTY_PRODUCT_FILTERS })
              }}
            >
              Azzera filtri
            </WinButton>
          </div>
        ) : null}

        {modificaTarget ? (
          <ModificaProdottoPanel
            product={modificaTarget}
            onSave={patch => void handleSaveModifica(patch)}
            onCancel={() => setModificaTarget(null)}
          />
        ) : null}

        <div className="vb-selezione-grid-wrap">
          <table className="vb-selezione-grid vb-sp-grid">
            <thead>
              <tr>
                <th className="vb-sp-grid__check" />
                {visibleCols.categoria ? <th>Categoria</th> : null}
                {visibleCols.codice ? <th>Cod.</th> : null}
                {visibleCols.descrizione ? <th>Descrizione</th> : null}
                {visibleCols.produttore ? <th>Produttore</th> : null}
                {visibleCols.prezzo ? <th className="num">{listinoColLabel}</th> : null}
                {visibleCols.giacenza ? <th className="num">Giacenza</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.kind === 'group') {
                  const open = !collapsed.has(row.key)
                  return (
                    <tr
                      key={`g-${row.key}`}
                      className="vb-selezione-grid__group"
                      onClick={() =>
                        setCollapsed(prev => {
                          const next = new Set(prev)
                          if (next.has(row.key)) next.delete(row.key)
                          else next.add(row.key)
                          return next
                        })
                      }
                    >
                      <td colSpan={colSpan}>
                        {open ? '▼' : '▶'} {row.label} ({row.count})
                      </td>
                    </tr>
                  )
                }
                const p = row.product
                return (
                  <tr
                    key={p.id || i}
                    className={[
                      selectedId === p.id ? 'vb-selezione-grid__row--selected' : '',
                      flashId === p.id ? 'vb-selezione-grid__row--flash' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleRowActivate(p)}
                    onDoubleClick={() => handleRowDoubleClick(p)}
                  >
                    <td className="vb-sp-grid__check" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(p.id)}
                        disabled={!selectionMode}
                        onChange={() => toggleChecked(p.id)}
                      />
                    </td>
                    {visibleCols.categoria ? <td>{formatCategoryPath(p.categoryName)}</td> : null}
                    {visibleCols.codice ? <td>{p.code}</td> : null}
                    {visibleCols.descrizione ? <td>{p.name}</td> : null}
                    {visibleCols.produttore ? <td>{p.brand || ''}</td> : null}
                    {visibleCols.prezzo ? (
                      <td className="num">{formatEuro(productListGrossPrice(p, listino))}</td>
                    ) : null}
                    {visibleCols.giacenza ? (
                      <td className="num">{p.typology === 'with_stock' ? p.stock : '—'}</td>
                    ) : null}
                  </tr>
                )
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={colSpan} className="vb-muted" style={{ padding: 12 }}>
                    Nessun prodotto trovato. Modifica i filtri di ricerca.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="vb-sp-status">{filtered.length} voci</div>

        <div className="vb-selezione-actionbar vb-sp-actionbar">
          <div className="vb-sp-actionbar__left">
            <WinButton className="vb-sp-btn-aggiungi" onClick={handleAggiungi}>
              ➕ Aggiungi
            </WinButton>
            <WinInput
              type="number"
              min={0.001}
              step="any"
              className="vb-sp-qty"
              value={qty}
              onChange={e => setQty(Math.max(0.001, parseFloat(e.target.value) || 1))}
            />
            <WinSelect className="vb-sp-um" value={um} onChange={e => setUm(e.target.value)}>
              {UM_OPTIONS.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </WinSelect>
            <WinButton onClick={() => (selected ? setModificaTarget(selected) : alert('Seleziona un prodotto.'))}>
              Modifica
            </WinButton>
            <WinButton onClick={() => void handleNuova()}>Nuovo</WinButton>
            <WinButton onClick={() => void handleDuplica()} disabled={!selected}>
              Duplica
            </WinButton>
            <WinButton onClick={() => void handleElimina()}>Elimina</WinButton>
          </div>
          {toast ? <span className="vb-selezione-toast">{toast}</span> : null}
          <div className="vb-sp-actionbar__right">
            <button type="button" className="vb-sp-help" title="Aiuto" onClick={() => setShowHelp(true)}>
              ?
            </button>
            <WinButton className="vb-selezione-close" onClick={onClose}>
              ✕ Chiudi
            </WinButton>
          </div>
        </div>
      </div>

      {showHelp ? (
        <div className="vb-dialog-overlay vb-sp-help-overlay" onClick={() => setShowHelp(false)}>
          <div className="vb-dialog vb-dialog--sm" onClick={e => e.stopPropagation()}>
            <div className="vb-dialog__titlebar">
              <span>Selezione prodotti — Aiuto</span>
            </div>
            <div className="vb-dialog__body" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <p>
                <strong>Cerca:</strong> filtra in tempo reale per codice, descrizione, categoria, produttore o barcode.
              </p>
              <p>
                <strong>Filtra:</strong> criteri avanzati combinabili (categoria, giacenza, servizi).
              </p>
              <p>
                <strong>Raggruppa:</strong> raggruppa per categoria.
              </p>
              <p>
                <strong>Seleziona:</strong> abilita le caselle per aggiungere più prodotti insieme.
              </p>
              <p>
                <strong>Doppio clic</strong> su una riga per aggiungerla subito al documento.
              </p>
            </div>
            <div className="vb-dialog__footer">
              <WinButton onClick={() => setShowHelp(false)}>Chiudi</WinButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
