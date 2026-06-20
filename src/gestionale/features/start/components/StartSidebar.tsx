import { useAppWindows } from '../../../../contexts/AppWindowsContext'
import { useStudioFeatures } from '../../../../hooks/useStudioFeatures'
import StartConnectedDevicesPanel from './StartConnectedDevicesPanel'

type QuickAction = {
  id: string
  label: string
  icon: string
  action: 'vendita_banco' | 'ordine_cliente' | 'ddt'
  feature: 'pos' | null
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'ordine_cliente',
    label: 'Ordine cliente',
    icon: '📦',
    action: 'ordine_cliente',
    feature: null,
  },
  {
    id: 'vendita_banco',
    label: 'Vendita al banco',
    icon: '€',
    action: 'vendita_banco',
    feature: 'pos',
  },
  {
    id: 'ddt',
    label: 'Documento di trasporto',
    icon: '🚚',
    action: 'ddt',
    feature: null,
  },
]

export default function StartSidebar() {
  const { openVenditaBanco, openOrdineCliente, openDocumentoClienteNew } = useAppWindows()
  const { isEnabled } = useStudioFeatures()

  const visibleActions = QUICK_ACTIONS.filter(action => !action.feature || isEnabled(action.feature))

  const handleAction = (action: QuickAction['action']) => {
    if (action === 'vendita_banco') openVenditaBanco()
    if (action === 'ordine_cliente') openOrdineCliente()
    if (action === 'ddt') openDocumentoClienteNew('ddt')
  }

  return (
    <aside className="gestionale-start-sidebar gestionale-start-sidebar--rail" data-tutorial="start-sidebar">
      <section className="gestionale-start-sidebar__section">
        <h2 className="gestionale-start-sidebar__title">Azioni rapide</h2>
        <ul className="gestionale-start-sidebar__actions">
          {visibleActions.map(action => (
            <li key={action.id}>
              <button
                type="button"
                className="gestionale-start-sidebar__action"
                onClick={() => handleAction(action.action)}
              >
                <span className="gestionale-start-sidebar__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span>{action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <StartConnectedDevicesPanel variant="sidebar" />
    </aside>
  )
}
