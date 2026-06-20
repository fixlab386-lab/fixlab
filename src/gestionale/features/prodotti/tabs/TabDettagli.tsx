import { ALIQUOTE_IVA, GARANZIE, RICHIESTE } from '../constants'
import type { Prodotto } from '../types'
import { DaneaFormGroupTitle, DaneaFormLinks, DaneaFormRow } from '../../../components/DaneaFormRow'

type Props = {
  prodotto: Prodotto
  fornitori: string[]
  produttori: string[]
  onChange: (p: Prodotto) => void
  onCodiciAggiuntivi: () => void
  onComponenti: () => void
}

export default function TabDettagli({
  prodotto,
  fornitori,
  produttori,
  onChange,
  onCodiciAggiuntivi,
  onComponenti,
}: Props) {
  const d = prodotto.dettagli
  const patchDet = (patch: Partial<typeof d>) => onChange({ ...prodotto, dettagli: { ...d, ...patch } })

  return (
    <div className="danea-form">
      <DaneaFormRow label="Aliquota Iva">
        <select className="prodotti-select prodotti-select--combo" value={d.aliquotaIva} onChange={e => patchDet({ aliquotaIva: e.target.value })}>
          {ALIQUOTE_IVA.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Cod. a barre">
        <input className="prodotti-input" value={d.codBarre} onChange={e => patchDet({ codBarre: e.target.value })} />
        <button type="button" className="danea-form__edit-btn" title="Codici aggiuntivi" onClick={onCodiciAggiuntivi}>
          …
        </button>
      </DaneaFormRow>

      <DaneaFormLinks>
        <button type="button" className="prodotti-link" onClick={onCodiciAggiuntivi}>
          Codici aggiuntivi…
        </button>
      </DaneaFormLinks>

      <DaneaFormRow label="Fornitore">
        <select className="prodotti-select prodotti-select--combo" value={d.fornitore} onChange={e => patchDet({ fornitore: e.target.value })}>
          <option value="" />
          {fornitori.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Produttore">
        <select className="prodotti-select prodotti-select--combo" value={d.produttore} onChange={e => patchDet({ produttore: e.target.value })}>
          <option value="" />
          {produttori.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <label className="prodotti-check">
        <input type="checkbox" checked={d.artAssemblato} onChange={e => patchDet({ artAssemblato: e.target.checked })} />
        Art. assemblato
      </label>
      <DaneaFormLinks>
        <button type="button" className="prodotti-link" onClick={onComponenti} disabled={!d.artAssemblato}>
          Inserisci componenti…
        </button>
      </DaneaFormLinks>

      <label className="prodotti-check">
        <input type="checkbox" checked={d.mostraVenditaTouch} onChange={e => patchDet({ mostraVenditaTouch: e.target.checked })} />
        Mostra in vendita touch
      </label>

      <DaneaFormRow label="Garanzia">
        <select className="prodotti-select prodotti-select--combo" value={d.garanzia} onChange={e => patchDet({ garanzia: e.target.value })}>
          <option value="" />
          {GARANZIE.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Richiesta">
        <select className="prodotti-select prodotti-select--combo" value={d.richiesta} onChange={e => patchDet({ richiesta: e.target.value })}>
          <option value="" />
          {RICHIESTE.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Ubicazione">
        <input className="prodotti-input" value={d.ubicazione} onChange={e => patchDet({ ubicazione: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormGroupTitle>Info fornitore</DaneaFormGroupTitle>

      <DaneaFormRow label="Cod. fornit.">
        <input className="prodotti-input" value={d.codProdFornitore} onChange={e => patchDet({ codProdFornitore: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Note fornit.">
        <input className="prodotti-input" value={d.noteFornitura} onChange={e => patchDet({ noteFornitura: e.target.value })} />
      </DaneaFormRow>
    </div>
  )
}
