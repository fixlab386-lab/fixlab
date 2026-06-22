import type { Repair } from '../../types'
import FormField from '../ui/FormField'

interface Props {
  form: Partial<Repair>
  s: (field: string, val: unknown) => void
}

const statusOptions = [
  { value: 'waiting', label: 'In attesa' },
  { value: 'accepted', label: 'Accettata' },
  { value: 'in_progress', label: 'In lavorazione' },
  { value: 'ready', label: 'Pronta' },
  { value: 'completed', label: 'Consegnata' },
  { value: 'on_hold', label: 'In sospeso' },
]

export default function TabRiparazione({ form, s }: Props) {
  return (
    <div className="gestionale-repair-form-stack">
      <FormField label="Difetto dichiarato" htmlFor="repair-problem" required>
        <textarea
          id="repair-problem"
          className="gestionale-form-field__input"
          rows={3}
          value={form.problem || ''}
          onChange={e => s('problem', e.target.value)}
          placeholder="Problema riportato dal cliente…"
        />
      </FormField>
      <FormField label="Diagnosi" htmlFor="repair-diagnosis">
        <textarea
          id="repair-diagnosis"
          className="gestionale-form-field__input"
          rows={2}
          value={form.diagnosis || ''}
          onChange={e => s('diagnosis', e.target.value)}
          placeholder="Diagnosi tecnica…"
        />
      </FormField>
      <div className="gestionale-repair-form-grid">
        <FormField label="Stato riparazione" htmlFor="repair-status">
          <select
            id="repair-status"
            className="gestionale-form-field__input"
            value={form.status || 'waiting'}
            onChange={e => s('status', e.target.value)}
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tecnico assegnato" htmlFor="repair-tech">
          <input
            id="repair-tech"
            className="gestionale-form-field__input"
            value={form.assignedTo || ''}
            onChange={e => s('assignedTo', e.target.value)}
            placeholder="Nome tecnico"
          />
        </FormField>
        <FormField label="Manodopera (€)" htmlFor="repair-labor">
          <input
            id="repair-labor"
            type="number"
            step="0.01"
            className="gestionale-form-field__input"
            value={form.laborCost ?? 0}
            onChange={e => s('laborCost', parseFloat(e.target.value) || 0)}
          />
        </FormField>
        <FormField label="Tempo stimato" htmlFor="repair-time">
          <input
            id="repair-time"
            className="gestionale-form-field__input"
            value={form.estimatedTime || '1 ora'}
            onChange={e => s('estimatedTime', e.target.value)}
          />
        </FormField>
        <FormField label="Garanzia (gg)" htmlFor="repair-warranty">
          <input
            id="repair-warranty"
            type="number"
            className="gestionale-form-field__input"
            value={form.warrantyDays ?? 90}
            onChange={e => s('warrantyDays', parseInt(e.target.value, 10) || 0)}
          />
        </FormField>
        <FormField label="Scadenza" htmlFor="repair-deadline">
          <input
            id="repair-deadline"
            type="date"
            className="gestionale-form-field__input"
            value={form.deadline || ''}
            onChange={e => s('deadline', e.target.value)}
          />
        </FormField>
        <FormField label="Note interne" htmlFor="repair-notes">
          <input
            id="repair-notes"
            className="gestionale-form-field__input"
            value={form.notes || ''}
            onChange={e => s('notes', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}
