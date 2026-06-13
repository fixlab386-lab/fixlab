import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { CartProvider } from './contexts/CartContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CookieConsentProvider } from './contexts/CookieConsentContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Magazzino from './pages/Magazzino'
import Riparazioni from './pages/Riparazioni'
import NuovaRiparazione from './pages/NuovaRiparazione'
import Cassa from './pages/Cassa'
import Clienti from './pages/Clienti'
import Fornitori from './pages/Fornitori'
import Documenti from './pages/Documenti'
import NuovoDocumento from './pages/NuovoDocumento'
import Pagamenti from './pages/Pagamenti'
import MovimentiMagazzino from './pages/MovimentiMagazzino'
import Dispositivi from './pages/Dispositivi'
import Impostazioni from './pages/Impostazioni'
import PrivacyPolicy from './pages/PrivacyPolicy'
import CookiePolicy from './pages/CookiePolicy'
import GestionaleLayout from './components/GestionaleLayout'
import { ActiveStudioProvider } from './contexts/ActiveStudioContext'
import { AppUpdateProvider } from './contexts/AppUpdateContext'
import AppUpdateBanner from './components/AppUpdateBanner'
import CookieConsentBanner from './components/CookieConsentBanner'
import WhatsAppSetup from './WhatsAppSetup'
import DesignSystem from './pages/DesignSystem'

function AuthLoading() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: '14px' }}>FIXLab...</div>
    </div>
  )
}

function AppRouter({ children }: { children: React.ReactNode }) {
  const isDesktop = window.fixlabDesktop?.isElectron === true
  if (isDesktop) {
    return <HashRouter>{children}</HashRouter>
  }
  return <BrowserRouter>{children}</BrowserRouter>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  return user ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  return !user ? <>{children}</> : <Navigate to="/" />
}

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <CartProvider>
          <AppUpdateProvider>
          <AppRouter>
            <ActiveStudioProvider>
            <AppUpdateBanner />
            <CookieConsentBanner />
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookie" element={<CookiePolicy />} />
              {/* Demo design system gestionale — route temporanea, senza Layout legacy */}
              <Route path="/design-system" element={<DesignSystem />} />
              <Route path="/" element={<PrivateRoute><GestionaleLayout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="clienti" element={<Clienti />} />
                <Route path="fornitori" element={<Fornitori />} />
                <Route path="magazzino" element={<Magazzino />} />
                <Route path="riparazioni" element={<Riparazioni />} />
                <Route path="riparazioni/nuova" element={<NuovaRiparazione />} />
                <Route path="riparazioni/:id" element={<NuovaRiparazione />} />
                <Route path="dispositivi" element={<Dispositivi />} />
                <Route path="documenti" element={<Documenti />} />
                <Route path="documenti/tipo/:type" element={<Documenti />} />
                <Route path="documenti/nuovo" element={<NuovoDocumento />} />
                <Route path="documenti/:id" element={<NuovoDocumento />} />
                <Route path="pagamenti" element={<Pagamenti />} />
                <Route path="movimenti" element={<MovimentiMagazzino />} />
                <Route path="cassa" element={<Cassa />} />
                <Route path="analytics" element={<Navigate to="/" replace />} />
                <Route path="impostazioni" element={<Impostazioni />} />
                <Route path="impostazioni/whatsapp" element={<WhatsAppSetup />} />
              </Route>
            </Routes>
            </ActiveStudioProvider>
          </AppRouter>
          </AppUpdateProvider>
        </CartProvider>
      </ThemeProvider>
    </CookieConsentProvider>
  )
}