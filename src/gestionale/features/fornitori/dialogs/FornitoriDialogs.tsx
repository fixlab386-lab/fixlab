import { useState } from 'react'
import type { Fornitore } from '../types'

export function ConfermaEliminaDialog({ nome, onYes, onNo }: { nome: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__titlebar">Conferma eliminazione</div>
        <div className="clienti-dialog__body">Sei sicuro di voler eliminare questa voce? ({nome})</div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onYes}>
            Sì
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onNo}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}

export function ValidazioneDenominazioneDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__titlebar">Errore</div>
        <div className="clienti-dialog__body" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="clienti-error-icon">✕</span>
          <span>La denominazione non può essere lasciata vuota</span>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export function InviaPagamentoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__titlebar">Invia</div>
        <div className="clienti-dialog__body">Nessun pagamento relativo a questo Fornitore</div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export function WhatsAppNumeriDialog({
  fornitore,
  onVoceCorrente,
  onVediAssociati,
  onClose,
}: {
  fornitore: Fornitore
  onVoceCorrente: () => void
  onVediAssociati: () => void
  onClose: () => void
}) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__titlebar">WhatsApp</div>
        <div className="clienti-dialog__body">
          Su quale dei seguenti numeri vuoi inviare il messaggio WhatsApp per <strong>{fornitore.sedeOperativa.denominazione}</strong>?
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onVoceCorrente}>
            Voce corrente
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onVediAssociati}>
            Vedi associati
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function MancaCellulareDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__body">Il soggetto selezionato non ha il cellulare compilato</div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export function EtichetteIndirizzoDialog({
  onSi,
  onNo,
}: {
  onSi: () => void
  onNo: () => void
}) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__body">
          Per il Fornitore selezionato non è specificato alcun indirizzo nella Sede principale. Spostarsi sulla Sede operativa?
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onSi}>
            Sì
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onNo}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}

export function EtichetteQualeIndirizzoDialog({ onOk, onCancel }: { onOk: () => void; onCancel: () => void }) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog">
        <div className="clienti-dialog__body">Che indirizzo vuoi stampare? Sede principale / Destinazione merce</div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onOk}>
            OK
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function RicercaSoggettiNazionaleDialog({
  codFiscale,
  onClose,
  onOk,
}: {
  codFiscale: string
  onClose: () => void
  onOk: () => void
}) {
  const [query, setQuery] = useState(codFiscale)
  const [results, setResults] = useState<
    { denominazione: string; indirizzo: string; cap: string; citta: string; prov: string; cf: string; piva: string }[]
  >([])

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--xl">
        <div className="clienti-dialog__titlebar">
          <span>Ricerca soggetti su elenco nazionale</span>
          <button type="button" className="clienti-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="clienti-dialog__body">
          <p style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>
            I dati possono essere completati automaticamente tramite banche dati autorizzate.
          </p>
          <div className="clienti-row">
            <div className="clienti-field" style={{ flex: 1 }}>
              <label className="clienti-field__label">Cod. Fiscale, Partita Iva o Denominazione del soggetto:</label>
              <input className="clienti-input" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <button
              type="button"
              className="clienti-dialog__btn"
              onClick={() =>
                setResults([
                  {
                    denominazione: query || 'Esempio Srl',
                    indirizzo: 'Via Roma 1',
                    cap: '10100',
                    citta: 'Torino',
                    prov: 'TO',
                    cf: query,
                    piva: '',
                  },
                ])
              }
            >
              Cerca
            </button>
          </div>
          <table className="clienti-grid" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Denominazione</th>
                <th>Indirizzo</th>
                <th>Cap</th>
                <th>Città</th>
                <th>Prov.</th>
                <th>Cod. Fiscale</th>
                <th>Partita Iva</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.denominazione}</td>
                  <td>{r.indirizzo}</td>
                  <td>{r.cap}</td>
                  <td>{r.citta}</td>
                  <td>{r.prov}</td>
                  <td>{r.cf}</td>
                  <td>{r.piva}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 8, fontSize: 11 }}>
            Dati forniti dalla{' '}
            <a className="clienti-link" href="https://fixlab.app/help" target="_blank" rel="noreferrer">
              banca dati di Modefinance Srl
            </a>
          </p>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onOk}>
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


export function RicercaCapCittaDialog({
  onSelect,
  onClose,
}: {
  onSelect: (cap: string, citta: string, prov: string) => void
  onClose: () => void
}) {
  const [citta, setCitta] = useState('')
  const rows = [
    { cap: '10138', citta: 'Torino', prov: 'TO' },
    { cap: '10121', citta: 'Torino', prov: 'TO' },
    { cap: '20121', citta: 'Milano', prov: 'MI' },
  ].filter(r => !citta.trim() || r.citta.toLowerCase().includes(citta.toLowerCase()))

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">Ricerca CAP/Città/Provincia</div>
        <div className="clienti-dialog__body">
          <div className="clienti-field">
            <label className="clienti-field__label">Città</label>
            <input className="clienti-input" value={citta} onChange={e => setCitta(e.target.value)} />
          </div>
          <table className="clienti-grid">
            <thead>
              <tr>
                <th>CAP</th>
                <th>Città</th>
                <th>Prov.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.cap} style={{ cursor: 'pointer' }} onClick={() => onSelect(r.cap, r.citta, r.prov)}>
                  <td>{r.cap}</td>
                  <td>{r.citta}</td>
                  <td>{r.prov}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function AllegatiFornitoriDialog({
  files,
  onSmartphone,
  onScan,
  onImport,
  onExport,
  onRename,
  onDelete,
  onPrint,
  onClose,
}: {
  files: { name: string }[]
  onSmartphone: () => void
  onScan: () => void
  onImport: () => void
  onExport: () => void
  onRename: () => void
  onDelete: () => void
  onPrint: () => void
  onClose: () => void
}) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">
          <span>Allegati</span>
          <button type="button" className="clienti-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="clienti-dialog__body">
          <div className="clienti-allegati-drop">
            <div style={{ fontSize: 32 }}>📄</div>
            {files.length ? (
              <ul style={{ textAlign: 'left', margin: '8px 0 0', paddingLeft: 20 }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>{f.name}</li>
                ))}
              </ul>
            ) : (
              <>Premi &apos;Scansiona&apos; per acquisire un documento tramite scanner…</>
            )}
          </div>
          <div className="clienti-row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="clienti-dialog__btn" onClick={onSmartphone}>
              Da smartphone/e-mail
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onScan}>
              Scansiona
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onImport}>
              Importa
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onExport}>
              Esporta
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onRename} disabled={!files.length}>
              Rinomina
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onDelete} disabled={!files.length}>
              Elimina
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={onPrint} disabled={!files.length}>
              Stampa
            </button>
          </div>
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

export function ImpegniDialog({ nomeFornitore, onClose }: { nomeFornitore: string; onClose: () => void }) {
  const [modalita, setModalita] = useState<'Elenco' | 'Periodo'>('Elenco')
  const [periodo, setPeriodo] = useState('Mese')

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--xl">
        <div className="clienti-dialog__titlebar">
          Impegni con &apos;{nomeFornitore}&apos;
          <button type="button" className="clienti-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="clienti-dialog__body" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
          <table className="clienti-grid">
            <thead>
              <tr>
                <th>Data</th>
                <th>Oggetto</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="clienti-empty">
                  Nessun impegno registrato.
                </td>
              </tr>
            </tbody>
          </table>
          <div>
            <div className="clienti-field">
              <label className="clienti-field__label">Modalità</label>
              <select className="clienti-select" value={modalita} onChange={e => setModalita(e.target.value as 'Elenco' | 'Periodo')}>
                <option>Elenco</option>
                <option>Periodo</option>
              </select>
            </div>
            {modalita === 'Periodo' ? (
              <div className="clienti-field">
                <label className="clienti-field__label">Periodo</label>
                <select className="clienti-select" value={periodo} onChange={e => setPeriodo(e.target.value)}>
                  <option>Giorno</option>
                  <option>Settimana</option>
                  <option>Mese</option>
                  <option>Anno</option>
                </select>
              </div>
            ) : null}
            <div className="clienti-field">
              <label className="clienti-field__label">Mostra</label>
              <select className="clienti-select" defaultValue="Tutti i calendari">
                <option>Tutti i calendari</option>
              </select>
            </div>
          </div>
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

export function ModificaSelezioneDialog({
  count,
  onApplica,
  onClose,
}: {
  count: number
  onApplica: (campo: string, valore: string) => void
  onClose: () => void
}) {
  const [campo, setCampo] = useState('Pagamento')
  const [valore, setValore] = useState('')

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">Modifica selezione ({count} record)</div>
        <div className="clienti-dialog__body">
          <div className="clienti-field">
            <label className="clienti-field__label">Campo da modificare</label>
            <select className="clienti-select" value={campo} onChange={e => setCampo(e.target.value)}>
              <option>Pagamento</option>
              <option>Agente</option>
              <option>Listino</option>
              <option>Sconto</option>
              <option>Nazione</option>
            </select>
          </div>
          <div className="clienti-field">
            <label className="clienti-field__label">Nuovo valore</label>
            <input className="clienti-input" value={valore} onChange={e => setValore(e.target.value)} />
          </div>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={() => { onApplica(campo, valore); onClose() }}>
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

export function StampaModelloDialog({
  modello,
  onPrint,
  onClose,
}: {
  modello: string
  onPrint: () => void
  onClose: () => void
}) {
  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">Stampa</div>
        <div className="clienti-dialog__body">
          <div className="clienti-field">
            <label className="clienti-field__label">Modello di stampa</label>
            <select className="clienti-select" defaultValue={modello}>
              <option>{modello}</option>
            </select>
          </div>
        </div>
        <div className="clienti-dialog__footer">
          <button type="button" className="clienti-dialog__btn" onClick={onPrint}>
            🖨 Stampa
          </button>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
