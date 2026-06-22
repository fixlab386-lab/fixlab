type Props = {
  onMouseDown: (clientX: number) => void
  className?: string
}

export default function TableColumnResizer({ onMouseDown, className = 'gestionale-datatable__col-resizer' }: Props) {
  return (
    <span
      className={className}
      role="separator"
      aria-orientation="vertical"
      aria-label="Ridimensiona colonna"
      onMouseDown={e => {
        e.preventDefault()
        e.stopPropagation()
        onMouseDown(e.clientX)
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}
