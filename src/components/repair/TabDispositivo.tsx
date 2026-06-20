import type { Repair } from '../../types'
import FormField from '../ui/FormField'
import SensitiveField from './SensitiveField'

interface Props {
  form: Partial<Repair>
  s: (field: string, val: unknown) => void
}

const DEVICE_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'Nokia', 'Motorola', 'Oppo', 'Altro']
const DEVICE_COLORS = ['Nero', 'Bianco', 'Grigio', 'Blu', 'Rosso', 'Verde', 'Viola', 'Giallo', 'Rosa', 'Oro', 'Argento', 'Altro']

export default function TabDispositivo({ form, s }: Props) {
  return (
    <div className="gestionale-repair-form-grid">
      <FormField label="Tipo dispositivo" htmlFor="dev-type">
        <select
          id="dev-type"
          className="gestionale-form-field__input"
          value={form.deviceType || 'Smartphone'}
          onChange={e => s('deviceType', e.target.value)}
        >
          {['Smartphone', 'Tablet', 'Laptop', 'Smartwatch', 'Console', 'Altro'].map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Marca" htmlFor="dev-brand">
        <select
          id="dev-brand"
          className="gestionale-form-field__input"
          value={form.deviceBrand || 'Apple'}
          onChange={e => s('deviceBrand', e.target.value)}
        >
          {DEVICE_BRANDS.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Modello" htmlFor="dev-model" required>
        <input
          id="dev-model"
          className="gestionale-form-field__input"
          value={form.deviceModel || ''}
          onChange={e => s('deviceModel', e.target.value)}
          placeholder="Es. iPhone 14 Pro Max"
        />
      </FormField>
      <FormField label="Colore" htmlFor="dev-color">
        <select
          id="dev-color"
          className="gestionale-form-field__input"
          value={form.deviceColor || ''}
          onChange={e => s('deviceColor', e.target.value)}
        >
          <option value="">—</option>
          {DEVICE_COLORS.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="IMEI / S/N" htmlFor="dev-imei">
        <input
          id="dev-imei"
          className="gestionale-form-field__input"
          value={form.imei || ''}
          onChange={e => s('imei', e.target.value)}
          placeholder="IMEI o numero seriale"
        />
      </FormField>
      <SensitiveField
        label="Cod. blocco / PIN"
        htmlFor="dev-lock"
        value={form.deviceLockCode || form.devicePin || ''}
        onChange={v => {
          s('deviceLockCode', v)
          s('devicePin', v)
        }}
        placeholder="Codice di sblocco"
      />
      <SensitiveField
        label="Account"
        htmlFor="dev-account"
        value={form.deviceAccount || ''}
        onChange={v => s('deviceAccount', v)}
        placeholder="Account dispositivo"
      />
      <SensitiveField
        label="Password"
        htmlFor="dev-password"
        value={form.devicePassword || ''}
        onChange={v => s('devicePassword', v)}
        placeholder="Password dispositivo"
      />
      <FormField label="Note dispositivo" htmlFor="dev-condition">
        <textarea
          id="dev-condition"
          className="gestionale-form-field__input"
          rows={3}
          value={form.deviceCondition || ''}
          onChange={e => s('deviceCondition', e.target.value)}
          placeholder="Condizioni estetiche, accessori consegnati, custodia, caricatore…"
        />
      </FormField>
      <p className="gestionale-repair-gdpr-note">
        Dati riservati trattati ai sensi del GDPR — visibili solo agli operatori autorizzati.
      </p>
    </div>
  )
}
