import { useMemo, useState } from 'react'
import type { Product, StockMovementType } from '../../types'
import { FormField, ToolButton } from '../ui'
import { CAUSE_PRESETS, MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES } from './constants'
import { computePreviewStock } from './stockPreview'

export type MovementFormState = {
  productId: string
  type: StockMovementType
  quantity: number
  adjustMode: 'delta' | 'absolute'
  cause: string
  notes: string
  date: string
}

export function createEmptyMovementForm(): MovementFormState {
  return {
    productId: '',
    type: 'load',
    quantity: 1,
    adjustMode: 'delta',
    cause: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  }
}

type Props = {
  products: Product[]
  form: MovementFormState
  onChange: (form: MovementFormState) => void
  saving: boolean
  saveError: string | null
  onSave: () => void
  onCancel: () => void
}

export default function StockMovementFormPanel({
  products,
  form,
  onChange,
  saving,
  saveError,
  onSave,
  onCancel,
}: Props) {
  const [productSearch, setProductSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const selectedProduct = products.find(p => p.id === form.productId)
  const currentStock = selectedProduct?.stock ?? 0

  const previewStock = useMemo(() => {
    if (!selectedProduct) return null
    return computePreviewStock(currentStock, form.type, {
      quantity: form.quantity,
      adjustMode: form.adjustMode,
    })
  }, [selectedProduct, currentStock, form.type, form.quantity, form.adjustMode])

  const searchLower = productSearch.trim().toLowerCase()
  const filteredProducts = useMemo(() => {
    if (!searchLower) return products.slice(0, 12)
    return products
      .filter(p =>
        `${p.code} ${p.name} ${p.brand} ${p.model} ${p.barcode || ''}`.toLowerCase().includes(searchLower),
      )
      .slice(0, 12)
  }, [products, searchLower])

  const qtyLabel =
    form.type === 'adjust' && form.adjustMode === 'absolute' ? 'Giacenza target' : 'Quantità'

  return (
    <div className="gestionale-stock-form">
      <h3 className="gestionale-stock-form__title">Nuovo movimento manuale</h3>

      <div className="gestionale-stock-form__grid">
        <FormField label="Data" htmlFor="mov-form-date" labelWidth={100}>
          <input
            id="mov-form-date"
            type="date"
            className="gestionale-form-field__input"
            value={form.date}
            onChange={e => onChange({ ...form, date: e.target.value })}
          />
        </FormField>

        <FormField label="Tipo movimento" htmlFor="mov-form-type" labelWidth={100}>
          <select
            id="mov-form-type"
            className="gestionale-form-field__input"
            value={form.type}
            onChange={e => onChange({ ...form, type: e.target.value as StockMovementType })}
          >
            {MOVEMENT_TYPES.map(t => (
              <option key={t} value={t}>
                {MOVEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Prodotto" htmlFor="mov-form-product-search" labelWidth={100}>
        <div className="gestionale-stock-form__product-picker">
          {selectedProduct ? (
            <div className="gestionale-stock-form__product-selected">
              <span className="gestionale-stock-form__product-code">{selectedProduct.code}</span>
              <span>{selectedProduct.name}</span>
              <button
                type="button"
                className="gestionale-stock-form__product-clear"
                onClick={() => onChange({ ...form, productId: '' })}
              >
                Cambia
              </button>
            </div>
          ) : (
            <>
              <input
                id="mov-form-product-search"
                className="gestionale-form-field__input"
                placeholder="Cerca codice, nome, barcode…"
                value={productSearch}
                onChange={e => {
                  setProductSearch(e.target.value)
                  setShowPicker(true)
                }}
                onFocus={() => setShowPicker(true)}
              />
              {showPicker && filteredProducts.length > 0 ? (
                <ul className="gestionale-stock-form__product-list">
                  {filteredProducts.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="gestionale-stock-form__product-item"
                        onClick={() => {
                          onChange({ ...form, productId: p.id })
                          setProductSearch('')
                          setShowPicker(false)
                        }}
                      >
                        <span className="gestionale-stock-form__product-code">{p.code}</span>
                        {p.name}
                        <span className="gestionale-stock-form__product-stock">Giac. {p.stock ?? 0}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </FormField>

      {selectedProduct ? (
        <div className="gestionale-stock-form__preview">
          <div className="gestionale-stock-form__preview-row">
            <span>Giacenza attuale</span>
            <strong>{currentStock}</strong>
          </div>
          {previewStock != null ? (
            <div className="gestionale-stock-form__preview-row gestionale-stock-form__preview-row--result">
              <span>Giacenza risultante</span>
              <strong>{previewStock}</strong>
            </div>
          ) : (
            <p className="gestionale-stock-form__preview-hint">
              Impegnato / In arrivo non modificano la giacenza fisica.
            </p>
          )}
        </div>
      ) : null}

      <div className="gestionale-stock-form__grid">
        {form.type === 'adjust' ? (
          <FormField label="Modalità" htmlFor="mov-form-adjust-mode" labelWidth={100}>
            <select
              id="mov-form-adjust-mode"
              className="gestionale-form-field__input"
              value={form.adjustMode}
              onChange={e =>
                onChange({ ...form, adjustMode: e.target.value as 'delta' | 'absolute' })
              }
            >
              <option value="delta">Variazione (+/−)</option>
              <option value="absolute">Valore assoluto</option>
            </select>
          </FormField>
        ) : null}

        <FormField label={qtyLabel} htmlFor="mov-form-qty" labelWidth={100}>
          <input
            id="mov-form-qty"
            type="number"
            className="gestionale-form-field__input"
            min={form.type === 'adjust' && form.adjustMode === 'delta' ? undefined : 0}
            value={form.quantity}
            onChange={e => onChange({ ...form, quantity: parseFloat(e.target.value) || 0 })}
          />
        </FormField>

        <FormField label="Causale" htmlFor="mov-form-cause" labelWidth={100}>
          <input
            id="mov-form-cause"
            className="gestionale-form-field__input"
            list="mov-cause-presets"
            value={form.cause}
            onChange={e => onChange({ ...form, cause: e.target.value })}
            placeholder="Es. Carico da fornitore"
          />
          <datalist id="mov-cause-presets">
            {CAUSE_PRESETS.map(c => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>
      </div>

      <FormField label="Note" htmlFor="mov-form-notes" labelWidth={100}>
        <textarea
          id="mov-form-notes"
          className="gestionale-form-field__input gestionale-stock-form__notes"
          rows={2}
          value={form.notes}
          onChange={e => onChange({ ...form, notes: e.target.value })}
        />
      </FormField>

      {saveError ? <p className="gestionale-stock-form__error">{saveError}</p> : null}

      <div className="gestionale-stock-form__actions">
        <ToolButton label={saving ? 'Salvataggio…' : 'Salva'} onClick={onSave} disabled={saving || !form.productId} />
        <ToolButton label="Annulla" onClick={onCancel} disabled={saving} />
      </div>
    </div>
  )
}
