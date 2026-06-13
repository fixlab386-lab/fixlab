import type { DataTableColumn } from '../ui'
import type { Device } from '../../types'
import { deviceIdentifier, displayDeviceValue } from './utils'

export function createDeviceTableColumns(): DataTableColumn<Device>[] {
  return [
    {
      id: 'identifier',
      header: 'IMEI/SN',
      width: 130,
      minWidth: 110,
      sortable: true,
      accessor: d => deviceIdentifier(d),
      render: d => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{deviceIdentifier(d)}</span>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      width: 100,
      sortable: true,
      accessor: d => d.type,
      render: d => displayDeviceValue(d.type),
    },
    {
      id: 'brand',
      header: 'Marca',
      width: 96,
      sortable: true,
      accessor: d => d.brand,
      render: d => displayDeviceValue(d.brand),
    },
    {
      id: 'model',
      header: 'Modello',
      minWidth: 140,
      sortable: true,
      accessor: d => d.model,
      render: d => (
        <span className="gestionale-datatable__link" title={d.model}>
          {displayDeviceValue(d.model)}
        </span>
      ),
    },
    {
      id: 'client',
      header: 'Cliente',
      minWidth: 140,
      sortable: true,
      accessor: d => d.clientName,
      render: d => displayDeviceValue(d.clientName),
    },
    {
      id: 'repairs',
      header: 'N. riparazioni',
      width: 96,
      align: 'right',
      sortable: true,
      accessor: d => d.totalRepairs ?? 0,
      render: d => (
        <span style={{ fontWeight: d.totalRepairs ? 600 : 400 }}>{d.totalRepairs ?? 0}</span>
      ),
    },
  ]
}
