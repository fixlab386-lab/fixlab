import type { ReactNode } from 'react'

export type DetailPanelTab = {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export type DetailPanelField = {
  label: string
  value: ReactNode
  span?: 1 | 2
  link?: boolean
}

export type DetailPanelProps = {
  tabs: DetailPanelTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  title?: string
  footer?: ReactNode
  /** Shortcut: render label/value grid on active tab when fields provided */
  fields?: DetailPanelField[]
  className?: string
}

export function DetailPanelFields({ fields }: { fields: DetailPanelField[] }) {
  return (
    <div className="gestionale-detail-panel__grid">
      {fields.map((field, i) => (
        <div
          key={`${field.label}-${i}`}
          className="gestionale-detail-panel__field"
          style={field.span === 2 ? { gridColumn: '1 / -1' } : undefined}
        >
          <span className="gestionale-detail-panel__field-label">{field.label}</span>
          <span
            className={`gestionale-detail-panel__field-value${field.link ? ' gestionale-detail-panel__field-value--link' : ''}`}
          >
            {field.value ?? '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DetailPanel({
  tabs,
  activeTabId,
  onTabChange,
  title,
  footer,
  fields,
  className = '',
}: DetailPanelProps) {
  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0]

  return (
    <div className={`gestionale-detail-panel gestionale-detail-panel--danea${className ? ` ${className}` : ''}`}>
      {title ? <div className="gestionale-detail-panel__title">{title}</div> : null}

      <div className="gestionale-detail-panel__tabs" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`gestionale-detail-panel__tab${tab.id === activeTabId ? ' gestionale-detail-panel__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            aria-selected={tab.id === activeTabId}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="gestionale-detail-panel__body" role="tabpanel">
        {activeTab?.content != null
          ? activeTab.content
          : fields?.length
            ? <DetailPanelFields fields={fields} />
            : null}
      </div>

      {footer ? <div className="gestionale-detail-panel__footer">{footer}</div> : null}
    </div>
  )
}
