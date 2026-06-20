type Props = {
  title: string
  subtitle: string
}

/**
 * Intestazione in stile Danea Easyfatt usata nei dialog "Selezione cliente" /
 * "Selezione fornitore": titolo blu, sottotitolo grigio e icona circolare
 * (persona + lente) sulla destra. Identica per tutti i modal anagrafici.
 */
export default function DaneaSelectionHeader({ title, subtitle }: Props) {
  return (
    <div className="danea-sel-header">
      <div className="danea-sel-header__text">
        <h2 className="danea-sel-header__title">{title}</h2>
        <p className="danea-sel-header__subtitle">{subtitle}</p>
      </div>
      <span className="danea-sel-header__icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="46" height="46" role="img">
          <defs>
            <linearGradient id="daneaSelBadge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6ba3de" />
              <stop offset="1" stopColor="#2f66a8" />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="23" fill="url(#daneaSelBadge)" stroke="#24517f" strokeWidth="1" />
          <g fill="#ffffff">
            <circle cx="22" cy="17.5" r="6" />
            <path d="M11 35.5c0-6.1 4.9-10.6 11-10.6s11 4.5 11 10.6V37H11z" />
          </g>
          <g>
            <circle cx="32.5" cy="30.5" r="7.6" fill="#eaf3fb" stroke="#24517f" strokeWidth="2" />
            <circle cx="32.5" cy="30.5" r="4" fill="none" stroke="#2f66a8" strokeWidth="2" />
            <rect
              x="37.4"
              y="34.6"
              width="7.4"
              height="3.2"
              rx="1.6"
              transform="rotate(45 37.4 34.6)"
              fill="#1f4670"
            />
          </g>
        </svg>
      </span>
    </div>
  )
}
