import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/riparazioni/nuova', label: 'Nuova riparazione', icon: '🔧' },
  { to: '/cassa', label: 'Nuova vendita (Cassa)', icon: '💰' },
  { to: '/magazzino', label: 'Catalogo prodotti', icon: '📦' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
]

export default function StartQuickLinks() {
  return (
    <aside className="gestionale-start-sidebar gestionale-start-sidebar--footer">
      <h2 className="gestionale-start-sidebar__title">Collegamenti utili</h2>
      <ul className="gestionale-start-sidebar__list">
        {LINKS.map(link => (
          <li key={link.to}>
            <Link to={link.to} className="gestionale-start-link">
              <span aria-hidden="true">{link.icon}</span> {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
