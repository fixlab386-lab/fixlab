import { Fragment } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutAndClearSession } from '../lib/logout'
import { useAuth } from '../hooks/useAuth'
import { useStudioFeatures } from '../hooks/useStudioFeatures'
import { filterByStudioFeatures, TOOLBAR_NAV_FEATURES } from '../lib/studioFeatures'
import '../theme/gestionale.css'
import '../gestionale/theme/gestionale-tokens.css'
import '../theme/gestionale-archives.css'
import '../theme/danea-enterprise.css'
import '../gestionale/theme/danea-scheda-global.css'
import ToolbarIcon from './navigation/ToolbarIcons'
import { OnboardingProvider } from '../contexts/OnboardingContext'
import { AppWindowsProvider, useAppWindows } from '../contexts/AppWindowsContext'
import { StudioTablesProvider } from '../contexts/StudioTablesContext'
import { OnboardingGate } from './onboarding'
import ToolbarNewMenu from './navigation/ToolbarNewMenu'
import ToolbarDocumentiMenu from './navigation/ToolbarDocumentiMenu'
import ToolbarPagamentiMenu from './navigation/ToolbarPagamentiMenu'
import ToolbarMagazzinoMenu from './navigation/ToolbarMagazzinoMenu'
import ToolbarAnalisiMenu from './navigation/ToolbarAnalisiMenu'
import ToolbarStrumentiMenu from './navigation/ToolbarStrumentiMenu'
import StrumentiTabelleWindow from './strumenti/StrumentiTabelleWindow'
import VenditaAlBancoModal from '../gestionale/features/vendita-banco/VenditaAlBancoModal'
import OrdineClienteModal from '../gestionale/features/ordine-cliente/OrdineClienteModal'
import OrdineFornitoreModal from '../gestionale/features/ordine-fornitore/OrdineFornitoreModal'
import DocumentoClienteModal from '../gestionale/features/documento-cliente/DocumentoClienteModal'
import DocumentoFornitoreModal from '../gestionale/features/documento-fornitore/DocumentoFornitoreModal'
import ArchiviWindow from './archives/ArchiviWindow'
import OpzioniApplicazioneWindow from './settings/opzioni/OpzioniApplicazioneWindow'
import BancheRisorseWindow from './BancheRisorseWindow'
import SubscriptionGuard from './SubscriptionGuard'
import { hasAdminAccess } from '../lib/adminAccess'

type NavDef = {
  id: string
  label: string
  path: string
  exact?: boolean
}

const NAV_ITEMS: NavDef[] = [
  { id: 'start', label: 'Start', path: '/', exact: true },
  { id: 'clienti', label: 'Clienti', path: '/clienti' },
  { id: 'fornitori', label: 'Fornitori', path: '/fornitori' },
  { id: 'prodotti', label: 'Prodotti', path: '/magazzino' },
  { id: 'pagamenti', label: 'Pagamenti', path: '/pagamenti' },
  { id: 'magazzino', label: 'Magazzino', path: '/movimenti' },
  { id: 'riparazioni', label: 'Riparazioni', path: '/riparazioni' },
  { id: 'archivi', label: 'Archivi', path: '__archivi__' },
  { id: 'impostazioni', label: 'Impostazioni', path: '__opzioni__' },
]

function isNavActive(item: NavDef, pathname: string): boolean {
  if (item.exact) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

function GestionaleShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isSuperAdmin } = useAuth()
  const showAdminLink = hasAdminAccess({ email: user?.email, isSuperAdminClaim: isSuperAdmin })
  const { archiviOpen, openArchivi, opzioniOpen, openOpzioni } = useAppWindows()
  const documentiActive = location.pathname.startsWith('/documenti')
  const { features } = useStudioFeatures()

  const handleLogout = async () => {
    await logoutAndClearSession()
    navigate('/login')
  }

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
            <ToolbarIcon id={item.id} />
          </span>
          <span className="gestionale-toolbar__label">{item.label}</span>
        </button>
      )
    }
    if (item.id === 'magazzino') {
      return (
        <ToolbarMagazzinoMenu key={item.id} active={isNavActive(item, location.pathname)} />
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
            <ToolbarIcon id={item.id} />
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
          <ToolbarIcon id={item.id} />
        </span>
        <span className="gestionale-toolbar__label">{item.label}</span>
      </button>
    )
  }

  const beforeDocumenti = filterByStudioFeatures(NAV_ITEMS.slice(0, 4), features, TOOLBAR_NAV_FEATURES)
  const afterPagamenti = filterByStudioFeatures(NAV_ITEMS.slice(5), features, TOOLBAR_NAV_FEATURES)
  const pagamentiActive = isNavActive(NAV_ITEMS[4], location.pathname)

  return (
    <SubscriptionGuard>
      <div className="gestionale-theme gestionale-shell">
        <div className="gestionale-app-chrome">
          <div className="gestionale-toolbar-strip">
            <ToolbarNewMenu />
            <nav className="gestionale-toolbar gestionale-toolbar--main" aria-label="Navigazione principale FIXLab">
              {beforeDocumenti.map(renderNavButton)}
              <ToolbarDocumentiMenu active={documentiActive} />
              <ToolbarPagamentiMenu active={pagamentiActive} />
              {afterPagamenti.map(item => (
                <Fragment key={item.id}>
                  {item.id === 'archivi' ? <ToolbarStrumentiMenu /> : null}
                  {renderNavButton(item)}
                  {item.id === 'magazzino' ? (
                    <ToolbarAnalisiMenu active={location.pathname === '/analisi'} />
                  ) : null}
                </Fragment>
              ))}
              {showAdminLink && (
                <button
                  type="button"
                  className="gestionale-toolbar__item"
                  onClick={() => navigate('/admin')}
                  title="Admin Panel"
                  style={{ borderLeft: '1px solid var(--border, rgba(255,255,255,0.1))' }}
                >
                  <span className="gestionale-toolbar__icon" aria-hidden="true">
                    <ToolbarIcon id="admin" />
                  </span>
                  <span className="gestionale-toolbar__label">Admin</span>
                </button>
              )}
              <button
                type="button"
                className="gestionale-toolbar__item"
                onClick={() => void handleLogout()}
                title="Esci e torna al login"
              >
                <span className="gestionale-toolbar__icon" aria-hidden="true">
                  <ToolbarIcon id="esci" />
                </span>
                <span className="gestionale-toolbar__label">Esci</span>
              </button>
            </nav>
          </div>
        </div>
        <main className="gestionale-workspace">
          <Outlet />
        </main>
        <VenditaAlBancoModal />
        <OrdineClienteModal />
        <OrdineFornitoreModal />
        <DocumentoClienteModal />
        <DocumentoFornitoreModal />
        <ArchiviWindow />
        <OpzioniApplicazioneWindow />
        <BancheRisorseWindow />
        <StrumentiTabelleWindow />
        <OnboardingGate />
      </div>
    </SubscriptionGuard>
  )
}

export default function GestionaleLayout() {
  return (
    <OnboardingProvider>
      <AppWindowsProvider>
        <StudioTablesProvider>
          <GestionaleShell />
        </StudioTablesProvider>
      </AppWindowsProvider>
    </OnboardingProvider>
  )
}
