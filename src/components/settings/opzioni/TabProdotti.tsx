import { useCallback, useEffect, useState } from 'react'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { ensureDefaultPriceLists, updatePriceListConfig } from '../../../lib/firestore'
import type { PriceListConfig } from '../../../types'
import type { ApplicationOptions } from '../../../lib/applicationOptions'
import { OpzioniCheckRow, OpzioniFieldRow, OpzioniNumberedFields, OpzioniSection } from './OpzioniUi'

type Props = {
  value: ApplicationOptions['prodotti']
  onChange: (patch: Partial<ApplicationOptions['prodotti']>) => void
}

const TIPI = ['Art. con magazzino', 'Servizio', 'Generico']
const DECIMALI = [0, 1, 2, 3, 4]

export default function TabProdotti({ value, onChange }: Props) {
  const { studioId } = useActiveStudio()
  const [listini, setListini] = useState<PriceListConfig[]>([])

  const refreshListini = useCallback(async () => {
    if (!studioId) return
    const rows = await ensureDefaultPriceLists(studioId)
    setListini(rows)
  }, [studioId])

  useEffect(() => {
    void refreshListini()
  }, [refreshListini])

  const patchListino = async (id: string, patch: Partial<PriceListConfig>) => {
    await updatePriceListConfig(id, patch)
    await refreshListini()
  }

  const extraListini = Array.from({ length: Math.max(0, 9 - listini.length) }, (_, i) => ({
    id: `placeholder-${i}`,
    name: `Listino ${listini.length + i + 1}`,
    placeholder: true,
  }))

  return (
    <div className="opzioni-tab-panel opzioni-tab-panel--prodotti">
      <div className="opzioni-prodotti-grid">
        <div className="opzioni-prodotti-col">
          <OpzioniFieldRow label="N. decimali prezzi vendita">
            <select
              className="opzioni-select opzioni-select--xs"
              value={value.decimaliPrezzoVendita}
              onChange={e => onChange({ decimaliPrezzoVendita: parseInt(e.target.value, 10) })}
            >
              {DECIMALI.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </OpzioniFieldRow>
          <OpzioniFieldRow label="N. decimali prezzo acquisto">
            <select
              className="opzioni-select opzioni-select--xs"
              value={value.decimaliPrezzoAcquisto}
              onChange={e => onChange({ decimaliPrezzoAcquisto: parseInt(e.target.value, 10) })}
            >
              {DECIMALI.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </OpzioniFieldRow>
          <OpzioniCheckRow
            label="Mostra sezione dimensioni e peso"
            checked={value.mostraDimensioniPeso}
            onChange={v => onChange({ mostraDimensioniPeso: v })}
          />

          <OpzioniSection label="Assegna ai nuovi prodotti">
            <OpzioniCheckRow
              label="Codice automatico"
              checked={value.codiceAutomatico}
              onChange={v => onChange({ codiceAutomatico: v })}
            />
            <OpzioniFieldRow label="Prossimo codice">
              <input
                className="opzioni-input opzioni-input--sm"
                value={value.prossimoCodice}
                disabled={!value.codiceAutomatico}
                onChange={e => onChange({ prossimoCodice: e.target.value })}
              />
            </OpzioniFieldRow>
            <OpzioniFieldRow label="Tipologia (?)">
              <select className="opzioni-select" value={value.tipologiaDefault} onChange={e => onChange({ tipologiaDefault: e.target.value })}>
                {TIPI.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </OpzioniFieldRow>
            <OpzioniCheckRow label="Vendita touch" checked={value.venditaTouch} onChange={v => onChange({ venditaTouch: v })} />
          </OpzioniSection>

          <OpzioniSection label="Nomi campi aggiuntivi">
            <OpzioniNumberedFields values={value.campiAggiuntivi} onChange={campiAggiuntivi => onChange({ campiAggiuntivi })} />
          </OpzioniSection>

          <OpzioniSection label="Inserimento prodotti nei documenti">
            <OpzioniCheckRow
              label="Incrementa la q.tà di eventuali prodotti uguali già inseriti"
              checked={value.incrementaQtaDuplicati}
              onChange={v => onChange({ incrementaQtaDuplicati: v })}
            />
            <OpzioniCheckRow
              label="Usa avvisi sonori nelle ricerche con codice a barre"
              checked={value.avvisiSonoriBarcode}
              onChange={v => onChange({ avvisiSonoriBarcode: v })}
            />
          </OpzioniSection>
        </div>

        <div className="opzioni-prodotti-col opzioni-prodotti-col--listini">
          <h4 className="opzioni-subtitle">Listini</h4>
          <table className="opzioni-grid-table">
            <thead>
              <tr>
                <th>Abilitato</th>
                <th>Nome Listino</th>
                <th>Predef.</th>
                <th>Predef. (Vend…)</th>
              </tr>
            </thead>
            <tbody>
              {listini.map(l => (
                <tr key={l.id}>
                  <td>
                    <input type="checkbox" checked readOnly />
                  </td>
                  <td>{l.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!l.isDefault}
                      onChange={e => {
                        if (!e.target.checked) return
                        void Promise.all(listini.map(x => updatePriceListConfig(x.id, { isDefault: x.id === l.id }))).then(refreshListini)
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!l.vatIncluded}
                      onChange={e => void patchListino(l.id, { vatIncluded: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
              {extraListini.map(l => (
                <tr key={l.id} className="opzioni-grid-table__disabled">
                  <td>
                    <input type="checkbox" disabled />
                  </td>
                  <td>{l.name}</td>
                  <td>
                    <input type="checkbox" disabled />
                  </td>
                  <td>
                    <input type="checkbox" disabled />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
