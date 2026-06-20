import { DaneaFormRow } from '../../../components/DaneaFormRow'
import type { Fornitore } from '../types'

const SOLVIBILITA = ['Buona', 'Media', 'Scarsa', 'Da verificare'] as const
const TIPOLOGIE = [
  'Arredamento',
  'Elettronica',
  'Informatica',
  'Componentistica',
  'Distribuzione',
  'Servizi',
  'Azienda',
  'Altro',
] as const

type Props = {
  fornitore: Fornitore
  disabled?: boolean
  onChange: (c: Fornitore) => void
}

export default function TabVarie({ fornitore, disabled, onChange }: Props) {
  const v = fornitore.varie
  const patch = (patch: Partial<typeof v>) => onChange({ ...fornitore, varie: { ...v, ...patch } })

  const editElenco = (nome: string) => {
    alert(`Gestione elenco «${nome}» disponibile in Opzioni applicazione.`)
  }

  return (
    <div className="danea-form">
      <DaneaFormRow label="Home page">
        <input className="clienti-input" value={v.homePage} disabled={disabled} onChange={e => patch({ homePage: e.target.value })} />
        <button
          type="button"
          className="danea-form__edit-btn"
          title="Apri nel browser"
          disabled={disabled || !v.homePage.trim()}
          onClick={() => {
            const url = v.homePage.trim()
            if (url) window.open(url.startsWith('http') ? url : `https://${url}`, '_blank')
          }}
        >
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
        <button type="button" className="danea-form__edit-btn" title="Modifica elenco" disabled={disabled} onClick={() => editElenco('Solvibilità')}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormRow label="Tipologia">
        <select className="clienti-select" value={v.tipologia} disabled={disabled} onChange={e => patch({ tipologia: e.target.value })}>
          <option value="">—</option>
          {TIPOLOGIE.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {v.tipologia && !TIPOLOGIE.includes(v.tipologia as (typeof TIPOLOGIE)[number]) ? (
            <option value={v.tipologia}>{v.tipologia}</option>
          ) : null}
        </select>
        <button type="button" className="danea-form__edit-btn" title="Modifica elenco" disabled={disabled} onClick={() => editElenco('Tipologia')}>
          …
        </button>
      </DaneaFormRow>

      {(['libero3', 'libero4', 'libero5', 'libero6'] as const).map((key, i) => (
        <DaneaFormRow key={key} label={`Libero ${i + 3}`}>
          <input className="clienti-input" value={v[key]} disabled={disabled} onChange={e => patch({ [key]: e.target.value })} />
          <button type="button" className="danea-form__edit-btn" title="Modifica elenco" disabled={disabled} onClick={() => editElenco(`Libero ${i + 3}`)}>
            …
          </button>
        </DaneaFormRow>
      ))}
    </div>
  )
}
