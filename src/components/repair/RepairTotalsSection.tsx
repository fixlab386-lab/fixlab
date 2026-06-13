import type { Repair, RepairPhoto } from '../../types'
import FormField from '../ui/FormField'
import TabFoto from './TabFoto'

type RepairTotalsSectionProps = {
  form: Partial<Repair>
  linesTotal: number
  documentTotal: number
  balanceDue: number
  studioId: string
  repairId: string
  photos: RepairPhoto[]
  onPhotosChange: (photos: RepairPhoto[]) => void
  onField: (field: string, value: unknown) => void
}

export default function RepairTotalsSection({
  form,
  linesTotal,
  documentTotal,
  balanceDue,
  studioId,
  repairId,
  photos,
  onPhotosChange,
  onField,
}: RepairTotalsSectionProps) {
  const year = form.repairYear ?? new Date().getFullYear()

  return (
    <div className="gestionale-repair-totals">
      <div className="gestionale-repair-totals__grid">
        <div className="gestionale-repair-totals__summary">
          <div className="gestionale-repair-totals__row">
            <span>Totale righe</span>
            <strong>€ {linesTotal.toFixed(2)}</strong>
          </div>
          <div className="gestionale-repair-totals__row">
            <span>Manodopera</span>
            <strong>€ {(form.laborCost || 0).toFixed(2)}</strong>
          </div>
          <div className="gestionale-repair-totals__row gestionale-repair-totals__row--highlight">
            <span>Totale documento</span>
            <strong>€ {documentTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div className="gestionale-repair-totals__fields">
          <FormField label="Acconto" htmlFor="repair-deposit">
            <input
              id="repair-deposit"
              type="number"
              step="0.01"
              className="gestionale-form-field__input"
              value={form.deposit || 0}
              onChange={e => onField('deposit', parseFloat(e.target.value) || 0)}
            />
          </FormField>
          <div className="gestionale-repair-totals__row">
            <span>Da saldare</span>
            <strong>€ {balanceDue.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="gestionale-repair-totals__meta">
        <FormField label="Data accettazione" htmlFor="repair-acceptance">
          <input
            id="repair-acceptance"
            type="date"
            className="gestionale-form-field__input"
            value={form.acceptanceDate || new Date().toISOString().slice(0, 10)}
            onChange={e => onField('acceptanceDate', e.target.value)}
          />
        </FormField>
        <FormField label="N. progressivo" htmlFor="repair-seq">
          <div className="gestionale-repair-seq-row">
            <input
              id="repair-seq"
              type="number"
              className="gestionale-form-field__input"
              value={form.repairSequence ?? ''}
              onChange={e => onField('repairSequence', parseInt(e.target.value, 10) || undefined)}
              placeholder="145"
            />
            <span>/</span>
            <input
              type="number"
              className="gestionale-form-field__input gestionale-repair-seq-year"
              value={year}
              onChange={e => onField('repairYear', parseInt(e.target.value, 10) || year)}
            />
          </div>
        </FormField>
      </div>

      <TabFoto studioId={studioId} repairId={repairId} photos={photos} onPhotosChange={onPhotosChange} />
    </div>
  )
}
