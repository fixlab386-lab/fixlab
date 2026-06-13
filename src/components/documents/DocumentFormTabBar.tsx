import type { DocumentFormTabId } from './constants'

type TabDef = { id: DocumentFormTabId; label: string }

type Props = {
  tabs: TabDef[]
  activeTabId: DocumentFormTabId
  onTabChange: (tabId: DocumentFormTabId) => void
}

export default function DocumentFormTabBar({ tabs, activeTabId, onTabChange }: Props) {
  return (
    <div className="gestionale-doc-form-tabs" role="tablist" aria-label="Sezioni documento">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTabId === tab.id}
          className={`gestionale-doc-form-tabs__btn${activeTabId === tab.id ? ' gestionale-doc-form-tabs__btn--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
