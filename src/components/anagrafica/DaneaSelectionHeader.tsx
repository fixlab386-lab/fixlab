type Props = {
  title: string
  subtitle: string
}

/**
 * Intestazione in stile Danea Easyfatt usata nei dialog "Selezione cliente" /
 * "Selezione fornitore": titolo blu, sottotitolo grigio e icona due persone sulla destra.
 */
export default function DaneaSelectionHeader({ title, subtitle }: Props) {
  return (
    <div className="danea-sel-header">
      <div className="danea-sel-header__text">
        <h2 className="danea-sel-header__title">{title}</h2>
        <p className="danea-sel-header__subtitle">{subtitle}</p>
      </div>
      <span className="danea-sel-header__icon" aria-hidden="true">
        <svg viewBox="0 0 52 44" width="52" height="44" role="img">
          {/* Persona 1 — giacca blu (Danea) */}
          <circle cx="14" cy="10" r="7" fill="#f5c89a" stroke="#c4956a" strokeWidth="0.8" />
          <path
            d="M4 38c0-5.5 4.5-10 10-10s10 4.5 10 10v2H4z"
            fill="#2f66a8"
            stroke="#1f4670"
            strokeWidth="0.8"
          />
          <path d="M8 28 L14 22 L20 28" fill="#2f66a8" stroke="#1f4670" strokeWidth="0.6" />
          {/* Persona 2 — camicia arancione (Danea) */}
          <circle cx="36" cy="12" r="7" fill="#f5c89a" stroke="#c4956a" strokeWidth="0.8" />
          <path
            d="M26 40c0-5.5 4.5-10 10-10s10 4.5 10 10v2H26z"
            fill="#e07020"
            stroke="#b85510"
            strokeWidth="0.8"
          />
          <path d="M30 30 L36 24 L42 30" fill="#e07020" stroke="#b85510" strokeWidth="0.6" />
        </svg>
      </span>
    </div>
  )
}
