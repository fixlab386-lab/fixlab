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
    <header className={`gestionale-section-header${className ? ` ${className}` : ''}`}>
      <h2 className="gestionale-section-header__title">{title}</h2>

      {showSearch ? (
        <div className="gestionale-section-header__search">
          <input
            type="search"
            className="gestionale-section-header__search-input"
            value={searchValue}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      {actions ? (
        <div className="gestionale-section-header__actions">{actions}</div>
      ) : null}
    </header>
  )
}
