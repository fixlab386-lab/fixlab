import { OpzioniFieldRow } from './OpzioniUi'

export type AziendaFormProps = {
  shopName: string
  subtitle: string
  address: string
  nation: string
  cap: string
  city: string
  province: string
  fiscalCode: string
  vatNumber: string
  regImprese: string
  website: string
  altro: string
  phone: string
  phone2: string
  phone3: string
  fax: string
  email: string
  pec: string
  logoUrl: string
  uploadingLogo: boolean
  onChange: (patch: Partial<AziendaFormProps>) => void
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteLogo: () => void
  onCapLookup: () => void
}

export default function TabAzienda({
  shopName,
  subtitle,
  address,
  nation,
  cap,
  city,
  province,
  fiscalCode,
  vatNumber,
  regImprese,
  website,
  altro,
  phone,
  phone2,
  phone3,
  fax,
  email,
  pec,
  logoUrl,
  uploadingLogo,
  onChange,
  onLogoUpload,
  onDeleteLogo,
  onCapLookup,
}: AziendaFormProps) {
  return (
    <div className="opzioni-tab-panel opzioni-tab-panel--azienda">
      <div className="opzioni-azienda-grid">
        <div className="opzioni-azienda-col">
          <OpzioniFieldRow label="Denominaz.">
            <input className="opzioni-input" value={shopName} onChange={e => onChange({ shopName: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Sottotitolo">
            <input className="opzioni-input" value={subtitle} onChange={e => onChange({ subtitle: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Indirizzo">
            <input className="opzioni-input" value={address} onChange={e => onChange({ address: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Nazione">
            <select className="opzioni-select" value={nation} onChange={e => onChange({ nation: e.target.value })}>
              <option>Italia</option>
              <option>San Marino</option>
              <option>Svizzera</option>
              <option>Altro</option>
            </select>
          </OpzioniFieldRow>
          <div className="opzioni-row-3">
            <OpzioniFieldRow label="CAP">
              <input className="opzioni-input" value={cap} onChange={e => onChange({ cap: e.target.value })} />
            </OpzioniFieldRow>
            <OpzioniFieldRow label="Città">
              <input className="opzioni-input" value={city} onChange={e => onChange({ city: e.target.value })} />
            </OpzioniFieldRow>
            <OpzioniFieldRow label="Prov.">
              <input className="opzioni-input opzioni-input--xs" value={province} onChange={e => onChange({ province: e.target.value })} />
            </OpzioniFieldRow>
          </div>
          <button type="button" className="opzioni-link-btn" onClick={onCapLookup}>
            Cerca CAP…
          </button>
          <div className="opzioni-row-2">
            <OpzioniFieldRow label="Cod. Fiscale">
              <input className="opzioni-input" value={fiscalCode} onChange={e => onChange({ fiscalCode: e.target.value })} />
            </OpzioniFieldRow>
            <OpzioniFieldRow label="Part. Iva">
              <input className="opzioni-input" value={vatNumber} onChange={e => onChange({ vatNumber: e.target.value })} />
            </OpzioniFieldRow>
          </div>
          <OpzioniFieldRow label="Reg. Imprese">
            <input className="opzioni-input" value={regImprese} onChange={e => onChange({ regImprese: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Home Page">
            <div className="opzioni-input-with-icon">
              <input className="opzioni-input" value={website} onChange={e => onChange({ website: e.target.value })} />
              {website ? (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="opzioni-icon-btn">
                  🌐
                </a>
              ) : null}
            </div>
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Altro">
            <textarea className="opzioni-textarea" value={altro} onChange={e => onChange({ altro: e.target.value })} rows={5} />
          </OpzioniFieldRow>
        </div>

        <div className="opzioni-azienda-col opzioni-azienda-col--right">
          <OpzioniFieldRow label="Tel. 1">
            <input className="opzioni-input" value={phone} onChange={e => onChange({ phone: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Tel. 2">
            <input className="opzioni-input" value={phone2} onChange={e => onChange({ phone2: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Tel. 3">
            <input className="opzioni-input" value={phone3} onChange={e => onChange({ phone3: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Fax">
            <input className="opzioni-input" value={fax} onChange={e => onChange({ fax: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="E-mail">
            <input className="opzioni-input" type="email" value={email} onChange={e => onChange({ email: e.target.value })} />
          </OpzioniFieldRow>
          <OpzioniFieldRow label="Pec">
            <input className="opzioni-input" type="email" value={pec} onChange={e => onChange({ pec: e.target.value })} />
          </OpzioniFieldRow>

          <div className="opzioni-logo-block">
            <div className="opzioni-logo-frame">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="opzioni-logo-img" /> : <span className="opzioni-logo-empty">Logo</span>}
            </div>
            <div className="opzioni-logo-actions">
              <label className="opzioni-link-btn">
                Carica logo
                <input type="file" accept="image/*" hidden disabled={uploadingLogo} onChange={onLogoUpload} />
              </label>
              <button type="button" className="opzioni-link-btn" disabled={!logoUrl} onClick={onDeleteLogo}>
                Elimina logo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
