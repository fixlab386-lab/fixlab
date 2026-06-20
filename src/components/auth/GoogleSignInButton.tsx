type Props = {
  loading?: boolean
  onClick: () => void
  label?: string
}

export default function GoogleSignInButton({ loading, onClick, label = 'Continua con Google' }: Props) {
  return (
    <button type="button" className="auth-google-btn" onClick={onClick} disabled={loading}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.203 36 24 36c-5.522 0-10-4.477-10-10s4.478-10 10-10c2.482 0 4.744.91 6.484 2.414l5.658-5.658C34.046 9.846 29.268 8 24 8 14.611 8 7 15.611 7 25s7.611 17 17 17c9.389 0 17-7.611 17-17 0-1.341-.148-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c2.482 0 4.744.91 6.484 2.414l5.658-5.658C34.046 9.846 29.268 8 24 8 16.318 8 9.656 13.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.148-2.65-.389-3.917z" />
      </svg>
      {loading ? 'Accesso...' : label}
    </button>
  )
}
