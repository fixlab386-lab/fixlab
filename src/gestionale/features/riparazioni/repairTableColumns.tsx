import type { DataTableColumn } from '../../../components/ui'
import type { Repair } from '../../../types'
import { REPAIR_PRIORITIES } from './constants'
import { formatRepairDate, repairStatusLabel } from './utils'

export function createRepairTableColumns(): DataTableColumn<Repair>[] {
  return [
    {
      id: 'ticket',
      header: 'Ticket',
      width: 88,
      sortable: true,
      accessor: r => r.ticketNumber || r.id.slice(0, 6),
      render: r => <span className="gestionale-datatable__link">{r.ticketNumber || '—'}</span>,
    },
    {
      id: 'status',
      header: 'Stato',
      width: 110,
      sortable: true,
      accessor: r => r.status,
      render: r => <span className="gestionale-repair-sheet__badge">{repairStatusLabel(r.status)}</span>,
    },
    {
      id: 'client',
      header: 'Cliente',
      minWidth: 140,
      sortable: true,
      accessor: r => r.clientName,
      render: r => (
        <div>
          <div>{r.clientName || '—'}</div>
          {r.clientPhone ? <div style={{ fontSize: 11, color: 'var(--gestionale-text-muted, #666)' }}>{r.clientPhone}</div> : null}
        </div>
      ),
    },
    {
      id: 'device',
      header: 'Dispositivo',
      minWidth: 130,
      sortable: true,
      accessor: r => `${r.deviceBrand} ${r.deviceModel}`,
      render: r => `${r.deviceBrand || ''} ${r.deviceModel || ''}`.trim() || '—',
    },
    {
      id: 'problem',
      header: 'Problema',
      minWidth: 160,
      sortable: true,
      accessor: r => r.problem,
      render: r => (
        <span title={r.problem} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
          {r.problem || '—'}
        </span>
      ),
    },
    {
      id: 'priority',
      header: 'Priorità',
      width: 80,
      sortable: true,
      accessor: r => r.priority,
      render: r =>
        r.priority !== 'normal' ? (
          <span style={{ fontSize: 11, fontWeight: 600 }}>{REPAIR_PRIORITIES[r.priority]?.label || r.priority}</span>
        ) : (
          '—'
        ),
    },
    {
      id: 'total',
      header: 'Totale',
      width: 88,
      align: 'right',
      sortable: true,
      accessor: r => r.totalCost || 0,
      render: r => `€ ${(r.totalCost || 0).toFixed(2)}`,
    },
    {
      id: 'date',
      header: 'Apertura',
      width: 96,
      sortable: true,
      accessor: r => coalesceSortDate(r.createdAt),
      render: r => formatRepairDate(r.createdAt),
    },
  ]
}

function coalesceSortDate(d: unknown): number {
  if (!d) return 0
  if (d instanceof Date) return d.getTime()
  if (typeof d === 'object' && d !== null && 'toDate' in d) {
    return (d as { toDate: () => Date }).toDate().getTime()
  }
  if (typeof d === 'object' && d !== null && 'seconds' in d) {
    return (d as { seconds: number }).seconds * 1000
  }
  const parsed = new Date(d as string)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}
