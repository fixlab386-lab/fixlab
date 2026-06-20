import { DaneaFormRow } from '../../../components/DaneaFormRow'
import type { Cliente } from '../types'

const SOLVIBILITA = ['Buona', 'Media', 'Scarsa', 'Da verificare'] as const
const TIPOLOGIE = ['Studio Medico', 'Azienda', 'Privato', 'Ente pubblico', 'Altro'] as const

type Props = {
  cliente: Cliente
  disabled?: boolean
  onChange: (c: Cliente) => void
}

export default function TabVarie({ cliente, disabled, onChange }: Props) {
  const v = cliente.varie
  const patch = (patch: Partial<typeof v>) => onChange({ ...cliente, varie: { ...v, ...patch } })

  return (
    <div className="danea-form">
      <DaneaFormRow label="Home page">
        <input
          className="clienti-input"
          value={v.homePage}
          disabled={disabled}
          onChange={e => patch({ homePage: e.target.value })}
        />
        <button type="button" className="danea-form__edit-btn" title="Apri" disabled={!v.homePage} onClick={() => v.homePage && window.open(v.homePage, '_blank')}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Login web">
        <input className="clienti-input" value={v.loginWeb} disabled={disabled} onChange={e => patch({ loginWeb: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Solvibilità">
        <select className="clienti-select" value={v.solvibilita} disabled={disabled} onChange={e => patch({ solvibilita: e.target.value })}>
          {SOLVIBILITA.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Tipologia">
        <select className="clienti-select" value={v.tipologia} disabled={disabled} onChange={e => patch({ tipologia: e.target.value })}>
          {TIPOLOGIE.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      {(['libero3', 'libero4', 'libero5', 'libero6'] as const).map((key, i) => (
        <DaneaFormRow key={key} label={`Libero ${i + 3}`}>
          <input className="clienti-input" value={v[key]} disabled={disabled} onChange={e => patch({ [key]: e.target.value })} />
        </DaneaFormRow>
      ))}
    </div>
  )
}
