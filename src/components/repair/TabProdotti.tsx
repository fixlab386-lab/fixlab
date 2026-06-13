import { useState, useRef, useEffect } from 'react'
import type { Product, RepairProduct, Category } from '../../types'

interface Props {
  products: Product[]
  selected: RepairProduct[]
  search: string
  onSearch: (v: string) => void
  onAdd: (p: Product) => void
  onRemove: (productId: string) => void
  onChangeQty: (productId: string, qty: number) => void
  categories?: Category[]
}

function collectDescendantIds(catId: string, categories: Category[]): string[] {
  const children = categories.filter(c => c.parentId === catId)
  let ids = [catId]
  for (const child of children) ids = [...ids, ...collectDescendantIds(child.id, categories)]
  return ids
}

export default function TabProdotti({ products, selected, search, onSearch, onAdd, onRemove, onChangeQty, categories = [] }: Props) {
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [filterBrand, setFilterBrand] = useState<string | null>(null)
  const [filterStock, setFilterStock] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Suggestions: categories and brands that match search
  const getSuggestions = () => {
    if (!search.trim() || search.length < 2) return { cats: [] as Category[], brands: [] as string[] }
    const q = search.toLowerCase()
    const cats = categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5)
    const allBrands = new Set(products.map(p => (p.brand || '').trim()).filter(Boolean))
    const brands = Array.from(allBrands).filter(b => b.toLowerCase().includes(q)).slice(0, 3)
    return { cats, brands }
  }
  const suggestions = showSuggestions ? getSuggestions() : { cats: [], brands: [] }
  const hasSuggestions = suggestions.cats.length > 0 || suggestions.brands.length > 0

  // Filter
  const getFiltered = () => {
    let result = products

    if (filterCategoryId) {
      const ids = collectDescendantIds(filterCategoryId, categories)
      result = result.filter(p => ids.includes(p.categoryId))
    }

    if (filterBrand) {
      result = result.filter(p => (p.brand || '').toLowerCase() === filterBrand.toLowerCase())
    }

    if (filterStock === 'available') result = result.filter(p => p.stock > 0)
    else if (filterStock === 'out') result = result.filter(p => p.stock === 0)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.name + ' ' + p.model + ' ' + p.categoryName + ' ' + (p.brand || '') + ' ' + (p.color || '') + ' ' + (p.barcode || '')).toLowerCase().includes(q)
      )
    }

    return result
  }

  const filtered = getFiltered()

  // Available brands for current filter state
  const getAvailableBrands = () => {
    let pool = products
    if (filterCategoryId) {
      const ids = collectDescendantIds(filterCategoryId, categories)
      pool = pool.filter(p => ids.includes(p.categoryId))
    }
    const brands = new Map<string, number>()
    for (const p of pool) {
      const b = (p.brand || '').trim()
      if (b) brands.set(b, (brands.get(b) || 0) + 1)
    }
    return Array.from(brands.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  }
  const availableBrands = getAvailableBrands()

  const hasFilters = filterCategoryId !== null || filterBrand !== null || filterStock !== null
  const clearFilters = () => { setFilterCategoryId(null); setFilterBrand(null); setFilterStock(null); onSearch('') }

  const filterCategoryName = filterCategoryId ? (categories.find(c => c.id === filterCategoryId)?.name || '') : ''
  const filterCategoryEmoji = filterCategoryId ? (categories.find(c => c.id === filterCategoryId)?.emoji || '📦') : ''

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 8px', borderRadius: '14px', fontSize: '11px', fontWeight: 500, cursor: 'pointer',
    border: '1px solid', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '3px',
    background: active ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    borderColor: active ? 'var(--accent-border2)' : 'var(--border-secondary)',
    whiteSpace: 'nowrap' as const,
  })

  const outOfStockCount = products.filter(p => p.stock === 0).length

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Prodotti e ricambi</div>

      {/* Smart search with suggestions */}
      <div ref={searchBoxRef} style={{ position: 'relative', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', border: `1px solid ${showSuggestions ? 'var(--accent-border2)' : 'var(--border-secondary)'}`, borderRadius: '8px', padding: '7px 12px', transition: 'border-color 0.15s' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>🔍</span>
          <input value={search}
            onChange={e => { onSearch(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Cerca prodotto, categoria, marca, barcode..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'inherit', flex: 1 }} />
          {search && <button onClick={() => { onSearch(''); setShowSuggestions(false) }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px' }}>×</button>}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && hasSuggestions && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', overflow: 'hidden', zIndex: 50, boxShadow: '0 4px 16px var(--shadow)' }}>
            {suggestions.cats.length > 0 && (
              <>
                <div style={{ padding: '5px 12px', fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-tertiary)' }}>Categorie</div>
                {suggestions.cats.map(c => (
                  <div key={c.id} onClick={() => { setFilterCategoryId(c.id); setFilterBrand(null); onSearch(''); setShowSuggestions(false) }}
                    style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span>{c.emoji}</span>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {products.filter(p => collectDescendantIds(c.id, categories).includes(p.categoryId)).length} prodotti
                    </span>
                  </div>
                ))}
              </>
            )}
            {suggestions.brands.length > 0 && (
              <>
                <div style={{ padding: '5px 12px', fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-tertiary)', borderTop: suggestions.cats.length > 0 ? '1px solid var(--border-primary)' : 'none' }}>Marche</div>
                {suggestions.brands.map(b => (
                  <div key={b} onClick={() => { setFilterBrand(b); onSearch(''); setShowSuggestions(false) }}
                    style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span>🏷️</span>
                    <span style={{ fontWeight: 500 }}>Filtra: {b}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips + quick brand/stock chips */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center', minHeight: '24px' }}>
        {/* Active chips */}
        {filterCategoryId && <span style={chipStyle(true)} onClick={() => { setFilterCategoryId(null); setFilterBrand(null) }}>{filterCategoryEmoji} {filterCategoryName} ×</span>}
        {filterBrand && <span style={chipStyle(true)} onClick={() => setFilterBrand(null)}>🏷️ {filterBrand} ×</span>}
        {filterStock && <span style={chipStyle(true)} onClick={() => setFilterStock(null)}>{filterStock === 'available' ? '✅ Disponibili' : '❌ Esauriti'} ×</span>}

        {/* Quick brand chips (show when category is active and no brand selected) */}
        {filterCategoryId && !filterBrand && availableBrands.length > 1 && availableBrands.slice(0, 4).map(b => (
          <span key={b.name} style={chipStyle(false)} onClick={() => setFilterBrand(b.name)}>
            {b.name} <span style={{ fontSize: '9px', opacity: 0.5 }}>{b.count}</span>
          </span>
        ))}

        {/* Stock quick filter */}
        {!filterStock && outOfStockCount > 0 && (
          <span style={{ ...chipStyle(false), borderColor: 'var(--danger-border)', color: 'var(--danger)' }} onClick={() => setFilterStock('out')}>
            ❌ Esauriti {outOfStockCount}
          </span>
        )}

        {/* Reset */}
        {hasFilters && <span style={{ ...chipStyle(false), borderColor: 'var(--danger-border)', color: 'var(--danger)', marginLeft: 'auto' }} onClick={clearFilters}>✕ Reset</span>}
      </div>

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
            {products.length === 0 ? 'Nessun prodotto in magazzino' : 'Nessun risultato'}
            {(hasFilters || search) && <div style={{ marginTop: '6px' }}><span onClick={() => { clearFilters(); onSearch('') }} style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Rimuovi filtri</span></div>}
          </div>
        )}
        {filtered.map(p => {
          const selItem = selected.find(x => x.productId === p.id)
          const isAdded = !!selItem
          const noStock = p.stock === 0
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: isAdded ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
              border: `1px solid ${isAdded ? 'var(--accent-border)' : 'var(--border-primary)'}`,
              borderRadius: '8px', padding: '9px 12px',
              opacity: noStock && !isAdded ? 0.4 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{p.brand} {p.model} {p.color ? `· ${p.color}` : ''}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.categoryName}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>€ {p.price.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: noStock ? 'var(--danger)' : 'var(--text-muted)' }}>{noStock ? 'esaurito' : `disp: ${p.stock}`}</div>
                </div>
                {isAdded ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => { if (selItem.qty <= 1) onRemove(p.id); else onChangeQty(p.id, selItem.qty - 1) }} style={{
                      width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--danger-border)',
                      background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '16px', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                    }}>−</button>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', minWidth: '16px', textAlign: 'center' }}>{selItem.qty}</span>
                    <button onClick={() => !noStock && onChangeQty(p.id, selItem.qty + 1)} style={{
                      width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--accent-border2)',
                      background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: '16px', fontWeight: 700,
                      cursor: noStock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      opacity: noStock ? 0.4 : 1
                    }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => !noStock && onAdd(p)} style={{
                    width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--accent-border2)',
                    background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: '16px', fontWeight: 700,
                    cursor: noStock ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                  }}>+</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>SELEZIONATI ({selected.length})</div>
          {selected.map(p => (
            <div key={p.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-tertiary)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500 }}>{p.name} ×{p.qty}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{p.model}</div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginRight: '8px', flexShrink: 0 }}>€ {(p.price * p.qty).toFixed(2)}</span>
              <button onClick={() => onRemove(p.productId)} style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            </div>
          ))}
          <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
            Totale prodotti: € {selected.reduce((t, p) => t + p.price * p.qty, 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}