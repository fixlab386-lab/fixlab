import type { DataTableColumn } from '../ui'
import type { DocRecord } from '../../types'
import { DOCUMENT_STATUS_LABELS } from './constants'
import { documentTypeLabel, formatDocDate } from './utils'

export function createDocumentTableColumns(): DataTableColumn<DocRecord>[] {
  return [
    {
      id: 'type',
      header: 'Tipo',
      width: 110,
      sortable: true,
      accessor: d => documentTypeLabel(d.type),
      render: d => documentTypeLabel(d.type),
    },
    {
      id: 'number',
      header: 'Numero',
      width: 88,
      sortable: true,
      accessor: d => d.fullNumber,
      render: d => <span className="gestionale-datatable__link">{d.fullNumber}</span>,
    },
    {
      id: 'date',
      header: 'Data',
      width: 88,
      sortable: true,
      accessor: d => d.date,
      render: d => formatDocDate(d.date),
    },
    {
      id: 'subject',
      header: 'Cliente',
      minWidth: 160,
      sortable: true,
      accessor: d => d.subjectName,
      render: d => d.subjectName || '—',
    },
    {
      id: 'total',
      header: 'Totale',
      width: 96,
      align: 'right',
      sortable: true,
      accessor: d => d.totalDocument,
      render: d => `€ ${(d.totalDocument || 0).toFixed(2)}`,
    },
    {
      id: 'status',
      header: 'Stato',
      width: 100,
      sortable: true,
      accessor: d => d.status,
      render: d => DOCUMENT_STATUS_LABELS[d.status] || d.status,
    },
  ]
}
