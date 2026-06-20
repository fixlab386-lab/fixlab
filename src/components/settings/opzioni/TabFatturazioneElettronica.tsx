import { useMemo, useState } from 'react'
import {
  ARUBA_REGIMI_FISCALI,
  callSaveArubaCredentials,
  callTestArubaConnection,
  type ArubaEnvironment,
  type StudioArubaPublicConfig,
} from '../../../lib/arubaInvoicing'
import { OpzioniFieldRow, OpzioniSection } from './OpzioniUi'

type Props = {
  studioId: string
  config: StudioArubaPublicConfig
  onConfigChange: (patch: Partial<StudioArubaPublicConfig>) => void
}

function formatWhen(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleString('it-IT')
  }
  return ''
}

export default function TabFatturazioneElettronica({ studioId, config, onConfigChange }: Props) {
  const [username, setUsername] = useState(config.username || '')
  const [password, setPassword] = useState('')
  const [environment, setEnvironment] = useState<ArubaEnvironment>(config.environment || 'demo')
  const [enabled, setEnabled] = useState(Boolean(config.enabled))
  const [regimeFiscale, setRegimeFiscale] = useState(config.regimeFiscale || 'RF01')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [message, setMessage] = useState<string | null>(config.lastTestMessage || null)
  const [messageOk, setMessageOk] = useState<boolean | null>(
    typeof config.lastTestOk === 'boolean' ? config.lastTestOk : null,
  )

  const passwordHint = useMemo(() => {
    if (config.hasPassword) return 'Lascia vuoto per mantenere la password già salvata.'
    return 'Password dell\'account Aruba Fatturazione Elettronica (API).'
  }, [config.hasPassword])

  const handleSave = async () => {
    if (!username.trim()) {
      alert('Inserisci lo username Aruba.')
      return
    }
    if (!config.hasPassword && !password.trim()) {
      alert('Inserisci la password Aruba.')
      return
    }
    setBusy('save')
    setMessage(null)
    try {
      await callSaveArubaCredentials({
        studioId,
        username: username.trim(),
        password: password.trim() || undefined,
        environment,
        enabled,
        regimeFiscale,
      })
      onConfigChange({
        username: username.trim(),
        environment,
        enabled,
        regimeFiscale,
        hasPassword: true,
        lastTestMessage: 'Credenziali salvate. Esegui un test connessione.',
      })
      setPassword('')
      setMessage('Credenziali Aruba salvate.')
      setMessageOk(true)
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Salvataggio credenziali non riuscito.'
      setMessage(text)
      setMessageOk(false)
    } finally {
      setBusy(null)
    }
  }

  const handleTest = async () => {
    setBusy('test')
    setMessage(null)
    try {
      const result = await callTestArubaConnection(studioId)
      setMessage(result.message)
      setMessageOk(result.ok)
      onConfigChange({ lastTestOk: result.ok, lastTestMessage: result.message })
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Test connessione non riuscito.'
      setMessage(text)
      setMessageOk(false)
      onConfigChange({ lastTestOk: false, lastTestMessage: text })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="opzioni-tab-panel">
      <OpzioniSection label="Collegamento Aruba (per studio)">
        <p className="opzioni-hint" style={{ marginTop: 0 }}>
          Ogni professionista usa il proprio account <strong>Aruba Fatturazione Elettronica</strong>. FixLab invia
          le fatture XML allo SDI tramite le credenziali dello studio attivo. La password resta cifrata sul server e
          non è visibile agli altri utenti dell&apos;archivio.
        </p>

        <OpzioniFieldRow label="Abilita invio SDI via Aruba">
          <label className="opzioni-check-row__main">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <span>Attiva fatturazione elettronica per questo archivio</span>
          </label>
        </OpzioniFieldRow>

        <OpzioniFieldRow label="Ambiente">
          <select
            className="opzioni-input opzioni-input--short"
            value={environment}
            onChange={e => setEnvironment(e.target.value as ArubaEnvironment)}
          >
            <option value="demo">Demo / test SDI</option>
            <option value="production">Produzione</option>
          </select>
        </OpzioniFieldRow>

        <OpzioniFieldRow label="Username Aruba">
          <input
            className="opzioni-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="Utente API Aruba FE"
          />
        </OpzioniFieldRow>

        <OpzioniFieldRow label="Password API">
          <input
            className="opzioni-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={config.hasPassword ? '••••••••' : 'Password API'}
          />
          <p className="opzioni-hint">{passwordHint}</p>
        </OpzioniFieldRow>

        <OpzioniFieldRow label="Regime fiscale emittente">
          <select
            className="opzioni-input"
            value={regimeFiscale}
            onChange={e => setRegimeFiscale(e.target.value)}
          >
            {ARUBA_REGIMI_FISCALI.map(r => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </OpzioniFieldRow>

        <div className="opzioni-inline-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="opzioni-btn opzioni-btn--primary" disabled={busy !== null} onClick={() => void handleSave()}>
            {busy === 'save' ? 'Salvataggio…' : 'Salva credenziali Aruba'}
          </button>
          <button type="button" className="opzioni-btn" disabled={busy !== null || !config.hasPassword} onClick={() => void handleTest()}>
            {busy === 'test' ? 'Test in corso…' : 'Test connessione'}
          </button>
        </div>

        {message ? (
          <p
            className="opzioni-hint"
            style={{ marginTop: 10, color: messageOk ? '#1b6b2f' : '#a40000', fontWeight: 600 }}
          >
            {message}
          </p>
        ) : null}

        {config.lastTestAt ? (
          <p className="opzioni-hint" style={{ marginTop: 4 }}>
            Ultimo test: {formatWhen(config.lastTestAt)}
          </p>
        ) : null}
      </OpzioniSection>

      <OpzioniSection label="Requisiti per l'invio">
        <ul className="opzioni-hint" style={{ margin: 0, paddingLeft: 18 }}>
          <li>P.IVA e indirizzo compilati in «La mia azienda»</li>
          <li>Cliente con codice destinatario SDI o PEC in anagrafica</li>
          <li>Documento di tipo <strong>Fattura</strong> confermato</li>
          <li>Pulsante «Invia a SDI via Aruba» nella scheda documento</li>
        </ul>
      </OpzioniSection>
    </div>
  )
}
