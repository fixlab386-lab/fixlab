import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../theme/gestionale.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../theme/gestionale-archives.css'
import { OnboardingProvider } from '../contexts/OnboardingContext'
import { AppWindowsProvider } from '../contexts/AppWindowsContext'
import { OnboardingGate } from './onboarding'
import { ArchiveSelector } from './archives'
import ToolbarNewMenu from './navigation/ToolbarNewMenu'
import VenditaAlBancoModal from '../gestionale/features/vendita-banco/VenditaAlBancoModal'
import { ToolbarTop, type ToolbarTopItem } from './ui'
type NavDef = {
  id: string
  label: string
  path: string
  icon: string
  /** Match exact path only (e.g. Start / dashboard) */
  exact?: boolean
}

const NAV_ITEMS: NavDef[] = [
  { id: 'start', label: 'Start', path: '/', icon: '🏠', exact: true },
  { id: 'clienti', label: 'Clienti', path: '/clienti', icon: '👤' },
  { id: 'fornitori', label: 'Fornitori', path: '/fornitori', icon: '🏭' },
  { id: 'prodotti', label: 'Prodotti', path: '/magazzino', icon: '📦' },
  { id: 'documenti', label: 'Documenti', path: '/documenti', icon: '📄' },
  { id: 'pagamenti', label: 'Pagamenti', path: '/pagamenti', icon: '💳' },
  { id: 'magazzino', label: 'Magazzino', path: '/movimenti', icon: '📋' },
  { id: 'riparazioni', label: 'Riparazioni', path: '/riparazioni', icon: '🔧' },
  { id: 'dispositivi', label: 'Dispositivi', path: '/dispositivi', icon: '📱' },
  { id: 'cassa', label: 'Cassa', path: '/cassa', icon: '💰' },
  { id: 'impostazioni', label: 'Impostazioni', path: '/impostazioni', icon: '⚙️' },
]

function isNavActive(item: NavDef, pathname: string): boolean {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export default function GestionaleLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const toolbarItems: ToolbarTopItem[] = NAV_ITEMS.map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    active: isNavActive(item, location.pathname),
    onClick: () => navigate(item.path),
  }))

  return (
    <OnboardingProvider>
      <AppWindowsProvider>
        <div className="gestionale-theme gestionale-shell">
          <div className="gestionale-app-chrome">
            <div className="gestionale-toolbar-strip">
              <ToolbarNewMenu />
              <ToolbarTop items={toolbarItems} className="gestionale-toolbar--main" aria-label="Navigazione principale FIXLab" />
            </div>
            <ArchiveSelector />
          </div>
          <main className="gestionale-workspace">
            <Outlet />
          </main>
          <VenditaAlBancoModal />
          <OnboardingGate />
        </div>
      </AppWindowsProvider>
    </OnboardingProvider>
  )
}
