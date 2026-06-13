import { memo, useMemo, useState } from 'react'
import type { Category, Product } from '../../types'
import { getChildCategories, getRootCategories } from '../../gestionale/lib/categoryUtils'
import {
  EMPTY_PRODUCT_SEARCH_CRITERIA,
  filterProductsByCriteria,
  type ProductSearchCriteria,
} from '../../lib/productSearch'
import { FormField } from '../ui'
import '../../theme/gestionale-dialog.css'
import '../../theme/product-search-dialog.css'

const CategoryTreeNode = memo(function CategoryTreeNode({
  category,
  categories,
  selectedId,
  depth,
  onSelect,
}: {
  category: Category
  categories: Category[]
  selectedId: string | null
  depth: number
  onSelect: (id: string) => void
}) {
  const children = getChildCategories(categories, category.id)
  const hasChildren = children.length > 0
  const isSelected = selectedId === category.id
  const [expanded, setExpanded] = useState(depth < 1)

  return (
    <div>
      <div
        className={`product-search-dialog__tree-node${isSelected ? ' product-search-dialog__tree-node--active' : ''}`}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
        onClick={() => onSelect(category.id)}
      >
        <button
          type="button"
          className="product-search-dialog__tree-toggle"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={e => {
            e.stopPropagation()
            setExpanded(v => !v)
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="product-search-dialog__tree-name">{category.name}</span>
      </div>
      {expanded
        ? children.map(child => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              categories={categories}
              selectedId={selectedId}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  )
})

type Props = {
  products: Product[]
  categories: Category[]
  initialCode?: string
  onSelect: (product: Product) => void
  onClose: () => void
}

export default function ProductSearchDialog({
  products,
  categories,
  initialCode = '',
  onSelect,
  onClose,
}: Props) {
  const [criteria, setCriteria] = useState<ProductSearchCriteria>({
    ...EMPTY_PRODUCT_SEARCH_CRITERIA,
    code: initialCode,
  })
  const [categoryTreeId, setCategoryTreeId] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [searchTick, setSearchTick] = useState(0)

  const results = useMemo(() => {
    void searchTick
    const filtered = filterProductsByCriteria(products, criteria, { categoryTreeId, categories })
    return [...filtered].sort((a, b) => {
      const codeCmp = (a.code || '').localeCompare(b.code || '', 'it', { numeric: true })
      if (codeCmp !== 0) return codeCmp
      return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
    })
  }, [products, criteria, categoryTreeId, categories, searchTick])

  const selectedProduct = useMemo(
    () => results.find(p => p.id === selectedProductId) ?? null,
    [results, selectedProductId],
  )

  const roots = useMemo(() => getRootCategories(categories), [categories])

  const patchCriteria = (patch: Partial<ProductSearchCriteria>) => {
    setCriteria(prev => ({ ...prev, ...patch }))
  }

  const runSearch = () => setSearchTick(t => t + 1)

  const confirmSelection = (product: Product | null) => {
    if (product) onSelect(product)
  }

  const hasActiveCriteria =
    Object.values(criteria).some(v => v.trim()) || Boolean(categoryTreeId)

  return (
    <div className="gestionale-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="product-search-title">
      <div className="gestionale-dialog-card gestionale-dialog-card--wide product-search-dialog">
        <div className="gestionale-dialog-card__header">
          <h2 id="product-search-title" className="gestionale-dialog-card__title">
            Ricerca prodotti
          </h2>
        </div>

        <div className="gestionale-dialog-card__body product-search-dialog__body">
          <p className="product-search-dialog__intro">
            Compilare uno o più dei campi di ricerca e premere Invio
          </p>

          <div className="product-search-dialog__filters">
            <FormField label="Codice" htmlFor="product-search-code">
              <input
                id="product-search-code"
                className="gestionale-form-field__input"
                value={criteria.code}
                onChange={e => patchCriteria({ code: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                autoFocus
              />
            </FormField>
            <FormField label="Descrizione" htmlFor="product-search-desc">
              <input
                id="product-search-desc"
                className="gestionale-form-field__input"
                value={criteria.description}
                onChange={e => patchCriteria({ description: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <FormField label="Categoria" htmlFor="product-search-category">
              <input
                id="product-search-category"
                className="gestionale-form-field__input"
                value={criteria.category}
                onChange={e => patchCriteria({ category: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
              />
            </FormField>
            <button
              type="button"
              className="gestionale-dialog-btn gestionale-dialog-btn--primary product-search-dialog__search-btn"
              onClick={runSearch}
            >
              Cerca
            </button>
          </div>

          <div className="product-search-dialog__main">
            <div className="product-search-dialog__tree">
              <p className="product-search-dialog__tree-title">Categoria</p>
              <button
                type="button"
                className={`product-search-dialog__tree-all${categoryTreeId === null ? ' product-search-dialog__tree-all--active' : ''}`}
                onClick={() => setCategoryTreeId(null)}
              >
                Tutte le categorie
              </button>
              {roots.map(cat => (
                <CategoryTreeNode
                  key={cat.id}
                  category={cat}
                  categories={categories}
                  selectedId={categoryTreeId}
                  depth={0}
                  onSelect={setCategoryTreeId}
                />
              ))}
            </div>

            <div className="product-search-dialog__results">
              <p className="product-search-dialog__hint">
                Elenco voci che{' '}
                <span className="product-search-dialog__hint-link">contengono</span> le parole immesse
                {hasActiveCriteria ? ` — ${results.length} prodotto/i` : ` — ${results.length} prodotto/i totali`}
              </p>

              <div className="product-search-dialog__table-wrap">
                <table className="product-search-dialog__table">
                  <thead>
                    <tr>
                      <th>Codice</th>
                      <th>Descrizione</th>
                      <th>Categoria</th>
                      <th>Q.tà disponibile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="product-search-dialog__empty">
                          (Non vi sono dati da visualizzare)
                        </td>
                      </tr>
                    ) : (
                      results.map(product => (
                        <tr
                          key={product.id}
                          className={`product-search-dialog__row${selectedProductId === product.id ? ' product-search-dialog__row--selected' : ''}`}
                          onClick={() => setSelectedProductId(product.id)}
                          onDoubleClick={() => confirmSelection(product)}
                        >
                          <td>{product.code || '—'}</td>
                          <td>{product.name}</td>
                          <td>{product.categoryName || '—'}</td>
                          <td>{product.typology === 'with_stock' ? product.stock : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="gestionale-dialog-card__footer product-search-dialog__footer">
          <button
            type="button"
            className="gestionale-dialog-btn gestionale-dialog-btn--primary"
            onClick={() => confirmSelection(selectedProduct)}
            disabled={!selectedProduct}
          >
            OK
          </button>
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
