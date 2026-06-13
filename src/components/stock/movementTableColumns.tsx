import type { DataTableColumn } from '../ui'
import type { StockMovement } from '../../types'
import { MOVEMENT_TYPE_LABELS } from './constants'
import { movementQuantityDisplay } from './stockPreview'
import { formatMovementDate, linkedDocumentLabel } from './utils'

export function createMovementTableColumns(): DataTableColumn<StockMovement>[] {
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
      id: 'product',
      header: 'Prodotto',
      minWidth: 160,
      sortable: true,
      accessor: m => m.productName,
      render: m => (
        <span title={m.productCode}>
          <span style={{ fontFamily: 'monospace', marginRight: 6, color: 'var(--gestionale-link)' }}>
            {m.productCode}
          </span>
          {m.productName}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      width: 96,
      sortable: true,
      accessor: m => m.type,
      render: m => MOVEMENT_TYPE_LABELS[m.type] || m.type,
    },
    {
      id: 'qty',
      header: 'Quantità',
      width: 80,
      align: 'right',
      sortable: false,
      render: m => movementQuantityDisplay(m),
    },
    {
      id: 'cause',
      header: 'Causale',
      minWidth: 140,
      sortable: true,
      accessor: m => m.cause,
      render: m => m.cause || '—',
    },
    {
      id: 'document',
      header: 'Documento',
      width: 100,
      sortable: false,
      render: m =>
        m.linkedDocumentId ? (
          <span className="gestionale-datatable__link" title={m.linkedDocumentId}>
            {linkedDocumentLabel(m)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'operator',
      header: 'Operatore',
      width: 110,
      sortable: true,
      accessor: m => m.operatorName,
      render: m => m.operatorName || '—',
    },
  ]
}
