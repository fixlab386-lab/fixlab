import { useMemo } from 'react'
import type { PaymentExpenseLine } from '../../../../types'
import { useStudioTables } from '../../../../contexts/StudioTablesContext'
import { useAppWindows } from '../../../../contexts/AppWindowsContext'
import { CONTI_SPESE } from '../paymentDettaglio'

type Props = {
  lines: PaymentExpenseLine[]
  readOnly: boolean
  selectedLineId: string | null
  onSelectLine: (id: string) => void
  onChange: (lines: PaymentExpenseLine[]) => void
}

function contoLabel(codice: string, descrizione: string): string {
  return descrizione ? `${codice} ${descrizione}` : descrizione || codice
}

export default function TabRigheRegistrazione({
  lines,
  readOnly,
  selectedLineId,
  onSelectLine,
  onChange,
}: Props) {
  const { tables } = useStudioTables()
  const { openStrumentiTabella } = useAppWindows()

  // Conti d'acquisto configurati dal professionista (Strumenti → Tabelle).
  // Fallback ai conti spese predefiniti se la tabella è vuota.
  const conti = useMemo(
    () =>
      tables.contiAcquisto.length > 0
        ? tables.contiAcquisto.map(c => ({ codice: c.id, label: c.nome }))
        : CONTI_SPESE.map(c => ({ codice: c.codice, label: c.label })),
    [tables.contiAcquisto],
  )

  const patchLine = (id: string, patch: Partial<PaymentExpenseLine>) => {
    onChange(lines.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }

  const addLine = () => {
    const conto = conti[0]
    onChange([
      ...lines,
      {
        id: crypto.randomUUID(),
        importoNetto: 0,
        contoCodice: conto?.codice ?? '',
        contoDescrizione: conto?.label ?? '',
        descrizione: '',
      },
    ])
  }

  const removeSelected = () => {
    if (!selectedLineId || lines.length <= 1) return
    onChange(lines.filter(l => l.id !== selectedLineId))
  }

  const moveLine = (dir: -1 | 1) => {
    if (!selectedLineId) return
    const idx = lines.findIndex(l => l.id === selectedLineId)
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= lines.length) return
    const copy = [...lines]
    const [item] = copy.splice(idx, 1)
    copy.splice(next, 0, item)
    onChange(copy)
  }

  const splitLine = () => {
    if (!selectedLineId) return
    const line = lines.find(l => l.id === selectedLineId)
    if (!line || line.importoNetto <= 0) return
    const half = Math.round((line.importoNetto / 2) * 100) / 100
    const rest = Math.round((line.importoNetto - half) * 100) / 100
    onChange(
      lines.flatMap(l => {
        if (l.id !== selectedLineId) return [l]
        return [
          { ...l, importoNetto: half },
          { ...l, id: crypto.randomUUID(), importoNetto: rest, descrizione: `${l.descrizione} (2)` },
        ]
      }),
    )
  }

  return (
    <div className="pagamenti-dettaglio-righe">
      <div className="pagamenti-dettaglio-righe__table-wrap">
        <table className="pagamenti-dettaglio-righe__table">
          <thead>
            <tr>
              <th>Importo netto</th>
              <th>Conto</th>
              <th>Descrizione</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const selected = line.id === selectedLineId
              return (
                <tr
                  key={line.id}
                  className={selected ? 'pagamenti-dettaglio-righe__row--selected' : undefined}
                  onClick={() => onSelectLine(line.id)}
                >
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="pagamenti-dettaglio-righe__input pagamenti-dettaglio-righe__input--num"
                      value={line.importoNetto || ''}
                      disabled={readOnly}
                      onChange={e => patchLine(line.id, { importoNetto: parseFloat(e.target.value) || 0 })}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <select
                      className="pagamenti-dettaglio-righe__input"
                      value={`${line.contoCodice}|${line.contoDescrizione}`}
                      disabled={readOnly}
                      onChange={e => {
                        const [codice, ...rest] = e.target.value.split('|')
                        patchLine(line.id, { contoCodice: codice, contoDescrizione: rest.join('|') })
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {(conti.some(c => c.codice === line.contoCodice)
                        ? conti
                        : [...conti, { codice: line.contoCodice, label: line.contoDescrizione }]
                      ).map(c => (
                        <option key={c.codice} value={`${c.codice}|${c.label}`}>
                          {contoLabel(c.codice, c.label)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="pagamenti-dettaglio-righe__input"
                      value={line.descrizione}
                      disabled={readOnly}
                      onChange={e => patchLine(line.id, { descrizione: e.target.value })}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="pagamenti-dettaglio-righe__toolbar">
        <button type="button" className="pagamenti-dettaglio-righe__tool" disabled={readOnly || !selectedLineId} onClick={() => moveLine(-1)} title="Sposta su">
          ▲
        </button>
        <button type="button" className="pagamenti-dettaglio-righe__tool" disabled={readOnly || !selectedLineId} onClick={() => moveLine(1)} title="Sposta giù">
          ▼
        </button>
        <button type="button" className="pagamenti-dettaglio-righe__tool" disabled={readOnly} onClick={addLine}>
          ★ Nuova
        </button>
        <button type="button" className="pagamenti-dettaglio-righe__tool" disabled={readOnly || !selectedLineId} onClick={splitLine}>
          ÷ Dividi
        </button>
        <button type="button" className="pagamenti-dettaglio-righe__tool pagamenti-dettaglio-righe__tool--danger" disabled={readOnly || !selectedLineId || lines.length <= 1} onClick={removeSelected}>
          ✕ Elimina
        </button>
        <button
          type="button"
          className="pagamenti-dettaglio-righe__tool"
          onClick={() => openStrumentiTabella('conti')}
          title="Elenco conti d'acquisto"
        >
          ≡ Elenco conti
        </button>
        <button type="button" className="pagamenti-dettaglio-righe__tool" disabled title="Excel">
          Excel
        </button>
      </div>
    </div>
  )
}
