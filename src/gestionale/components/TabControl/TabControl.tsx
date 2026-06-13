export interface TabItem<T extends string = string> {
  id: T
  label: string
  disabled?: boolean
}

interface TabControlProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

export default function TabControl<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: TabControlProps<T>) {
  return (
    <div className={`gestionale-tab-control ${className}`.trim()} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          disabled={tab.disabled}
          className={`gestionale-tab-control__tab${active === tab.id ? ' gestionale-tab-control__tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
