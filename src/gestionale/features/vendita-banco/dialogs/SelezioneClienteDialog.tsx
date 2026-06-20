import { useState } from 'react'
import ClientSearchDialog from '../../../../components/clients/ClientSearchDialog'
import type { Client } from '../../../../types'
import { GENERIC_CLIENT_LABEL } from '../../../../lib/clientSearch'
import { WinButton } from '../WinControls'

type Props = {
  studioId: string
  clients: Client[]
  currentMode: 'none' | 'existing' | 'new'
  onSelectExisting: (client: Client) => void
  onSelectNone: () => void
  onNewClient: () => void
  onClose: () => void
}

export default function SelezioneClienteDialog({
  studioId,
  clients,
  currentMode,
  onSelectExisting,
  onSelectNone,
  onNewClient,
  onClose,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new' | 'none'>(currentMode === 'new' ? 'new' : currentMode)
  const [showSearch, setShowSearch] = useState(false)

  if (showSearch) {
    return (
      <ClientSearchDialog
        studioId={studioId}
        clients={clients}
        onSelect={c => {
          onSelectExisting(c)
          onClose()
        }}
        onNoClient={() => {
          onSelectNone()
          onClose()
        }}
        onNewClient={() => {
          onNewClient()
          onClose()
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <>
      <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
        <div className="vb-dialog vb-dialog--md">
          <div className="vb-dialog__titlebar">
            <span>Selezione cliente</span>
            <button type="button" className="vb-icon-btn" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="vb-dialog__body vb-selezione-cliente">
            <label className="vb-radio">
              <input
                type="radio"
                name="vb-client-mode"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
              />
              Usa un cliente già esistente
            </label>
            {mode === 'existing' ? (
              <div className="vb-row vb-selezione-cliente__search">
                <input className="vb-input vb-input--flex" readOnly placeholder="Cerca cliente…" />
                <button type="button" className="vb-icon-btn vb-icon-btn--search" title="Ricerca clienti" onClick={() => setShowSearch(true)}>
                  🔍
                </button>
              </div>
            ) : null}

            <label className="vb-radio">
              <input type="radio" name="vb-client-mode" checked={mode === 'new'} onChange={() => setMode('new')} />
              Crea un nuovo cliente
            </label>

            <label className="vb-radio">
              <input
                type="radio"
                name="vb-client-mode"
                checked={mode === 'none'}
                onChange={() => {
                  setMode('none')
                  onSelectNone()
                }}
              />
              Nessun cliente
            </label>
          </div>
          <div className="vb-dialog__footer">
            {mode === 'new' ? (
              <WinButton
                onClick={() => {
                  onNewClient()
                  onClose()
                }}
              >
                Continua…
              </WinButton>
            ) : null}
            <WinButton onClick={onClose}>Chiudi</WinButton>
          </div>
        </div>
      </div>
    </>
  )
}

export function clientModeFromNome(nome: string, hasId: boolean): 'none' | 'existing' | 'new' {
  if (!nome.trim() || nome === GENERIC_CLIENT_LABEL) return 'none'
  if (hasId) return 'existing'
  return 'none'
}
