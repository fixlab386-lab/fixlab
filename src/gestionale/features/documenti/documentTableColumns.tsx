import type { DataTableColumn } from '../../../components/ui'
import type { DocRecord } from '../../../types'
import { ALL_DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, subjectLabelForType } from './constants'
import { documentTypeLabel, formatDocDate } from './utils'

type Handlers = {
  onSubjectClick?: (doc: DocRecord) => void
  onLinkedClick?: (doc: DocRecord) => void
  linkedStatusText?: (doc: DocRecord) => string
}

function defaultLinkedStatusLabel(doc: DocRecord): string {
  if (doc.status === 'cancelled') return 'Annullato'
  if (doc.linkedDocumentId && doc.linkedDocumentType) {
    const label = ALL_DOCUMENT_TYPE_LABELS[doc.linkedDocumentType] || doc.linkedDocumentType
    return `→ ${label}`
  }
  return DOCUMENT_STATUS_LABELS[doc.status] || doc.status
}

function preventivoDescription(doc: DocRecord): string {
  if (doc.type !== 'preventivo') return ''
  if (doc.status === 'confirmed' || doc.status === 'completed') return `Confermato il ${formatDocDate(doc.date)}`
  return 'Non confermato'
}

export function createDocumentTableColumns(
  options?: { hideType?: boolean; handlers?: Handlers },
): DataTableColumn<DocRecord>[] {
  const handlers = options?.handlers
  const cols: DataTableColumn<DocRecord>[] = [
    {
      id: 'date',
      header: 'Data',
      width: 88,
      sortable: true,
      accessor: d => d.date,
      render: d => formatDocDate(d.date),
    },
    {
      id: 'number',
      header: 'N.',
      width: 72,
      sortable: true,
      accessor: d => d.fullNumber,
      render: d => d.fullNumber,
    },
    {
      id: 'subject',
      header: 'Cliente',
      minWidth: 160,
      sortable: true,
      accessor: d => d.subjectName,
      render: d =>
        d.subjectName && handlers?.onSubjectClick ? (
          <button
            type="button"
            className="documenti-cell-link"
            onClick={e => {
              e.stopPropagation()
              handlers.onSubjectClick!(d)
            }}
          >
            {d.subjectName}
          </button>
        ) : (
          d.subjectName || '—'
        ),
    },
    {
      id: 'status',
      header: 'Stato',
      minWidth: 140,
      sortable: true,
      accessor: d => d.status,
      render: d => {
        const label = handlers?.linkedStatusText?.(d) ?? defaultLinkedStatusLabel(d)
        if (d.linkedDocumentId && handlers?.onLinkedClick) {
          return (
            <button
              type="button"
              className="documenti-cell-link"
              onClick={e => {
                e.stopPropagation()
                handlers.onLinkedClick!(d)
              }}
            >
              {label}
            </button>
          )
        }
        return label
      },
    },
    {
      id: 'comment',
      header: 'Commento',
      minWidth: 120,
      sortable: false,
      render: d => {
        const notes = d.internalNotes?.split('\n')[0] || ''
        if (d.type === 'preventivo' && d.validityDays) {
          return `Validità preventivo ${d.validityDays} gg`
        }
        return notes || '—'
      },
    },
    {
      id: 'total',
      header: 'Tot. dovuto',
      width: 100,
      align: 'right',
      sortable: true,
      accessor: d => d.totalDocument,
      render: d => `€ ${(d.totalDocument || 0).toFixed(2)}`,
    },
    {
      id: 'descr',
      header: 'Descr. preventivo',
      minWidth: 120,
      sortable: false,
      render: d => preventivoDescription(d) || '—',
    },
    {
      id: 'acconto',
      header: 'Acconto',
      width: 88,
      align: 'right',
      sortable: false,
      render: d => (d.paymentTerms?.includes('€') ? d.paymentTerms : d.paymentTerms || ''),
    },
  ]

  if (options?.hideType) {
    return cols.filter(c => c.id !== 'type')
  }

  if (!options?.hideType) {
    cols.unshift({
      id: 'type',
      header: 'Tipo',
      width: 110,
      sortable: true,
      accessor: d => documentTypeLabel(d.type),
      render: d => documentTypeLabel(d.type),
    })
  }

  // For non-preventivo lists hide preventivo-only columns
  return cols
}

export function columnsForDocumentType(
  type: string,
  handlers?: Handlers,
): DataTableColumn<DocRecord>[] {
  const subjectHeader = subjectLabelForType(type)
  return createDocumentTableColumns({ hideType: true, handlers })
    .filter(c => {
      if (type !== 'preventivo' && (c.id === 'descr' || c.id === 'acconto')) return false
      return true
    })
    .map(c => (c.id === 'subject' ? { ...c, header: subjectHeader } : c))
}
