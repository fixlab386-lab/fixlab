import { useEffect, useMemo, useState } from 'react'
import { useAppWindows } from '../../../../contexts/AppWindowsContext'
import { openOrdineForRepair } from '../../riparazioni/openOrdineForRepair'
import { useActiveStudio } from '../../../../hooks/useActiveStudio'
import { loadClientRepairs, loadSubjectDocuments } from '../../../../lib/loadStudioCatalog'
import type { DocRecord, Repair } from '../../../../types'
import type { Cliente } from '../types'
import { clientDisplayName, repairsForCliente } from '../clientLinkedRecords'
import { buildClientRepairRows } from '../clientRepairRows'

type Props = {
  cliente: Cliente
}

export default function TabRiparazioniCliente({ cliente }: Props) {
  const { openOrdineCliente, openOrdineClienteEdit } = useAppWindows()
  const { studioId } = useActiveStudio()
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [documents, setDocuments] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studioId || cliente.isDraft || !cliente.id) {
      setRepairs([])
      setDocuments([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all([loadClientRepairs(studioId, cliente.id), loadSubjectDocuments(studioId, cliente.id)])
      .then(([repairData, docs]) => {
        if (cancelled) return
        setRepairs(repairData)
        setDocuments(docs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, cliente.id, cliente.isDraft])

  const linkedRepairs = useMemo(() => repairsForCliente(repairs, cliente), [repairs, cliente])
  const rows = useMemo(() => buildClientRepairRows(linkedRepairs, documents), [linkedRepairs, documents])

  const openRow = (row: ReturnType<typeof buildClientRepairRows>[number]) => {
    if (row.repair) {
      openOrdineForRepair(row.repair, openOrdineCliente, openOrdineClienteEdit)
      return
    }
    if (row.ordine) {
      openOrdineClienteEdit(row.ordine.id)
    }
  }

  if (cliente.isDraft) {
    return (
      <p className="clienti-linked-empty">
        Salva il cliente per visualizzare le riparazioni collegate.
      </p>
    )
  }

  return (
    <div className="clienti-linked-panel">
      <div className="clienti-linked-panel__toolbar">
        <p className="clienti-linked-panel__hint">
          Riparazioni e ordini cliente di <strong>{clientDisplayName(cliente)}</strong>. Le note dispositivo
          sono nell&apos;ordine cliente (tab Dispositivo).
        </p>
        <button
          type="button"
          className="clienti-scheda-footer__btn"
          onClick={() => openOrdineCliente({ clientId: cliente.id })}
        >
          ＋ Nuovo ordine
        </button>
      </div>

      {loading ? <p className="clienti-linked-empty">Caricamento riparazioni…</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="clienti-linked-empty">
          Nessuna riparazione o ordine con note dispositivo. Usa «Nuovo ordine» o la sezione Riparazioni.
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="clienti-linked-table-wrap">
          <table className="clienti-linked-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Ordine</th>
                <th>Stato</th>
                <th>Dispositivo</th>
                <th>Problema / note</th>
                <th style={{ textAlign: 'right' }}>Totale</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>
                    {row.repair ? (
                      <button
                        type="button"
                        className="clienti-link clienti-linked-table__link"
                        onClick={() => openRow(row)}
                        title="Apri ordine cliente collegato"
                      >
                        {row.ticketLabel}
                      </button>
                    ) : (
                      row.ticketLabel
                    )}
                  </td>
                  <td>
                    {row.ordine ? (
                      <button
                        type="button"
                        className="clienti-link clienti-linked-table__link"
                        onClick={() => openRow(row)}
                        title="Apri ordine cliente"
                      >
                        {row.ordineLabel}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="clienti-link clienti-linked-table__link"
                        onClick={() => openRow(row)}
                        title="Crea ordine cliente da ticket"
                      >
                        Crea ordine
                      </button>
                    )}
                  </td>
                  <td>{row.statusLabel}</td>
                  <td title={row.device}>{row.device || '—'}</td>
                  <td className="clienti-linked-table__desc" title={row.problem}>
                    {row.problem}
                  </td>
                  <td style={{ textAlign: 'right' }}>€ {row.total.toFixed(2)}</td>
                  <td>{row.dateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
