import type { ReactNode } from 'react'

export type SectionHeaderProps = {
  title: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  actions?: ReactNode
  className?: string
}

export default function SectionHeader({
  title,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Cerca…',
  showSearch = true,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <header className={`clienti-section-header${className ? ` ${className}` : ''}`}>
      <h2 className="clienti-section-header__title">{title}</h2>

      {showSearch ? (
        <div className="clienti-section-header__search">
          <span className="clienti-section-header__search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="clienti-section-header__search-input"
            value={searchValue}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      {actions ? <div className="clienti-section-header__actions">{actions}</div> : null}
    </header>
  )
}
