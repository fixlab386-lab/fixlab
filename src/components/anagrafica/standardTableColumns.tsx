import type { DataTableColumn } from '../ui'

type AnagraficaRow = {
  code?: string
  name: string
  city?: string
  province?: string
  phone?: string
  vatNumber?: string
}

export function createAnagraficaTableColumns<T extends AnagraficaRow>(
  options?: { includePhone?: boolean },
): DataTableColumn<T>[] {
  const cols: DataTableColumn<T>[] = [
    { id: 'code', header: 'Cod.', width: 56, sortable: true, accessor: r => r.code || '' },
    {
      id: 'name',
      header: 'Denominazione',
      sortable: true,
      accessor: r => r.name,
      render: r => <span className="gestionale-datatable__link">{r.name}</span>,
    },
    { id: 'city', header: 'Città', width: 110, sortable: true, accessor: r => r.city || '' },
    {
      id: 'province',
      header: 'Prov.',
      width: 48,
      sortable: true,
      align: 'center',
      accessor: r => r.province || '',
    },
  ]

  if (options?.includePhone) {
    cols.push({ id: 'phone', header: 'Telefono', width: 120, accessor: r => r.phone || '' })
  }

  cols.push({ id: 'vat', header: 'Partita Iva', width: 130, accessor: r => r.vatNumber || '' })

  return cols
}
