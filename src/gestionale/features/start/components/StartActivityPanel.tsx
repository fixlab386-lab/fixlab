import { Link } from 'react-router-dom'
import type { ActivityLink } from './activityLinks'

type Props = {
  links: ActivityLink[]
}

export default function StartActivityPanel({ links }: Props) {
  return (
    <section className="gestionale-start-panel gestionale-start-panel--activity">
      <div className="gestionale-start-panel__content-row">
        <div className="gestionale-start-panel__icon" aria-hidden="true">
          📋
        </div>
        <div className="gestionale-start-panel__content">
          <h2 className="gestionale-start-panel__title">Attività</h2>
          {links.length === 0 ? (
            <p className="gestionale-start-panel__ok">✓ Tutto in ordine — nessuna attività urgente.</p>
          ) : (
            <ul className="gestionale-start-activity-list">
              {links.map(item => (
                <li key={item.id}>
                  <Link to={item.to} className="gestionale-start-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
