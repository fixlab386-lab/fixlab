import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../theme/gestionale.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../theme/gestionale-archives.css'
import { OnboardingProvider } from '../contexts/OnboardingContext'
import { AppWindowsProvider, useAppWindows } from '../contexts/AppWindowsContext'
import { OnboardingGate } from './onboarding'
import { ArchiveSelector } from './archives'
import ToolbarNewMenu from './navigation/ToolbarNewMenu'
import ToolbarDocumentiMenu from './navigation/ToolbarDocumentiMenu'
import VenditaAlBancoModal from '../gestionale/features/vendita-banco/VenditaAlBancoModal'
import DocumentiWindow from '../gestionale/features/documenti/DocumentiWindow'
import ArchiviWindow from './archives/ArchiviWindow'
import OpzioniApplicazioneWindow from './settings/opzioni/OpzioniApplicazioneWindow'

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
  { id: 'pagamenti', label: 'Pagamenti', path: '/pagamenti', icon: '💳' },
  { id: 'magazzino', label: 'Magazzino', path: '/movimenti', icon: '📋' },
  { id: 'riparazioni', label: 'Riparazioni', path: '/riparazioni', icon: '🔧' },
  { id: 'dispositivi', label: 'Dispositivi', path: '/dispositivi', icon: '📱' },
  { id: 'cassa', label: 'Cassa', path: '/cassa', icon: '💰' },
  { id: 'archivi', label: 'Archivi', path: '__archivi__', icon: '🗂️' },
  { id: 'impostazioni', label: 'Impostazioni', path: '__opzioni__', icon: '⚙️' },
]

function isNavActive(item: NavDef, pathname: string): boolean {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

function GestionaleShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { documentiOpen, archiviOpen, openArchivi, opzioniOpen, openOpzioni } = useAppWindows()

  const renderNavButton = (item: NavDef) => {
    if (item.id === 'archivi') {
      return (
        <button
          key={item.id}
          type="button"
          className={`gestionale-toolbar__item${archiviOpen ? ' gestionale-toolbar__item--active' : ''}`}
          onClick={openArchivi}
          title={item.label}
          aria-pressed={archiviOpen}
        >
          <span className="gestionale-toolbar__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="gestionale-toolbar__label">{item.label}</span>
        </button>
      )
    }
    if (item.id === 'impostazioni') {
      return (
        <button
          key={item.id}
          type="button"
          className={`gestionale-toolbar__item${opzioniOpen ? ' gestionale-toolbar__item--active' : ''}`}
          onClick={() => openOpzioni()}
          title={item.label}
          aria-pressed={opzioniOpen}
        >
          <span className="gestionale-toolbar__icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="gestionale-toolbar__label">{item.label}</span>
        </button>
      )
    }
    return (
      <button
        key={item.id}
        type="button"
        className={`gestionale-toolbar__item${isNavActive(item, location.pathname) ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => navigate(item.path)}
        title={item.label}
        aria-pressed={isNavActive(item, location.pathname)}
      >
        <span className="gestionale-toolbar__icon" aria-hidden="true">
          {item.icon}
        </span>
        <span className="gestionale-toolbar__label">{item.label}</span>
      </button>
    )
  }

  const beforeDocumenti = NAV_ITEMS.slice(0, 4)
  const afterDocumenti = NAV_ITEMS.slice(4)

  return (
    <div className="gestionale-theme gestionale-shell">
      <div className="gestionale-app-chrome">
        <div className="gestionale-toolbar-strip">
          <ToolbarNewMenu />
          <nav className="gestionale-toolbar gestionale-toolbar--main" aria-label="Navigazione principale FIXLab">
            {beforeDocumenti.map(renderNavButton)}
            <ToolbarDocumentiMenu active={documentiOpen} />
            {afterDocumenti.map(renderNavButton)}
          </nav>
        </div>
        <ArchiveSelector />
      </div>
      <main className="gestionale-workspace">
        <Outlet />
      </main>
      <VenditaAlBancoModal />
      <DocumentiWindow />
      <ArchiviWindow />
      <OpzioniApplicazioneWindow />
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
