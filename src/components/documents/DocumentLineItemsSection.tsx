import { useMemo, useState } from 'react'
import type { Category, DocumentRow, Product } from '../../types'
import ProductSearchDialog from '../products/ProductSearchDialog'
import { DataTable, type DataTableColumn } from '../ui'
import { calcDocumentRow, emptyDocumentRow } from './documentLineUtils'
import { useStudioTables } from '../../contexts/StudioTablesContext'
import { aliquotaValues } from '../../lib/studioTables'

type Props = {
  products: Product[]
  categories?: Category[]
  rows: DocumentRow[]
  priceList: 'privati' | 'aziende' | 'convenzionati' | 'vip'
  onChange: (rows: DocumentRow[]) => void
  variant?: 'default' | 'vendita_banco'
}

function productPrice(p: Product, list: Props['priceList']): number {
  if (list === 'aziende') return p.prices?.aziende || p.price
  if (list === 'convenzionati') return p.prices?.convenzionati || p.price
  if (list === 'vip') return p.prices?.vip || p.price
  return p.price
}

function grossPrice(net: number, vatRate: number): number {
  return Math.round(net * (1 + vatRate / 100) * 100) / 100
}

function netFromGross(gross: number, vatRate: number): number {
  if (vatRate <= 0) return gross
  return Math.round((gross / (1 + vatRate / 100)) * 100) / 100
}

function ensureTrailingEmptyRow(nextRows: DocumentRow[]): DocumentRow[] {
  if (nextRows.length === 0 || nextRows[nextRows.length - 1].description) {
    return [...nextRows, emptyDocumentRow()]
  }
  return nextRows
}

export default function DocumentLineItemsSection({
  products,
  categories = [],
  rows,
  priceList,
  onChange,
  variant = 'default',
}: Props) {
  const isVenditaBanco = variant === 'vendita_banco'
  const { tables } = useStudioTables()
  const ivaOptions = useMemo(() => aliquotaValues(tables.aliquoteIva), [tables.aliquoteIva])
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchRowIndex, setProductSearchRowIndex] = useState<number | null>(null)
  const [productSearchInitialCode, setProductSearchInitialCode] = useState('')

  const searchLower = search.trim().toLowerCase()
  const filteredProducts = useMemo(() => {
    if (!searchLower) return products.slice(0, 12)
    return products
      .filter(p => `${p.code} ${p.name} ${p.brand} ${p.model}`.toLowerCase().includes(searchLower))
      .slice(0, 12)
  }, [products, searchLower])

  const updateRow = (index: number, patch: Partial<DocumentRow>) => {
    onChange(rows.map((r, i) => (i === index ? calcDocumentRow({ ...r, ...patch }) : r)))
  }

  const applyProductToRow = (p: Product, rowIndex: number | null) => {
    const row = calcDocumentRow({
      ...emptyDocumentRow(),
      productId: p.id,
      productCode: p.code || '',
      description: p.name,
      unitOfMeasure: p.unitOfMeasure || 'pz',
      unitPrice: productPrice(p, priceList),
      quantity: 1,
      vatRate: 22,
    })

    if (rowIndex !== null && rowIndex >= 0 && rowIndex < rows.length) {
      const updated = rows.map((r, i) => (i === rowIndex ? { ...row, id: r.id } : r))
      onChange(isVenditaBanco ? ensureTrailingEmptyRow(updated) : updated)
    } else {
      const filled = [...rows.filter(r => r.description), row]
      onChange(isVenditaBanco ? ensureTrailingEmptyRow(filled) : filled)
    }

    setShowProductSearch(false)
    setShowPicker(false)
    setSearch('')
    setProductSearchRowIndex(null)
    setProductSearchInitialCode('')
  }

  const addFromCatalog = (p: Product) => applyProductToRow(p, null)

  const openProductSearch = (rowIndex: number | null, initialCode = '') => {
    setProductSearchRowIndex(rowIndex)
    setProductSearchInitialCode(initialCode)
    setShowProductSearch(true)
  }

  const tableRows = rows.map((r, i) => ({ ...r, _index: i }))

  const defaultColumns: DataTableColumn<DocumentRow & { _index: number }>[] = [
    {
      id: 'code',
      header: 'Cod.',
      width: 64,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.productCode || ''}
          onChange={e => updateRow(row._index, { productCode: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'desc',
      header: 'Descrizione',
      minWidth: 140,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.description}
          onChange={e => updateRow(row._index, { description: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'qty',
      header: 'Q.tà',
      width: 52,
      render: row => (
        <input
          type="number"
          min={0}
          step={1}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.quantity}
          onChange={e => updateRow(row._index, { quantity: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'um',
      header: 'U.M.',
      width: 44,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.unitOfMeasure || 'pz'}
          onChange={e => updateRow(row._index, { unitOfMeasure: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'price',
      header: 'Prezzo',
      width: 76,
      render: row => (
        <input
          type="number"
          min={0}
          step={0.01}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.unitPrice}
          onChange={e => updateRow(row._index, { unitPrice: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'discount',
      header: 'Sconto%',
      width: 52,
      render: row => (
        <input
          type="number"
          min={0}
          max={100}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.discount || 0}
          onChange={e => updateRow(row._index, { discount: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'vat',
      header: 'IVA%',
      width: 52,
      render: row => (
        <select
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.vatRate}
          onChange={e => updateRow(row._index, { vatRate: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        >
          {(ivaOptions.includes(row.vatRate) ? ivaOptions : [...ivaOptions, row.vatRate].sort((a, b) => a - b)).map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'amount',
      header: 'Importo',
      width: 80,
      align: 'right',
      render: row => `€ ${calcDocumentRow(row).total.toFixed(2)}`,
    },
    {
      id: 'actions',
      header: '',
      width: 36,
      render: row => (
        <button
          type="button"
          className="gestionale-tool-btn"
          onClick={() => onChange(rows.filter((_, i) => i !== row._index))}
          title="Rimuovi riga"
        >
          ✕
        </button>
      ),
    },
  ]

  const venditaBancoColumns: DataTableColumn<DocumentRow & { _index: number }>[] = [
    {
      id: 'code',
      header: 'Cod.',
      width: 72,
      render: row => (
        <div className="gestionale-doc-lines__code-cell">
          <input
            className="gestionale-form-field__input gestionale-repair-line-input gestionale-doc-lines__code-input"
            value={row.productCode || ''}
            readOnly
            onClick={() => openProductSearch(row._index, row.productCode || '')}
            title="Clicca per ricerca prodotto"
          />
          <button
            type="button"
            className="gestionale-doc-lines__code-search"
            title="Ricerca prodotto"
            onClick={() => openProductSearch(row._index, row.productCode || '')}
          >
            🔍
          </button>
        </div>
      ),
    },
    {
      id: 'desc',
      header: 'Descrizione',
      minWidth: 160,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.description}
          onChange={e => updateRow(row._index, { description: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'qty',
      header: 'Q.tà',
      width: 52,
      render: row => (
        <input
          type="number"
          min={0}
          step={1}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.quantity}
          onChange={e => updateRow(row._index, { quantity: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'um',
      header: 'U.m.',
      width: 44,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.unitOfMeasure || 'pz'}
          onChange={e => updateRow(row._index, { unitOfMeasure: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'priceGross',
      header: 'Prezzo ivato',
      width: 88,
      render: row => (
        <input
          type="number"
          min={0}
          step={0.01}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={grossPrice(row.unitPrice, row.vatRate)}
          onChange={e => {
            const gross = parseFloat(e.target.value) || 0
            updateRow(row._index, { unitPrice: netFromGross(gross, row.vatRate) })
          }}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'discount',
      header: 'Sconti',
      width: 56,
      render: row => (
        <input
          type="number"
          min={0}
          max={100}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.discount || 0}
          onChange={e => updateRow(row._index, { discount: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'vat',
      header: 'Iva',
      width: 48,
      render: row => (
        <select
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.vatRate}
          onChange={e => updateRow(row._index, { vatRate: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        >
          {(ivaOptions.includes(row.vatRate) ? ivaOptions : [...ivaOptions, row.vatRate].sort((a, b) => a - b)).map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'stock',
      header: 'Scarica mag.',
      width: 72,
      align: 'center',
      render: row => (
        <input
          type="checkbox"
          checked={Boolean(row.productId)}
          disabled={!row.productId}
          title={row.productId ? 'Scarico magazzino alla conferma documento' : ''}
          readOnly
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'amount',
      header: 'Importo ivato',
      width: 96,
      align: 'right',
      render: row => `€ ${calcDocumentRow(row).total.toFixed(2)}`,
    },
    {
      id: 'actions',
      header: '',
      width: 36,
      render: row => (
        <button
          type="button"
          className="gestionale-tool-btn"
          onClick={() => onChange(rows.filter((_, i) => i !== row._index))}
          title="Elimina riga"
        >
          ✕
        </button>
      ),
    },
  ]

  const columns = isVenditaBanco ? venditaBancoColumns : defaultColumns

  return (
    <div className="gestionale-doc-lines">
      <div className="gestionale-doc-lines__toolbar">
        {isVenditaBanco ? (
          <>
            <span className="gestionale-doc-lines__toolbar-label">Aggiungi riga</span>
            <button
              type="button"
              className="gestionale-section-header__action-btn"
              onClick={() => onChange(ensureTrailingEmptyRow([...rows, emptyDocumentRow()]))}
              title="Riga manuale"
            >
              Manuale
            </button>
            <button
              type="button"
              className="gestionale-section-header__action-btn"
              onClick={() => openProductSearch(null)}
              title="Da catalogo prodotti"
            >
              Prodotti
            </button>
          </>
        ) : (
          <>
            <button type="button" className="gestionale-section-header__action-btn" onClick={() => setShowPicker(v => !v)}>
              + Da catalogo
            </button>
            <button type="button" className="gestionale-section-header__action-btn" onClick={() => onChange([...rows, emptyDocumentRow()])}>
              + Riga libera
            </button>
          </>
        )}
      </div>
      {!isVenditaBanco && showPicker ? (
        <div className="gestionale-doc-lines__picker">
          <input
            className="gestionale-form-field__input"
            placeholder="Cerca codice o descrizione prodotto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <ul className="gestionale-doc-lines__picker-list">
            {filteredProducts.map(p => (
              <li key={p.id}>
                <button type="button" className="gestionale-doc-lines__picker-item" onClick={() => addFromCatalog(p)}>
                  <span className="gestionale-doc-lines__picker-code">{p.code}</span>
                  <span>{p.name}</span>
                  <span className="gestionale-doc-lines__picker-price">€ {productPrice(p, priceList).toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <DataTable
        rows={tableRows}
        columns={columns}
        rowKey={r => r.id}
        virtualize={false}
        emptyMessage={
          isVenditaBanco
            ? 'Nessuna riga. Clicca su Cod. o usa Prodotti per aggiungere dal catalogo.'
            : 'Nessuna riga. Aggiungi prodotti dal catalogo o una riga libera.'
        }
      />
      {showProductSearch ? (
        <ProductSearchDialog
          products={products}
          categories={categories}
          initialCode={productSearchInitialCode}
          onSelect={p => applyProductToRow(p, productSearchRowIndex)}
          onClose={() => {
            setShowProductSearch(false)
            setProductSearchRowIndex(null)
            setProductSearchInitialCode('')
          }}
        />
      ) : null}
    </div>
  )
}
