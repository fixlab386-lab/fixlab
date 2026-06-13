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
    <div>
      <div className="clienti-field">
        <label className="clienti-field__label">Home page</label>
        <div className="clienti-row">
          <input
            className="clienti-input"
            style={{ flex: 1 }}
            value={v.homePage}
            disabled={disabled}
            onChange={e => patch({ homePage: e.target.value })}
          />
          <button type="button" className="clienti-icon-btn" title="Apri" onClick={() => v.homePage && window.open(v.homePage, '_blank')}>
            🌐
          </button>
        </div>
      </div>
      <div className="clienti-field">
        <label className="clienti-field__label">Login web</label>
        <input className="clienti-input" value={v.loginWeb} disabled={disabled} onChange={e => patch({ loginWeb: e.target.value })} />
      </div>
      <div className="clienti-field">
        <label className="clienti-field__label">Solvibilità</label>
        <select className="clienti-select" value={v.solvibilita} disabled={disabled} onChange={e => patch({ solvibilita: e.target.value })}>
          {SOLVIBILITA.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="clienti-field">
        <label className="clienti-field__label">Tipologia</label>
        <select className="clienti-select" value={v.tipologia} disabled={disabled} onChange={e => patch({ tipologia: e.target.value })}>
          {TIPOLOGIE.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {(['libero3', 'libero4', 'libero5', 'libero6'] as const).map((key, i) => (
        <div key={key} className="clienti-field">
          <label className="clienti-field__label">{`Libero ${i + 3}`}</label>
          <input className="clienti-input" value={v[key]} disabled={disabled} onChange={e => patch({ [key]: e.target.value })} />
        </div>
      ))}
    </div>
  )
}
