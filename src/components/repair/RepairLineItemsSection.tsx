import { useMemo, useState } from 'react'
import type { Product, RepairProduct } from '../../types'
import { DataTable, FormField, type DataTableColumn } from '../ui'
import { DEFAULT_VAT_PERCENT } from '../../gestionale/lib/constants'
import {
  calcLineAmount,
  emptyFreeLine,
  normalizeRepairLine,
  productToRepairLine,
} from './repairLineUtils'

type RepairLineItemsSectionProps = {
  products: Product[]
  lines: RepairProduct[]
  onChange: (lines: RepairProduct[]) => void
}

export default function RepairLineItemsSection({
  products,
  lines,
  onChange,
}: RepairLineItemsSectionProps) {
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const searchLower = search.trim().toLowerCase()
  const filteredProducts = useMemo(() => {
    if (!searchLower) return products.slice(0, 12)
    return products
      .filter(p =>
        `${p.code} ${p.name} ${p.brand} ${p.model} ${p.barcode || ''}`.toLowerCase().includes(searchLower),
      )
      .slice(0, 12)
  }, [products, searchLower])

  const updateLine = (index: number, patch: Partial<RepairProduct>) => {
    onChange(
      lines.map((line, i) => (i === index ? normalizeRepairLine({ ...line, ...patch }) : line)),
    )
  }

  const addFromCatalog = (p: Product) => {
    const existing = lines.findIndex(l => l.productId === p.id)
    if (existing >= 0) {
      const line = lines[existing]
      updateLine(existing, { qty: line.qty + 1 })
    } else {
      onChange([...lines, productToRepairLine(p)])
    }
    setShowPicker(false)
    setSearch('')
  }

  const addFreeLine = () => onChange([...lines, emptyFreeLine()])
  const removeLine = (index: number) => onChange(lines.filter((_, i) => i !== index))

  const columns: DataTableColumn<RepairProduct & { _index: number }>[] = [
    {
      id: 'code',
      header: 'Codice',
      width: 72,
      render: row => (
        <input
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.code || ''}
          onChange={e => updateLine(row._index, { code: e.target.value })}
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
          value={row.name}
          onChange={e => updateLine(row._index, { name: e.target.value })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'qty',
      header: 'Qtà',
      width: 56,
      align: 'right',
      render: row => (
        <input
          type="number"
          min={1}
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.qty}
          onChange={e => updateLine(row._index, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'price',
      header: 'Prezzo',
      width: 80,
      align: 'right',
      render: row => (
        <input
          type="number"
          step="0.01"
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.price}
          onChange={e => updateLine(row._index, { price: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'discount',
      header: 'Sconto',
      width: 72,
      align: 'right',
      render: row => (
        <input
          type="number"
          step="0.01"
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.discount || 0}
          onChange={e => updateLine(row._index, { discount: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'amount',
      header: 'Importo',
      width: 80,
      align: 'right',
      render: row => <span>€ {calcLineAmount(row).toFixed(2)}</span>,
    },
    {
      id: 'vat',
      header: 'IVA%',
      width: 56,
      align: 'right',
      render: row => (
        <input
          type="number"
          className="gestionale-form-field__input gestionale-repair-line-input"
          value={row.vatPercent ?? DEFAULT_VAT_PERCENT}
          onChange={e => updateLine(row._index, { vatPercent: parseFloat(e.target.value) || 0 })}
          onClick={e => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 36,
      render: row => (
        <button type="button" className="gestionale-tool-btn gestionale-tool-btn--danger" onClick={() => removeLine(row._index)}>
          ×
        </button>
      ),
    },
  ]

  const tableRows = lines.map((line, _index) => ({ ...line, _index }))

  return (
    <div className="gestionale-repair-lines">
      <div className="gestionale-repair-lines__toolbar">
        <FormField label="Cerca catalogo" htmlFor="repair-line-search" labelWidth={110}>
          <div className="gestionale-field-with-action">
            <input
              id="repair-line-search"
              className="gestionale-form-field__input gestionale-field-with-action__input"
              value={search}
              placeholder="Codice o descrizione prodotto…"
              onChange={e => {
                setSearch(e.target.value)
                setShowPicker(true)
              }}
              onFocus={() => setShowPicker(true)}
            />
            <button type="button" className="gestionale-field-action-btn" onClick={() => setShowPicker(v => !v)}>
              🔍
            </button>
          </div>
        </FormField>
        <button type="button" className="gestionale-tool-btn" onClick={addFreeLine}>
          + Riga libera
        </button>
      </div>

      {showPicker && search && filteredProducts.length > 0 ? (
        <div className="gestionale-repair-lines__picker">
          {filteredProducts.map(p => (
            <button key={p.id} type="button" className="gestionale-dialog-results__item" onClick={() => addFromCatalog(p)}>
              {p.code} — {p.name} · € {p.price.toFixed(2)}
            </button>
          ))}
        </div>
      ) : null}

      <DataTable
        rows={tableRows}
        columns={columns}
        rowKey={r => `${r._index}-${r.productId || 'free'}`}
        tableId="repair-lines"
        emptyMessage="Nessuna riga — aggiungi dal catalogo o inserisci una riga libera."
        virtualize={false}
      />
    </div>
  )
}
