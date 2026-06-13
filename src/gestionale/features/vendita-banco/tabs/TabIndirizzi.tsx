import { NAZIONI } from '../constants'
import { openMapsForAddress } from '../../../../lib/maps'
import { WinButton, WinField, WinIconBtn, WinInput, WinSelect } from '../WinControls'
import type { DocumentoVenditaBanco, IndirizzoCompleto } from '../types'

type Props = {
  doc: DocumentoVenditaBanco
  protetto?: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
}

function patchIndirizzo(
  side: 'intestatario' | 'destinazione',
  patch: Partial<IndirizzoCompleto>,
  doc: DocumentoVenditaBanco,
): Partial<DocumentoVenditaBanco> {
  return { [side]: { ...doc[side], ...patch } }
}

export default function TabIndirizzi({ doc, protetto, onChange }: Props) {
  return (
    <div className="vb-tab-panel vb-tab-stack">
      <div className="vb-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <WinField label="Cod. fiscale" htmlFor="vb-cf" className="gestionale-mdi-window__field--data">
          <WinInput
            id="vb-cf"
            value={doc.cliente.codFiscale}
            disabled={protetto}
            onChange={e => onChange({ cliente: { ...doc.cliente, codFiscale: e.target.value } })}
          />
        </WinField>
        <WinField label="Partita Iva" htmlFor="vb-piva" className="gestionale-mdi-window__field--data">
          <WinInput
            id="vb-piva"
            value={doc.cliente.partitaIva}
            onChange={e => onChange({ cliente: { ...doc.cliente, partitaIva: e.target.value } })}
          />
        </WinField>
        <WinButton onClick={() => onChange({ destinazione: { ...doc.intestatario } })}>Cambia destinazione…</WinButton>
      </div>

      <div className="vb-addresses">
        <div className="vb-tab-stack">
          <p className="vb-section-title">Intestatario</p>
          <WinField label="Indirizzo" htmlFor="vb-int-ind">
            <WinInput
              id="vb-int-ind"
              value={doc.intestatario.indirizzo}
              onChange={e => onChange(patchIndirizzo('intestatario', { indirizzo: e.target.value }, doc))}
            />
          </WinField>
          <div className="vb-addresses__row3">
            <WinField label="CAP" htmlFor="vb-int-cap">
              <WinInput
                id="vb-int-cap"
                value={doc.intestatario.cap}
                onChange={e => onChange(patchIndirizzo('intestatario', { cap: e.target.value }, doc))}
              />
            </WinField>
            <WinField label="Città" htmlFor="vb-int-city">
              <WinInput
                id="vb-int-city"
                value={doc.intestatario.citta}
                onChange={e => onChange(patchIndirizzo('intestatario', { citta: e.target.value }, doc))}
              />
            </WinField>
            <WinField label="Prov." htmlFor="vb-int-prov">
              <WinInput
                id="vb-int-prov"
                value={doc.intestatario.prov}
                onChange={e => onChange(patchIndirizzo('intestatario', { prov: e.target.value }, doc))}
              />
            </WinField>
          </div>
          <WinField label="Nazione" htmlFor="vb-int-naz">
            <div className="vb-row vb-row--center">
              <WinSelect
                id="vb-int-naz"
                className="vb-input--flex"
                value={doc.intestatario.nazione}
                onChange={e => onChange(patchIndirizzo('intestatario', { nazione: e.target.value }, doc))}
              >
                {NAZIONI.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </WinSelect>
              <WinIconBtn title="Seleziona nazione">🌐</WinIconBtn>
              <button type="button" className="vb-link" onClick={() => openMapsForAddress(doc.intestatario)}>
                Mappa…
              </button>
            </div>
          </WinField>
        </div>

        <div className="vb-tab-stack">
          <p className="vb-section-title">Destinazione</p>
          <WinField label="Indirizzo" htmlFor="vb-dest-ind">
            <WinInput
              id="vb-dest-ind"
              value={doc.destinazione.indirizzo}
              onChange={e => onChange(patchIndirizzo('destinazione', { indirizzo: e.target.value }, doc))}
            />
          </WinField>
          <div className="vb-addresses__row3">
            <WinField label="CAP" htmlFor="vb-dest-cap">
              <WinInput
                id="vb-dest-cap"
                value={doc.destinazione.cap}
                onChange={e => onChange(patchIndirizzo('destinazione', { cap: e.target.value }, doc))}
              />
            </WinField>
            <WinField label="Città" htmlFor="vb-dest-city">
              <WinInput
                id="vb-dest-city"
                value={doc.destinazione.citta}
                onChange={e => onChange(patchIndirizzo('destinazione', { citta: e.target.value }, doc))}
              />
            </WinField>
            <WinField label="Prov." htmlFor="vb-dest-prov">
              <WinInput
                id="vb-dest-prov"
                value={doc.destinazione.prov}
                onChange={e => onChange(patchIndirizzo('destinazione', { prov: e.target.value }, doc))}
              />
            </WinField>
          </div>
          <WinField label="Nazione" htmlFor="vb-dest-naz">
            <div className="vb-row vb-row--center">
              <WinSelect
                id="vb-dest-naz"
                className="vb-input--flex"
                value={doc.destinazione.nazione}
                onChange={e => onChange(patchIndirizzo('destinazione', { nazione: e.target.value }, doc))}
              >
                {NAZIONI.map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </WinSelect>
              <WinIconBtn title="Seleziona nazione">🌐</WinIconBtn>
              <button type="button" className="vb-link" onClick={() => openMapsForAddress(doc.destinazione)}>
                Mappa…
              </button>
            </div>
          </WinField>
        </div>
      </div>
    </div>
  )
}
