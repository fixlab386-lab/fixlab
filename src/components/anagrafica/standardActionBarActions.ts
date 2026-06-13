import type { ActionBarAction } from '../ui'

type CrudActionHandlers = {
  onNew: () => void
  onDuplicate: () => void
  onDelete: () => void
  duplicateDisabled?: boolean
  deleteDisabled?: boolean
  onPrint?: () => void
  printDisabled?: boolean
  onExcel?: () => void
  excelDisabled?: boolean
}

export function createStandardCrudActions(handlers: CrudActionHandlers): ActionBarAction[] {
  return [
    { id: 'new', label: 'Nuovo', icon: '➕', onClick: handlers.onNew },
    {
      id: 'dup',
      label: 'Duplica',
      icon: '📋',
      onClick: handlers.onDuplicate,
      disabled: handlers.duplicateDisabled,
    },
    {
      id: 'del',
      label: 'Elimina',
      icon: '🗑',
      variant: 'danger',
      onClick: handlers.onDelete,
      disabled: handlers.deleteDisabled,
    },
    { id: 'print', label: 'Stampa', icon: '🖨', onClick: handlers.onPrint, disabled: handlers.onPrint ? handlers.printDisabled : true },
    { id: 'labels', label: 'Etichette', icon: '🏷', disabled: true },
    {
      id: 'excel',
      label: 'Excel',
      icon: '📊',
      onClick: handlers.onExcel,
      disabled: handlers.onExcel ? handlers.excelDisabled : true,
    },
  ]
}
