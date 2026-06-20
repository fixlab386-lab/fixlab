import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DocumentoTipoOptions } from '../../../../lib/applicationOptions'
import { getDocumentTypePrintOptions, studioDataToConfermaStudio } from '../../../../lib/printTemplates'
import {
  addStampaModello,
  applyModelloToPrintOptions,
  deleteStampaModello,
  getAllStampaModelli,
  getStampaModelli,
  getStampaScopeLabel,
  parseStampaModelloKey,
  renameStampaModello,
  scopeToDocumentTypeId,
  stampaModelloKey,
  suggestDuplicateName,
  updateStampaModelloOptions,
  type StampaModello,
  type StampaModelloEntry,
} from '../../../../lib/stampaModelli'
import DocumentTemplateEditorDialog from '../../../../components/settings/opzioni/DocumentTemplateEditorDialog'
import { WinButton } from '../WinControls'

type Props = {
  scope: string
  studioData?: Record<string, unknown>
  initialSelectedId?: string
  onClose: () => void
  /** Caricamento del modello selezionato (doppio click o tasto Modifica → Applica). */
  onSelect?: (modello: StampaModello) => void
}

function refreshAllModels(): StampaModelloEntry[] {
  return getAllStampaModelli()
}

export default function CaricaModelloDialog({ scope, studioData, initialSelectedId, onClose, onSelect }: Props) {
  const typeId = scopeToDocumentTypeId(scope)
  const studio = useMemo(() => studioDataToConfermaStudio(studioData) ?? { name: 'FIXLab' }, [studioData])
  const baseOptions = useMemo<DocumentoTipoOptions>(
    () => getDocumentTypePrintOptions(studioData, typeId),
    [studioData, typeId],
  )
  const currentScopeLabel = getStampaScopeLabel(scope)

  const [models, setModels] = useState<StampaModelloEntry[]>(() => refreshAllModels())
  const [soloDocumentoCorrente, setSoloDocumentoCorrente] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>(() =>
    initialSelectedId ? stampaModelloKey(scope, initialSelectedId) : stampaModelloKey(scope, getStampaModelli(scope)[0]?.id ?? ''),
  )
  const [editing, setEditing] = useState<StampaModelloEntry | null>(null)

  const visibleModels = useMemo(
    () => (soloDocumentoCorrente ? models.filter(m => m.scope === scope) : models),
    [models, soloDocumentoCorrente, scope],
  )

  const selected = useMemo(() => {
    const parsed = parseStampaModelloKey(selectedKey)
    if (parsed) {
      const match = models.find(m => m.scope === parsed.scope && m.id === parsed.id)
      if (match) return match
    }
    return visibleModels[0] ?? models[0]
  }, [models, selectedKey, visibleModels])

  const reloadModels = useCallback(() => {
    setModels(refreshAllModels())
  }, [])

  const handleNuovo = () => {
    if (!selected) return
    const scopeModels = getStampaModelli(selected.scope)
    const proposed = suggestDuplicateName(scopeModels, selected)
    const name = window.prompt(
      `Il modello verrà creato a partire dal modello selezionato "${selected.name}".\n\nCome lo vuoi chiamare?`,
      proposed,
    )
    if (!name?.trim()) return
    const { created } = addStampaModello(selected.scope, selected, name)
    reloadModels()
    setSelectedKey(stampaModelloKey(selected.scope, created.id))
  }

  const handleModifica = () => {
    if (selected) setEditing(selected)
  }

  const handleElimina = () => {
    if (!selected) return
    const scopeModels = getStampaModelli(selected.scope)
    if (scopeModels.length <= 1) {
      window.alert('Deve restare almeno un modello di stampa per questo tipo documento.')
      return
    }
    if (!window.confirm(`Eliminare il modello "${selected.name}" (${getStampaScopeLabel(selected.scope)})?`)) return
    deleteStampaModello(selected.scope, selected.id)
    reloadModels()
    const next = refreshAllModels().find(m => m.scope === scope) ?? refreshAllModels()[0]
    if (next) setSelectedKey(stampaModelloKey(next.scope, next.id))
  }

  const handleRinomina = () => {
    if (!selected) return
    const name = window.prompt('Nuovo nome del modello:', selected.name)
    if (!name?.trim()) return
    renameStampaModello(selected.scope, selected.id, name)
    reloadModels()
  }

  const handleUtilita = () => {
    window.alert(
      'Utilità modello\n\n• Personalizza qualsiasi template dell\'app: deseleziona il filtro per vedere tutti i modelli.\n• Imposta come predefinito: seleziona il modello e premi "Modifica".\n• Importa/Esporta modelli: disponibile nelle Opzioni → Documenti.',
    )
  }

  const handleLoadAndClose = (modello: StampaModelloEntry) => {
    if (modello.scope !== scope) {
      window.alert(
        `Il modello "${modello.name}" appartiene a «${getStampaScopeLabel(modello.scope)}». Usa Modifica per personalizzarlo, oppure selezionalo dal dialog Stampa di quel documento.`,
      )
      return
    }
    onSelect?.(modello)
    onClose()
  }

  const handleEditorApply = (next: DocumentoTipoOptions) => {
    if (!editing) return
    updateStampaModelloOptions(editing.scope, editing.id, {
      titoloStampa: next.titoloStampa,
      noteFine: next.noteFine,
      layoutTemplate: next.layoutTemplate,
      template: { ...next.template },
    })
    reloadModels()
    const refreshed = refreshAllModels().find(m => m.scope === editing.scope && m.id === editing.id)
    setEditing(null)
    if (refreshed && refreshed.scope === scope) onSelect?.(refreshed)
  }

  if (editing) {
    const editingTypeId = scopeToDocumentTypeId(editing.scope)
    const editingBase = getDocumentTypePrintOptions(studioData, editingTypeId)
    return (
      <DocumentTemplateEditorDialog
        documentTypeId={editingTypeId}
        initialOptions={applyModelloToPrintOptions(editingBase, editing, editingTypeId)}
        studio={studio}
        overlayZIndex={25000}
        onApply={handleEditorApply}
        onClose={() => setEditing(null)}
      />
    )
  }

  let lastCategory = ''

  return createPortal(
    <div className="vb-dialog-overlay carica-modello-overlay" role="dialog" aria-modal="true" style={{ zIndex: 24500 }}>
      <div className="vb-dialog vb-dialog--carica-modello">
        <div className="vb-stampa-header">
          <div>
            <h2 className="vb-stampa-header__title">Carica modello</h2>
            <p className="vb-stampa-header__subtitle">Selezionare il modello da personalizzare</p>
          </div>
          <span className="vb-stampa-header__icon" aria-hidden="true">
            📐
          </span>
        </div>

        <div className="vb-dialog__body vb-dialog__body--carica-modello">
          <label className="carica-modello__filter">
            <input
              type="checkbox"
              checked={soloDocumentoCorrente}
              onChange={e => setSoloDocumentoCorrente(e.target.checked)}
            />
            <span>Mostra solo i modelli di &laquo;{currentScopeLabel}&raquo;</span>
          </label>

          <div className="carica-modello__list-label">
            Elenco modelli ({visibleModels.length}):
          </div>
          <div className="carica-modello__list" role="listbox" aria-label="Elenco modelli">
            {visibleModels.map(m => {
              const showCategoryHeader = !soloDocumentoCorrente && m.category !== lastCategory
              if (showCategoryHeader) lastCategory = m.category
              const key = stampaModelloKey(m.scope, m.id)
              return (
                <div key={key}>
                  {showCategoryHeader ? (
                    <div className="carica-modello__category">{m.category}</div>
                  ) : null}
                  <div
                    role="option"
                    aria-selected={key === stampaModelloKey(selected?.scope ?? '', selected?.id ?? '')}
                    tabIndex={0}
                    className={`carica-modello__row${key === stampaModelloKey(selected?.scope ?? '', selected?.id ?? '') ? ' carica-modello__row--active' : ''}`}
                    onClick={() => setSelectedKey(key)}
                    onDoubleClick={() => handleLoadAndClose(m)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleLoadAndClose(m)
                    }}
                  >
                    <span className="carica-modello__row-icon" aria-hidden="true">
                      📄
                    </span>
                    <span className="carica-modello__row-text">
                      <span className="carica-modello__row-name">{m.name}</span>
                      {!soloDocumentoCorrente && m.scope !== scope ? (
                        <span className="carica-modello__row-scope">{getStampaScopeLabel(m.scope)}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              )
            })}
            {visibleModels.length === 0 ? (
              <div className="carica-modello__empty">Nessun modello disponibile.</div>
            ) : null}
          </div>
        </div>

        <div className="vb-dialog__footer carica-modello__footer">
          <WinButton onClick={handleNuovo}>➕ Nuovo</WinButton>
          <WinButton onClick={handleModifica} disabled={!selected}>
            ✏ Modifica
          </WinButton>
          <WinButton onClick={handleElimina} disabled={!selected}>
            🗑 Elimina
          </WinButton>
          <WinButton onClick={handleRinomina} disabled={!selected}>
            ✎ Rinomina
          </WinButton>
          <WinButton onClick={handleUtilita}>🛠 Utilità</WinButton>
          <WinButton onClick={() => window.alert('Selezionare un modello e premere Modifica per personalizzarlo.')}>?</WinButton>
          <WinButton onClick={onClose}>✕ Chiudi</WinButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
