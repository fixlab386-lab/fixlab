import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../theme/gestionale.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../theme/gestionale-archives.css'
import { OnboardingProvider } from '../contexts/OnboardingContext'
import { AppWindowsProvider, useAppWindows } from '../contexts/AppWindowsContext'
import { OnboardingGate } from './onboarding'
import { ArchiveSelector } from './archives'
import ToolbarNewMenu from './navigation/ToolbarNewMenu'
import VenditaAlBancoModal from '../gestionale/features/vendita-banco/VenditaAlBancoModal'
import DocumentiWindow from '../gestionale/features/documenti/DocumentiWindow'
import { ToolbarTop, type ToolbarTopItem } from './ui'

type NavDef = {
  id: string
  label: string
  path: string
  icon: string
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

function GestionaleShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { documentiOpen, openDocumenti } = useAppWindows()

  const toolbarItems: ToolbarTopItem[] = NAV_ITEMS.map(item => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    active: item.id === 'documenti' ? documentiOpen : isNavActive(item, location.pathname),
    onClick: () => {
      if (item.id === 'documenti') {
        openDocumenti()
        return
      }
      navigate(item.path)
    },
  }))

  return (
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
      <DocumentiWindow />
      <OnboardingGate />
    </div>
  )
}

export default function GestionaleLayout() {
  return (
    <OnboardingProvider>
      <AppWindowsProvider>
        <GestionaleShell />
      </AppWindowsProvider>
    </OnboardingProvider>
  )
}
