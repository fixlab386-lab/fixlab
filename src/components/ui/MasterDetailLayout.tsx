import type { ReactNode } from 'react'

export type MasterDetailLayoutProps = {
  master: ReactNode
  detail?: ReactNode
  detailWidth?: number
  detailCollapsed?: boolean
  onToggleDetail?: () => void
  collapseLabel?: string
  className?: string
}

export default function MasterDetailLayout({
  master,
  detail,
  detailWidth = 380,
  detailCollapsed = false,
  onToggleDetail,
  collapseLabel = 'Comprimi pannello dettaglio',
  className = '',
}: MasterDetailLayoutProps) {
  const hasDetail = detail != null

  return (
    <div
      className={`gestionale-master-detail${className ? ` ${className}` : ''}`}
      style={hasDetail && !detailCollapsed ? { ['--gestionale-detail-width' as string]: `${detailWidth}px` } : undefined}
    >
      <div className="gestionale-master-detail__master">{master}</div>

      {hasDetail ? (
        <div className="gestionale-master-detail__detail-wrap">
          {onToggleDetail ? (
            <button
              type="button"
              className="gestionale-master-detail__collapse-btn"
              onClick={onToggleDetail}
              title={detailCollapsed ? 'Espandi pannello' : collapseLabel}
              aria-expanded={!detailCollapsed}
            >
              {detailCollapsed ? '◀' : '▶'}
            </button>
          ) : null}
          <aside
            className={`gestionale-master-detail__detail${detailCollapsed ? ' gestionale-master-detail__detail--collapsed' : ''}`}
            aria-hidden={detailCollapsed}
          >
            {!detailCollapsed ? detail : null}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
