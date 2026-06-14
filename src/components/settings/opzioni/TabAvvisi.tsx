import { Fragment } from 'react'
import { AVVISI_ITEMS, type ApplicationOptions } from '../../../lib/applicationOptions'

type Props = {
  value: ApplicationOptions['avvisi']
  onChange: (id: string, enabled: boolean) => void
}

export default function TabAvvisi({ value, onChange }: Props) {
  const groups = [...new Set(AVVISI_ITEMS.map(a => a.group))]

  return (
    <div className="opzioni-tab-panel opzioni-tab-panel--avvisi">
      <table className="opzioni-avvisi-table">
        <thead>
          <tr>
            <th>Mostra</th>
            <th>Messaggio</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <Fragment key={group}>
              <tr className="opzioni-avvisi-table__group">
                <td colSpan={2}>{group}</td>
              </tr>
              {AVVISI_ITEMS.filter(a => a.group === group).map(item => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" checked={!!value[item.id]} onChange={e => onChange(item.id, e.target.checked)} />
                  </td>
                  <td>{item.label}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
