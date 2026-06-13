import type { ReactNode } from 'react'

interface SectionLayoutProps {
  topBar?: ReactNode
  banner?: ReactNode
  list: ReactNode
  detail: ReactNode
  actionBar?: ReactNode
  className?: string
}

/** Split master-detail asimmetrico stile gestionale. */
export default function SectionLayout({
  topBar,
  banner,
  list,
  detail,
  actionBar,
  className = '',
}: SectionLayoutProps) {
  return (
    <div className={`gestionale-section-root ${className}`.trim()}>
      {topBar}
      {banner}
      <div className="prodotti-section__body">
        {list}
        {detail}
      </div>
      {actionBar}
    </div>
  )
}
