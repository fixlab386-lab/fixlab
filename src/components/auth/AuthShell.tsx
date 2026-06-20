import { Link } from 'react-router-dom'
import { APP_ICON_URL } from '../../lib/appIcon'
import '../../theme/auth.css'

type Props = {
  children: React.ReactNode
  heroEyebrow?: string
  heroTitle?: string
  heroSubtitle?: string
}

export default function AuthShell({
  children,
  heroEyebrow = 'Il tuo gestionale',
  heroTitle = 'Accedi al tuo hub per riparazioni, magazzino e documenti',
  heroSubtitle,
}: Props) {
  return (
    <div className="auth-page">
      <aside className="auth-split-hero" aria-hidden="true">
        <img src={APP_ICON_URL} alt="" className="auth-split-hero__logo" width={56} height={56} />
        <div className="auth-split-hero__copy">
          <p className="auth-split-hero__eyebrow">{heroEyebrow}</p>
          <h2 className="auth-split-hero__title">{heroTitle}</h2>
          {heroSubtitle ? <p className="auth-split-hero__subtitle">{heroSubtitle}</p> : null}
        </div>
      </aside>
      <main className="auth-split-form">
        <div className="auth-split-form__inner">{children}</div>
      </main>
    </div>
  )
}

export function AuthFormHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="auth-form-header">
      <img src={APP_ICON_URL} alt="FixLab" className="auth-form-header__logo" width={44} height={44} />
      <h1 className="auth-form-header__title">{title}</h1>
      {subtitle ? <p className="auth-form-header__subtitle">{subtitle}</p> : null}
    </header>
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return <div className="auth-error">{message}</div>
}

export function AuthInfo({ children }: { children: React.ReactNode }) {
  return <div className="auth-info">{children}</div>
}

export function AuthDivider() {
  return <div className="auth-divider">oppure continua con</div>
}

export function AuthFooter({ children }: { children: React.ReactNode }) {
  return <div className="auth-footer">{children}</div>
}

export function AuthLegalLinks() {
  return (
    <div className="auth-footer-links">
      <Link to="/privacy">Privacy</Link>
      <Link to="/cookie">Cookie</Link>
    </div>
  )
}

export const authInputProps = {
  className: 'auth-input',
} as const
