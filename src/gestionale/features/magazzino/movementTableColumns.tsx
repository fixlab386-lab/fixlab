import type { DataTableColumn } from '../../../components/ui'
import type { StockMovement } from '../../../types'
import { formatMovementDate, linkedDocumentLabel } from './utils'

type ColumnHandlers = {
  onProductClick?: (productId: string) => void
  onSubjectClick?: (movement: StockMovement) => void
  onCauseClick?: (movement: StockMovement) => void
}

export function createMovementTableColumns(handlers: ColumnHandlers = {}): DataTableColumn<StockMovement>[] {
  return [
    {
      id: 'date',
      header: 'Data',
      width: 88,
      sortable: true,
      accessor: m => m.date,
      render: m => formatMovementDate(m.date),
    },
    {
      id: 'code',
      header: 'Cod.',
      width: 56,
      sortable: true,
      accessor: m => m.productCode,
      render: m => m.productCode || '—',
    },
    {
      id: 'product',
      header: 'Prodotto',
      minWidth: 160,
      sortable: true,
      accessor: m => m.productName,
      render: m =>
        handlers.onProductClick ? (
          <button type="button" className="movimenti-cell-link" onClick={() => handlers.onProductClick!(m.productId)}>
            {m.productName}
          </button>
        ) : (
          m.productName
        ),
    },
    {
      id: 'subject',
      header: 'Cliente / Fornitore',
      minWidth: 140,
      sortable: true,
      accessor: m => m.subjectName,
      render: m =>
        m.subjectName && handlers.onSubjectClick ? (
          <button type="button" className="movimenti-cell-link" onClick={() => handlers.onSubjectClick!(m)}>
            {m.subjectName}
          </button>
        ) : (
          m.subjectName || '—'
        ),
    },
    {
      id: 'loaded',
      header: 'Caricato',
      width: 72,
      align: 'right',
      sortable: true,
      accessor: m => m.loaded ?? 0,
      render: m => (m.loaded ? <span className="movimenti-cell-num">{m.loaded}</span> : ''),
    },
    {
      id: 'unloaded',
      header: 'Scaricato',
      width: 72,
      align: 'right',
      sortable: true,
      accessor: m => m.unloaded ?? 0,
      render: m =>
        m.unloaded ? (
          <span className="movimenti-cell-num movimenti-cell-num--out">{m.unloaded}</span>
        ) : (
          ''
        ),
    },
    {
      id: 'committed',
      header: 'Impegnato',
      width: 72,
      align: 'right',
      sortable: true,
      accessor: m => m.committed ?? 0,
      render: m => (m.committed ? <span className="movimenti-cell-num">{m.committed}</span> : ''),
    },
    {
      id: 'cause',
      header: 'Causale',
      minWidth: 160,
      sortable: true,
      accessor: m => m.cause,
      render: m => {
        const label = linkedDocumentLabel(m)
        if (label === '—') return '—'
        if (m.linkedDocumentId && handlers.onCauseClick) {
          return (
            <button type="button" className="movimenti-cell-link" onClick={() => handlers.onCauseClick!(m)}>
              {label}
            </button>
          )
        }
        return label
      },
    },
    {
      id: 'incoming',
      header: 'In arrivo',
      width: 72,
      align: 'right',
      sortable: true,
      accessor: m => m.incoming ?? 0,
      render: m => (m.incoming ? <span className="movimenti-cell-num">{m.incoming}</span> : ''),
    },
  ]
}
