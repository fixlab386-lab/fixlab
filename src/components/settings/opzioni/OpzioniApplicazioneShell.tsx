import type { ReactNode } from 'react'

export type OpzioniTabId = 'moduli' | 'azienda' | 'clienti' | 'prodotti' | 'documenti' | 'fatturazione' | 'avvisi' | 'abbonamento' | 'varie'

export const OPZIONI_TABS: { id: OpzioniTabId; label: string }[] = [
  { id: 'moduli', label: 'Moduli' },
  { id: 'azienda', label: 'La mia azienda' },
  { id: 'clienti', label: 'Clienti e Fornitori' },
  { id: 'prodotti', label: 'Prodotti' },
  { id: 'documenti', label: 'Documenti' },
  { id: 'fatturazione', label: 'Fatturazione elettronica' },
  { id: 'avvisi', label: 'Avvisi' },
  { id: 'abbonamento', label: 'Abbonamento' },
  { id: 'varie', label: 'Varie' },
]

type Props = {
  activeTab: OpzioniTabId
  onTabChange: (tab: OpzioniTabId) => void
  children: ReactNode
  footer?: ReactNode
  onHelp?: () => void
  onClose?: () => void
}

export default function OpzioniApplicazioneShell({ activeTab, onTabChange, children, footer, onHelp, onClose }: Props) {
  return (
    <div className="opzioni-applicazione">
      <header className="opzioni-applicazione__header">
        <div>
          <h1 id="opzioni-title" className="opzioni-applicazione__title">Opzioni applicazione</h1>
          <p className="opzioni-applicazione__subtitle">Adatta FixLab alle tue esigenze</p>
        </div>
        <div className="opzioni-applicazione__header-actions">
          {onClose ? (
            <button
              type="button"
              className="opzioni-applicazione__close"
              onClick={onClose}
              aria-label="Chiudi"
              title="Chiudi"
            >
              ×
            </button>
          ) : (
            <div className="opzioni-applicazione__header-icons" aria-hidden>
              <span className="opzioni-applicazione__icon" />
              <span className="opzioni-applicazione__icon" />
            </div>
          )}
        </div>
      </header>

      <nav className="opzioni-applicazione__tabs" role="tablist" aria-label="Opzioni applicazione">
        {OPZIONI_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`opzioni-applicazione__tab${activeTab === tab.id ? ' opzioni-applicazione__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="opzioni-applicazione__content" role="tabpanel">
        {children}
      </div>

      <footer className="opzioni-applicazione__footer">
        <div className="opzioni-applicazione__footer-actions">{footer}</div>
        <button type="button" className="opzioni-applicazione__help" title="Aiuto" onClick={onHelp}>
          ?
        </button>
      </footer>
    </div>
  )
}
