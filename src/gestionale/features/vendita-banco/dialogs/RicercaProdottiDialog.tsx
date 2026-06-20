import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, Product } from '../../../../types'
import CategoryTreeFilter from '../../../components/CategoryTreeFilter'
import { productListGrossPrice, formatEuro } from '../utils'
import { WinButton, WinInput } from '../WinControls'
import { loadRecentProducts } from '../../../../lib/loadStudioCatalog'
import { searchProducts } from '../../../../lib/firestorePagination'
import { matchesProductCategoryTree } from '../../../lib/categoryUtils'
import '../../../theme/category-tree.css'

type Props = {
  studioId: string
  /** Fallback legacy se studioId mancante. */
  products?: Product[]
  categories: Category[]
  listino: string
  onSelect: (product: Product) => void
  onClose: () => void
}

export default function RicercaProdottiDialog({
  studioId,
  products = [],
  categories,
  listino,
  onSelect,
  onClose,
}: Props) {
  const [codice, setCodice] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scheda, setScheda] = useState<Product | null>(null)

  const selected = results.find(p => p.id === selectedId) || null

  const runSearch = useCallback(async () => {
    setSearching(true)
    setSearched(true)
    try {
      const term = [codice, descrizione].map(s => s.trim()).filter(Boolean).join(' ')
      let items: Product[]
      if (studioId) {
        items = await searchProducts(studioId, term, 60)
      } else {
        const c = codice.trim().toLowerCase()
        const d = descrizione.trim().toLowerCase()
        items = products.filter(p => {
          if (c && !(p.code || '').toLowerCase().includes(c)) return false
          if (d && !(p.name || '').toLowerCase().includes(d)) return false
          return true
        })
      }
      if (categoriaId) items = items.filter(p => matchesProductCategoryTree(p, categoriaId, categories))
      setResults(items)
    } finally {
      setSearching(false)
    }
  }, [studioId, codice, descrizione, categoriaId, categories, products])

  const categorySelectOptions = useMemo(
    () =>
      results.map(p => ({
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
      })),
    [results],
  )

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    void loadRecentProducts(studioId, 40).then(data => {
      if (!cancelled) {
        setResults(data)
        setSearched(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [studioId])

  const handleOk = () => {
    if (!selected) {
      alert('Seleziona un prodotto dalla lista.')
      return
    }
    onSelect(selected)
  }

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--xl">
        <div className="vb-dialog__titlebar">
          <span>Ricerca prodotti</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-dialog__body">
          <div className="vb-ricerca-filtri">
            <div className="vb-field">
              <label className="vb-field__label">Codice</label>
              <WinInput value={codice} onChange={e => setCodice(e.target.value)} onKeyDown={e => e.key === 'Enter' && void runSearch()} />
            </div>
            <div className="vb-field">
              <label className="vb-field__label">Descrizione</label>
              <WinInput value={descrizione} onChange={e => setDescrizione(e.target.value)} onKeyDown={e => e.key === 'Enter' && void runSearch()} />
            </div>
            <WinButton className="vb-ricerca-filtri__cerca" onClick={() => void runSearch()} disabled={searching}>
              {searching ? '…' : '🔍 Cerca'}
            </WinButton>
          </div>

          <div className="vb-ricerca-main">
            <CategoryTreeFilter
              categories={categories}
              products={categorySelectOptions}
              selectedId={categoriaId || null}
              onSelect={id => setCategoriaId(id ?? '')}
              title="Categoria"
              className="vb-ricerca-main__tree"
            />

            <div className="vb-ricerca-grid-wrap">
            <table className="vb-ricerca-grid">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Descrizione</th>
                  <th>Categoria</th>
                  <th className="num">Q.tà disponibile</th>
                </tr>
              </thead>
              <tbody>
                {results.map(p => (
                  <tr
                    key={p.id}
                    className={selectedId === p.id ? 'vb-ricerca-grid__row--selected' : undefined}
                    onClick={() => {
                      setSelectedId(p.id)
                      setScheda(p)
                    }}
                    onDoubleClick={() => onSelect(p)}
                  >
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.categoryName}</td>
                    <td className="num">{p.typology === 'with_stock' ? p.stock : '—'}</td>
                  </tr>
                ))}
                {!results.length ? (
                  <tr>
                    <td colSpan={4} className="vb-muted">
                      {searching
                        ? 'Ricerca in corso…'
                        : searched
                          ? 'Nessun prodotto trovato.'
                          : 'Premi Cerca per visualizzare il magazzino.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </div>

          {scheda ? (
            <div className="vb-scheda-prodotto">
              <div className="vb-scheda-prodotto__titlebar">
                <span>Scheda prodotto — {scheda.code}</span>
                <button type="button" className="vb-icon-btn" onClick={() => setScheda(null)}>
                  ✕
                </button>
              </div>
              <div className="vb-scheda-prodotto__body">
                <div>
                  <strong>Codice:</strong> {scheda.code}
                </div>
                <div>
                  <strong>Descrizione:</strong> {scheda.name}
                </div>
                <div>
                  <strong>Categoria:</strong> {scheda.categoryName}
                </div>
                <div>
                  <strong>U.m.:</strong> {scheda.unitOfMeasure || 'pzz'}
                </div>
                <table className="vb-scheda-prodotto__prezzi">
                  <thead>
                    <tr>
                      <th>Listino</th>
                      <th>Netto</th>
                      <th>Ivato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['Privati', 'Aziende', 'Convenzionati', 'VIP'] as const).map(label => {
                      const gross = productListGrossPrice(scheda, label)
                      const net = Math.round((gross / 1.22) * 100) / 100
                      return (
                        <tr key={label}>
                          <td>{label}</td>
                          <td>{formatEuro(net)}</td>
                          <td>{formatEuro(gross)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="vb-dialog__footer">
          <WinButton onClick={handleOk}>OK</WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
        </div>
      </div>
    </div>
  )
}
