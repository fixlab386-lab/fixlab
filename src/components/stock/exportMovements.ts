import type { StockMovement } from '../../types'
import { MOVEMENT_TYPE_LABELS } from './constants'
import { movementQuantityDisplay } from './stockPreview'
import { formatMovementDate } from './utils'

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportMovementsCsv(rows: StockMovement[], filename = 'movimenti-magazzino.csv') {
  const headers = [
    'Data',
    'Codice',
    'Prodotto',
    'Tipo',
    'Quantità',
    'Causale',
    'Documento',
    'Operatore',
    'Note',
  ]
  const lines = [
    headers.join(','),
    ...rows.map(m =>
      [
        formatMovementDate(m.date),
        m.productCode || '',
        m.productName || '',
        MOVEMENT_TYPE_LABELS[m.type] || m.type,
        movementQuantityDisplay(m),
        m.cause || '',
        m.linkedDocumentId || '',
        m.operatorName || '',
        m.notes || '',
      ]
        .map(v => csvEscape(String(v)))
        .join(','),
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
