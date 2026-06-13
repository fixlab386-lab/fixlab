import { useMemo, useState } from 'react'
import type { Category, Product } from '../../../../types'
import { productListGrossPrice, formatEuro } from '../utils'
import { WinButton, WinInput, WinSelect } from '../WinControls'

type Props = {
  products: Product[]
  categories: Category[]
  listino: string
  onSelect: (product: Product) => void
  onClose: () => void
}

export default function RicercaProdottiDialog({ products, categories, listino, onSelect, onClose }: Props) {
  const [codice, setCodice] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [searched, setSearched] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scheda, setScheda] = useState<Product | null>(null)

  const results = useMemo(() => {
    if (!searched) return []
    const c = codice.trim().toLowerCase()
    const d = descrizione.trim().toLowerCase()
    return products.filter(p => {
      if (c && !(p.code || '').toLowerCase().includes(c)) return false
      if (d && !(p.name || '').toLowerCase().includes(d)) return false
      if (categoriaId && p.categoryId !== categoriaId) return false
      return true
    })
  }, [products, codice, descrizione, categoriaId, searched])

  const selected = results.find(p => p.id === selectedId) || null

  const runSearch = () => setSearched(true)

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
              <WinInput value={codice} onChange={e => setCodice(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
            </div>
            <div className="vb-field">
              <label className="vb-field__label">Descrizione</label>
              <WinInput value={descrizione} onChange={e => setDescrizione(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
            </div>
            <div className="vb-field">
              <label className="vb-field__label">Categoria</label>
              <WinSelect value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
                <option value="">(Tutte)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </WinSelect>
            </div>
            <WinButton className="vb-ricerca-filtri__cerca" onClick={runSearch}>
              🔍 Cerca
            </WinButton>
          </div>

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
                      {searched ? 'Nessun prodotto trovato.' : 'Premi Cerca per visualizzare il magazzino.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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
