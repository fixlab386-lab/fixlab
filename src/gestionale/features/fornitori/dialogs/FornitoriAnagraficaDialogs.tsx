import { useState } from 'react'
import type { Fornitore, ContattoExtra, Indirizzo } from '../types'

const emptyIndirizzo = (): Indirizzo => ({
  denominazione: '',
  indirizzo: '',
  cap: '',
  citta: '',
  prov: '',
  nazione: 'Italia',
})

function IndirizzoForm({
  value,
  onChange,
  title,
}: {
  value: Indirizzo
  onChange: (v: Indirizzo) => void
  title: string
}) {
  const patch = (p: Partial<Indirizzo>) => onChange({ ...value, ...p })
  return (
    <div>
      <div className="clienti-field">
        <label className="clienti-field__label">Denominazione</label>
        <input className="clienti-input" value={value.denominazione} onChange={e => patch({ denominazione: e.target.value })} />
      </div>
      <div className="clienti-field">
        <label className="clienti-field__label">Indirizzo</label>
        <input className="clienti-input" value={value.indirizzo} onChange={e => patch({ indirizzo: e.target.value })} />
      </div>
      <div className="clienti-row--3">
        <div className="clienti-field">
          <label className="clienti-field__label">CAP</label>
          <input className="clienti-input clienti-input--short" value={value.cap} onChange={e => patch({ cap: e.target.value })} />
        </div>
        <div className="clienti-field">
          <label className="clienti-field__label">Città</label>
          <input className="clienti-input" value={value.citta} onChange={e => patch({ citta: e.target.value })} />
        </div>
        <div className="clienti-field">
          <label className="clienti-field__label">Prov.</label>
          <input className="clienti-input clienti-input--prov" value={value.prov} onChange={e => patch({ prov: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{title}</p>
    </div>
  )
}

export function SedeLegaleDialog({
  sede,
  onSave,
  onClose,
}: {
  sede: Indirizzo | null
  onSave: (s: Indirizzo) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Indirizzo>(sede || emptyIndirizzo())
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">Sede legale</div>
        <div className="clienti-dialog__body">
          <IndirizzoForm value={form} onChange={setForm} title="Indirizzo della sede legale" />
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={() => onSave(form)}>
            OK
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function SediListaDialog({
  title,
  sedi,
  onSave,
  onClose,
}: {
  title: string
  sedi: Indirizzo[]
  onSave: (s: Indirizzo[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<Indirizzo[]>(sedi.length ? sedi : [])
  const [edit, setEdit] = useState<Indirizzo | null>(null)

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">{title}</div>
        <div className="clienti-dialog__body">
          {edit ? (
            <IndirizzoForm value={edit} onChange={setEdit} title="" />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {list.length === 0 ? <li className="clienti-empty">Nessuna sede registrata.</li> : null}
              {list.map((s, i) => (
                <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{s.denominazione || s.indirizzo || `Sede ${i + 1}`}</span>
                  <span>
                    <button type="button" className="clienti-link" onClick={() => setEdit({ ...s })}>
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="clienti-link"
                      style={{ marginLeft: 8 }}
                      onClick={() => setList(list.filter((_, j) => j !== i))}
                    >
                      Elimina
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="clienti-dialog__footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {edit ? (
              <button type="button" className="clienti-dialog__btn" onClick={() => { setList(prev => [...prev, edit]); setEdit(null) }}>
                Aggiungi
              </button>
            ) : (
              <button type="button" className="clienti-dialog__btn" onClick={() => setEdit(emptyIndirizzo())}>
                Nuova sede
              </button>
            )}
          </div>
          <div>
            <button type="button" className="clienti-dialog__btn" onClick={() => { onSave(list); onClose() }}>
              OK
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onClose}>
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContattiExtraDialog({
  contatti,
  onSave,
  onClose,
}: {
  contatti: ContattoExtra[]
  onSave: (c: ContattoExtra[]) => void
  onClose: () => void
}) {
  const [list, setList] = useState<ContattoExtra[]>(contatti)
  const [form, setForm] = useState<ContattoExtra>({ label: '', telefono: '', cellulare: '', email: '' })

  const add = () => {
    if (!form.label.trim()) return
    setList([...list, form])
    setForm({ label: '', telefono: '', cellulare: '', email: '' })
  }

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">Altri contatti</div>
        <div className="clienti-dialog__body">
          <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none' }}>
            {list.map((c, i) => (
              <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <strong>{c.label}</strong> — {c.telefono || c.cellulare || c.email || '—'}
                <button type="button" className="clienti-link" style={{ marginLeft: 8 }} onClick={() => setList(list.filter((_, j) => j !== i))}>
                  Elimina
                </button>
              </li>
            ))}
          </ul>
          <div className="clienti-field">
            <label className="clienti-field__label">Etichetta</label>
            <input className="clienti-input" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="clienti-row">
            <div className="clienti-field" style={{ flex: 1 }}>
              <label className="clienti-field__label">Telefono</label>
              <input className="clienti-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="clienti-field" style={{ flex: 1 }}>
              <label className="clienti-field__label">Cellulare</label>
              <input className="clienti-input" value={form.cellulare} onChange={e => setForm({ ...form, cellulare: e.target.value })} />
            </div>
          </div>
          <div className="clienti-field">
            <label className="clienti-field__label">E-mail</label>
            <input className="clienti-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={add}>
            Aggiungi contatto
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={() => { onSave(list); onClose() }}>
            OK
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export function FiltroPersonalizzatoDialog({
  colonna,
  onApply,
  onClose,
}: {
  colonna: string
  onApply: (expr: string) => void
  onClose: () => void
}) {
  const [expr, setExpr] = useState('')
  return (
    <div className="clienti-dialog-overlay" onClick={onClose}>
      <div className="clienti-dialog" onClick={e => e.stopPropagation()}>
        <div className="clienti-dialog__titlebar">Filtro personalizzato — {colonna}</div>
        <div className="clienti-dialog__body">
          <input className="clienti-input" placeholder="Testo da cercare…" value={expr} onChange={e => setExpr(e.target.value)} autoFocus />
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={() => { onApply(expr); onClose() }}>
            Applica
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProprietaCompleteDialog({ fornitore, onClose }: { fornitore: Fornitore; onClose: () => void }) {
  const so = fornitore.sedeOperativa
  return (
    <div className="clienti-dialog-overlay" onClick={onClose}>
      <div className="clienti-dialog clienti-dialog--lg" onClick={e => e.stopPropagation()}>
        <div className="clienti-dialog__titlebar">Proprietà complete anagrafica</div>
        <div className="clienti-dialog__body" style={{ fontSize: 11, lineHeight: 1.5 }}>
          <p><strong>Codice:</strong> {fornitore.codice}</p>
          <p><strong>Denominazione:</strong> {so.denominazione}</p>
          <p><strong>Indirizzo:</strong> {so.indirizzo}, {so.cap} {so.citta} ({so.prov})</p>
          <p><strong>P.IVA:</strong> {fornitore.partitaIva || '—'}</p>
          <p><strong>Cod. fiscale:</strong> {fornitore.codFiscale || '—'}</p>
          <p><strong>Agente:</strong> {fornitore.rapportiCommerciali.agente}</p>
          <p><strong>Pagamento:</strong> {fornitore.rapportiCommerciali.pagamento || '—'}</p>
          <p><strong>Sedi extra:</strong> {fornitore.sediExtra.length}</p>
          <p><strong>Contatti extra:</strong> {fornitore.contattiExtra.length}</p>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
