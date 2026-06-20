import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { needsEmailVerification } from './lib/auth'
import { CartProvider } from './contexts/CartContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CookieConsentProvider } from './contexts/CookieConsentContext'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import CompleteProfile from './pages/CompleteProfile'
import Dashboard from './pages/Dashboard'
import Magazzino from './pages/Magazzino'
import Riparazioni from './pages/Riparazioni'
import Cassa from './pages/Cassa'
import Clienti from './pages/Clienti'
import Fornitori from './pages/Fornitori'
import Documenti from './pages/Documenti'
import NuovoDocumento from './pages/NuovoDocumento'
import Pagamenti from './pages/Pagamenti'
import MovimentiMagazzino from './pages/MovimentiMagazzino'
import AnalisiPage from './gestionale/features/analisi/AnalisiPage'
import ImpostazioniOpener from './pages/ImpostazioniOpener'
import PrivacyPolicy from './pages/PrivacyPolicy'
import CookiePolicy from './pages/CookiePolicy'
import GestionaleLayout from './components/GestionaleLayout'
import { ActiveStudioProvider } from './contexts/ActiveStudioContext'
import { AppUpdateProvider } from './contexts/AppUpdateContext'
import AppUpdateBanner from './components/AppUpdateBanner'
import CookieConsentBanner from './components/CookieConsentBanner'
import UserInstallationSync from './components/UserInstallationSync'
import WhatsAppSetup from './WhatsAppSetup'
import DesignSystem from './pages/DesignSystem'
import Welcome from './pages/Welcome'
import Impersonate from './pages/Impersonate'
import AdminSetup from './pages/admin/AdminSetup'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminPaymentConfig from './pages/admin/AdminPaymentConfig'
import AdminRevenue from './pages/admin/AdminRevenue'
import { hasWelcomeChoice, isDesktopApp } from './lib/welcomeChoice'
import { hasAdminAccess } from './lib/adminAccess'

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
  const { user, userProfile, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!userProfile) return <Navigate to="/complete-profile" replace />
  if (needsEmailVerification(user, userProfile)) return <Navigate to="/verify-email" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isSuperAdmin, loading } = useAuth()
  const adminAccess = hasAdminAccess({ email: user?.email, isSuperAdminClaim: isSuperAdmin })
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!userProfile) return <Navigate to="/complete-profile" replace />
  if (needsEmailVerification(user, userProfile)) return <Navigate to="/verify-email" replace />
  if (!adminAccess) return <Navigate to="/admin/setup" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <>{children}</>
  if (!userProfile) return <Navigate to="/complete-profile" replace />
  if (needsEmailVerification(user, userProfile)) return <Navigate to="/verify-email" replace />
  return <Navigate to="/" replace />
}

function CompleteProfileRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (userProfile) {
    if (needsEmailVerification(user, userProfile)) return <Navigate to="/verify-email" replace />
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function VerifyEmailRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!needsEmailVerification(user, userProfile)) return <Navigate to="/" replace />
  return <>{children}</>
}

function WelcomeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (user) return <Navigate to="/" replace />
  if (isDesktopApp()) return <Navigate to="/login" replace />
  if (hasWelcomeChoice()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function WelcomeGate({ children }: { children: React.ReactNode }) {
  if (!isDesktopApp() && !hasWelcomeChoice()) {
    return <Navigate to="/welcome" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <CookieConsentProvider>
      <ThemeProvider>
        <CartProvider>
          <AppUpdateProvider>
          <AppRouter>
            <ActiveStudioProvider>
            <UserInstallationSync />
            <AppUpdateBanner />
            <CookieConsentBanner />
            <Routes>
              <Route path="/welcome" element={<WelcomeRoute><Welcome /></WelcomeRoute>} />
              <Route path="/login" element={<PublicRoute><WelcomeGate><Login /></WelcomeGate></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><WelcomeGate><Register /></WelcomeGate></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/verify-email" element={<VerifyEmailRoute><VerifyEmail /></VerifyEmailRoute>} />
              <Route path="/complete-profile" element={<CompleteProfileRoute><CompleteProfile /></CompleteProfileRoute>} />
              <Route path="/impersonate" element={<Impersonate />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookie" element={<CookiePolicy />} />
              <Route path="/design-system" element={<DesignSystem />} />
              <Route path="/admin/setup" element={<PrivateRoute><AdminSetup /></PrivateRoute>} />
              <Route path="/admin" element={<SuperAdminRoute><AdminLayout /></SuperAdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="revenue" element={<AdminRevenue />} />
                <Route path="payment-config" element={<AdminPaymentConfig />} />
              </Route>
              <Route path="/" element={<PrivateRoute><GestionaleLayout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="clienti" element={<Clienti />} />
                <Route path="fornitori" element={<Fornitori />} />
                <Route path="magazzino" element={<Magazzino />} />
                <Route path="riparazioni" element={<Riparazioni />} />
                <Route path="riparazioni/nuova" element={<Navigate to="/riparazioni" replace />} />
                <Route path="riparazioni/:id" element={<Navigate to="/riparazioni" replace />} />
                <Route path="documenti" element={<Documenti />} />
                <Route path="documenti/tipo/:type" element={<Documenti />} />
                <Route path="documenti/nuovo" element={<NuovoDocumento />} />
                <Route path="documenti/:id" element={<NuovoDocumento />} />
                <Route path="pagamenti" element={<Pagamenti />} />
                <Route path="movimenti" element={<MovimentiMagazzino />} />
                <Route path="cassa" element={<Cassa />} />
                <Route path="analisi" element={<AnalisiPage />} />
                <Route path="analytics" element={<Navigate to="/" replace />} />
                <Route path="impostazioni" element={<ImpostazioniOpener />} />
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
