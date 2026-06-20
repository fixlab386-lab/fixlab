import { useAppWindows } from '../../../../contexts/AppWindowsContext'
import { useStudioFeatures } from '../../../../hooks/useStudioFeatures'

const LINKS = [
  {
    id: 'vendita_banco',
    label: 'Vendita al banco',
    icon: '€',
    action: 'vendita_banco' as const,
    feature: 'pos' as const,
  },
  {
    id: 'ordine_fornitore',
    label: 'Ordine fornitore',
    icon: '🏭',
    action: 'ordine_fornitore' as const,
    feature: null,
  },
  {
    id: 'ordine_cliente',
    label: 'Ordine cliente',
    icon: '📦',
    action: 'ordine_cliente' as const,
    feature: null,
  },
]

export default function StartQuickLinks() {
  const { openVenditaBanco, openOrdineFornitore, openOrdineCliente } = useAppWindows()
  const { isEnabled } = useStudioFeatures()

  const visibleLinks = LINKS.filter(link => !link.feature || isEnabled(link.feature))

  const handleClick = (action: (typeof LINKS)[number]['action']) => {
    if (action === 'vendita_banco') openVenditaBanco()
    if (action === 'ordine_fornitore') openOrdineFornitore()
    if (action === 'ordine_cliente') openOrdineCliente()
  }

  if (visibleLinks.length === 0) return null

  return (
    <aside className="gestionale-start-sidebar gestionale-start-sidebar--footer">
      <h2 className="gestionale-start-sidebar__title">Collegamenti utili</h2>
      <ul className="gestionale-start-sidebar__list">
        {visibleLinks.map(link => (
          <li key={link.id}>
            <button
              type="button"
              className="gestionale-start-link"
              onClick={() => handleClick(link.action)}
            >
              <span aria-hidden="true">{link.icon}</span> {link.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
