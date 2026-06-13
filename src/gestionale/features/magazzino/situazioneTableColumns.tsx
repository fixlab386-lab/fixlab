import type { DataTableColumn } from '../../../components/ui'
import type { StockSituationRow } from './stockSituation'
import { STOCK_STATUS_LABELS } from './stockSituation'

export function createStockSituationColumns(): DataTableColumn<StockSituationRow>[] {
  return [
    {
      id: 'code',
      header: 'Cod.',
      width: 72,
      sortable: true,
      accessor: r => r.code,
      render: r => <span className="gestionale-datatable__link">{r.code || '—'}</span>,
    },
    {
      id: 'name',
      header: 'Descrizione',
      minWidth: 160,
      sortable: true,
      accessor: r => r.name,
      render: r => r.name,
    },
    {
      id: 'category',
      header: 'Categoria',
      minWidth: 120,
      sortable: true,
      accessor: r => r.category,
      render: r => r.category || '—',
    },
    {
      id: 'giacenza',
      header: 'Giacenza',
      width: 80,
      align: 'right',
      sortable: true,
      accessor: r => r.giacenza,
      render: r => r.giacenza.toLocaleString('it-IT'),
    },
    {
      id: 'impegnata',
      header: 'Impegnata',
      width: 80,
      align: 'right',
      sortable: true,
      accessor: r => r.impegnata,
      render: r => r.impegnata.toLocaleString('it-IT'),
    },
    {
      id: 'ordinata',
      header: 'In arrivo',
      width: 80,
      align: 'right',
      sortable: true,
      accessor: r => r.ordinata,
      render: r => r.ordinata.toLocaleString('it-IT'),
    },
    {
      id: 'disponibile',
      header: 'Disponibile',
      width: 88,
      align: 'right',
      sortable: true,
      accessor: r => r.disponibile,
      render: r => r.disponibile.toLocaleString('it-IT'),
    },
    {
      id: 'scortaMinima',
      header: 'Scorta min.',
      width: 88,
      align: 'right',
      sortable: true,
      accessor: r => r.scortaMinima,
      render: r => r.scortaMinima.toLocaleString('it-IT'),
    },
    {
      id: 'stato',
      header: 'Stato scorte',
      width: 110,
      sortable: true,
      accessor: r => r.stato,
      render: r => (
        <span className={`gestionale-stock-status gestionale-stock-status--${r.stato}`}>{STOCK_STATUS_LABELS[r.stato]}</span>
      ),
    },
  ]
}
