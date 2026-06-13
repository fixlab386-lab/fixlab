import { useCallback, useMemo, useState } from 'react'
import {
  addProduct,
  deleteProduct,
  getNextProductCode,
  updateProduct,
} from '../../../../lib/firestore'
import type { Product } from '../../../../types'
import { calcRiga, emptyRiga, productListGrossPrice } from '../utils'
import type { RigaDocumento } from '../types'
import { WinButton, WinInput, WinSelect } from '../WinControls'

type Props = {
  products: Product[]
  listino: string
  studioId: string
  onProductsChange: () => void
  onAdd: (riga: RigaDocumento) => void
  onClose: () => void
}

type GroupMode = 'none' | 'category'

export default function SelezioneProdottiDialog({
  products,
  listino,
  studioId,
  onProductsChange,
  onAdd,
  onClose,
}: Props) {
  const [quickCode, setQuickCode] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)
  const [um, setUm] = useState('pz')
  const [flashId, setFlashId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('none')
  const [filtraAttivo, setFiltraAttivo] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [showColonne, setShowColonne] = useState(false)
  const [showProduttore, setShowProduttore] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = quickCode.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      p =>
        (p.code || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q),
    )
  }, [products, quickCode])

  const rows = useMemo(() => {
    if (groupMode === 'none') return filtered.map(p => ({ kind: 'product' as const, product: p }))
    const byCat = new Map<string, Product[]>()
    for (const p of filtered) {
      const cat = p.categoryName || '(Senza categoria)'
      const list = byCat.get(cat) || []
      list.push(p)
      byCat.set(cat, list)
    }
    const out: Array<{ kind: 'group'; key: string; label: string; count: number } | { kind: 'product'; product: Product }> = []
    for (const [key, items] of [...byCat.entries()].sort((a, b) => a[0].localeCompare(b[0], 'it'))) {
      out.push({ kind: 'group', key, label: key, count: items.length })
      if (!collapsed.has(key)) items.forEach(product => out.push({ kind: 'product', product }))
    }
    return out
  }, [filtered, groupMode, collapsed])

  const selected = filtered.find(p => p.id === selectedId) || null

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

  const handleAggiungi = () => {
    if (!selected) {
      alert('Seleziona un prodotto dalla griglia.')
      return
    }
    const riga = buildRiga(selected, qty, um)
    onAdd(riga)
    setFlashId(selected.id)
    setToast(`Aggiunta 1 voce: ${selected.name}`)
    window.setTimeout(() => setFlashId(null), 900)
    window.setTimeout(() => setToast(null), 2500)
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
    const target = selected ?? (selectedIds.size === 1 ? products.find(p => selectedIds.has(p.id)) : null)
    if (!target) {
      alert('Seleziona un prodotto da eliminare.')
      return
    }
    if (!confirm(`Eliminare il prodotto "${target.name}"?`)) return
    await deleteProduct(target.id)
    onProductsChange()
    setSelectedId(null)
    setToast('Prodotto eliminato.')
  }, [selected, selectedIds, products, onProductsChange])

  const handleModifica = useCallback(async () => {
    if (!selected) {
      alert('Seleziona un prodotto.')
      return
    }
    const name = window.prompt('Descrizione prodotto:', selected.name)
    if (name === null) return
    const priceStr = window.prompt('Prezzo Privati:', String(selected.prices?.privati ?? selected.price ?? 0))
    const price = priceStr ? parseFloat(priceStr) : selected.price
    await updateProduct(selected.id, {
      name: name.trim() || selected.name,
      prices: { ...selected.prices, privati: price },
      price,
    })
    onProductsChange()
    setToast('Prodotto aggiornato.')
  }, [selected, onProductsChange])

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--fullscreen">
        <div className="vb-dialog__titlebar">
          <span>Selezione prodotti</span>
        </div>

        <div className="vb-dialog__toolbar vb-selezione-toolbar">
          <WinInput
            className="vb-input--flex"
            placeholder="Cerca codice"
            value={quickCode}
            onChange={e => setQuickCode(e.target.value)}
          />
          <WinButton onClick={() => setGroupMode(m => (m === 'none' ? 'category' : 'none'))}>
            Raggruppa{groupMode !== 'none' ? ' ✓' : ''}
          </WinButton>
          <WinButton onClick={() => setFiltraAttivo(v => !v)}>Filtra{filtraAttivo ? ' ✓' : ''}</WinButton>
          <WinButton
            onClick={() => {
              setSelectionMode(v => !v)
              if (selectionMode) setSelectedIds(new Set())
            }}
          >
            Selezione{selectionMode ? ' ✓' : ''}
          </WinButton>
          <WinButton onClick={() => setShowColonne(v => !v)}>Colonne ▼</WinButton>
          {showColonne ? (
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={showProduttore} onChange={e => setShowProduttore(e.target.checked)} />
              Produttore
            </label>
          ) : null}
        </div>

        {filtraAttivo ? (
          <div style={{ padding: '4px 8px', fontSize: 11, background: '#f5f5f5' }}>
            Filtro attivo: usa la casella «Cerca codice» per filtrare l&apos;elenco.
          </div>
        ) : null}

        <div className="vb-selezione-grid-wrap">
          <table className="vb-selezione-grid">
            <thead>
              <tr>
                {selectionMode ? <th style={{ width: 24 }} /> : null}
                <th>Categoria</th>
                <th>Codice</th>
                <th>Descrizione</th>
                {showProduttore ? <th>Produttore</th> : null}
                <th className="num">Privati</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                if (row.kind === 'group') {
                  const open = !collapsed.has(row.key)
                  return (
                    <tr key={`g-${row.key}`} className="vb-selezione-grid__group" onClick={() => setCollapsed(prev => {
                      const next = new Set(prev)
                      if (next.has(row.key)) next.delete(row.key)
                      else next.add(row.key)
                      return next
                    })}>
                      <td colSpan={selectionMode ? (showProduttore ? 6 : 5) : showProduttore ? 5 : 4}>
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
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      setSelectedId(p.id)
                      setUm(p.unitOfMeasure || 'pz')
                    }}
                  >
                    {selectionMode ? (
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => {
                            setSelectedIds(prev => {
                              const next = new Set(prev)
                              if (next.has(p.id)) next.delete(p.id)
                              else next.add(p.id)
                              return next
                            })
                          }}
                        />
                      </td>
                    ) : null}
                    <td>{p.categoryName}</td>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    {showProduttore ? <td>{p.brand || '—'}</td> : null}
                    <td className="num">{productListGrossPrice(p, listino).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="vb-selezione-actionbar">
          <div className="vb-row">
            <WinButton onClick={handleAggiungi}>+ Aggiungi</WinButton>
            <WinInput type="number" min={1} style={{ width: 48 }} value={qty} onChange={e => setQty(Math.max(1, parseFloat(e.target.value) || 1))} />
            <WinSelect value={um} onChange={e => setUm(e.target.value)} style={{ width: 64 }}>
              <option value="pz">pz</option>
              <option value="pr">pr</option>
              <option value="kg">kg</option>
              <option value="m">m</option>
            </WinSelect>
            <WinButton onClick={() => void handleModifica()}>Modifica</WinButton>
            <WinButton onClick={() => void handleNuova()}>Nuova</WinButton>
            <WinButton onClick={() => void handleDuplica()}>Duplica</WinButton>
            <WinButton onClick={() => void handleElimina()}>Elimina</WinButton>
          </div>
          {toast ? <span className="vb-selezione-toast">{toast}</span> : null}
          <WinButton className="vb-selezione-close" onClick={onClose}>
            ✕ Chiudi
          </WinButton>
        </div>
      </div>
    </div>
  )
}
