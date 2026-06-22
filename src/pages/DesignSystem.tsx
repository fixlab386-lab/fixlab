import { useMemo, useState } from 'react'
import '../theme/gestionale.css'
import {
  ToolbarTop,
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  DetailPanel,
  ActionBar,
  ToolButton,
  FormField,
  type DataTableColumn,
  type DataTableSortDirection,
} from '../components/ui'

type DemoClient = {
  id: string
  code: string
  name: string
  city: string
  province: string
  phone: string
  vat: string
  repairs: number
  spent: number
}

function makeFakeClients(count: number): DemoClient[] {
  const cities = ['Milano', 'Roma', 'Torino', 'Bologna', 'Firenze', 'Napoli', 'Verona', 'Padova']
  const provinces = ['MI', 'RM', 'TO', 'BO', 'FI', 'NA', 'VR', 'PD']
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    const ci = i % cities.length
    return {
      id: `c-${n}`,
      code: String(n).padStart(4, '0'),
      name: `Cliente demo ${n}`,
      city: cities[ci],
      province: provinces[ci],
      phone: `333 ${String(1000000 + n).slice(-7)}`,
      vat: n % 3 === 0 ? `IT${String(10000000000 + n)}` : '',
      repairs: (n * 3) % 17,
      spent: Math.round((n * 47.5 + 120) * 100) / 100,
    }
  })
}

const FAKE_CLIENTS = makeFakeClients(120)

const TOOLBAR_ICONS = {
  clienti: '👤',
  fornitori: '🏭',
  prodotti: '📦',
  documenti: '📄',
  pagamenti: '💳',
  magazzino: '📋',
  riparazioni: '🔧',
  impostazioni: '⚙️',
} as const

export default function DesignSystem() {
  const [activeModule, setActiveModule] = useState('clienti')
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['c-3'])
  const [selectedId, setSelectedId] = useState('c-3')
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [detailTab, setDetailTab] = useState('anagrafica')
  const [sortColumnId, setSortColumnId] = useState<string | null>('code')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('asc')
  const [formName, setFormName] = useState('Cliente demo 3')
  const [formPhone, setFormPhone] = useState('333 1000003')

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return FAKE_CLIENTS
    return FAKE_CLIENTS.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.phone.includes(q),
    )
  }, [search])

  const selected = useMemo(
    () => FAKE_CLIENTS.find(c => c.id === selectedId) ?? filteredRows[0],
    [selectedId, filteredRows],
  )

  const columns: DataTableColumn<DemoClient>[] = useMemo(
    () => [
      {
        id: 'code',
        header: 'Cod.',
        width: 56,
        sortable: true,
        accessor: r => r.code,
      },
      {
        id: 'name',
        header: 'Denominazione',
        sortable: true,
        accessor: r => r.name,
        render: r => (
          <span className="gestionale-datatable__link" onClick={e => e.stopPropagation()}>
            {r.name}
          </span>
        ),
      },
      { id: 'city', header: 'Città', width: 100, sortable: true, accessor: r => r.city },
      { id: 'province', header: 'Prov.', width: 48, sortable: true, accessor: r => r.province, align: 'center' },
      { id: 'phone', header: 'Telefono', width: 110, accessor: r => r.phone },
      { id: 'vat', header: 'Partita Iva', width: 130, accessor: r => r.vat || '—' },
      {
        id: 'repairs',
        header: 'Rip.',
        width: 48,
        sortable: true,
        align: 'right',
        accessor: r => r.repairs,
      },
      {
        id: 'spent',
        header: 'Totale €',
        width: 88,
        sortable: true,
        align: 'right',
        accessor: r => r.spent,
        render: r => `€ ${r.spent.toFixed(2)}`,
      },
    ],
    [],
  )

  const handleSort = (columnId: string) => {
    if (sortColumnId === columnId) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumnId(columnId)
      setSortDirection('asc')
    }
  }

  const handleRowClick = (row: DemoClient) => {
    setSelectedId(row.id)
    setSelectedKeys([row.id])
    setFormName(row.name)
    setFormPhone(row.phone)
  }

  const toolbarItems = Object.entries(TOOLBAR_ICONS).map(([id, icon]) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    icon,
    active: activeModule === id,
    onClick: () => setActiveModule(id),
  }))

  const detailFieldsAnagrafica = selected
    ? [
        { label: 'Codice', value: selected.code },
        { label: 'Denominazione', value: selected.name, span: 2 as const },
        { label: 'Città', value: selected.city },
        { label: 'Provincia', value: selected.province },
        { label: 'Telefono', value: selected.phone, link: true },
        { label: 'Partita IVA', value: selected.vat || '—' },
      ]
    : []

  const detailFieldsCommerciali = selected
    ? [
        { label: 'Riparazioni', value: String(selected.repairs) },
        { label: 'Totale speso', value: `€ ${selected.spent.toFixed(2)}` },
        { label: 'Listino', value: 'Privati' },
        { label: 'Pagamento', value: 'Contanti / Bonifico' },
      ]
    : []

  return (
    <div className="gestionale-theme gestionale-shell">
      <ToolbarTop items={toolbarItems} aria-label="Moduli FIXLab (demo)" />

      <div className="gestionale-workspace">
        <SectionHeader
          title="Clienti"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cerca cliente…"
          actions={
            <>
              <button type="button" className="gestionale-section-header__action-btn">
                Raggruppa
              </button>
              <button type="button" className="gestionale-section-header__action-btn">
                Filtra
              </button>
              <button type="button" className="gestionale-section-header__action-btn">
                Seleziona
              </button>
              <button type="button" className="gestionale-section-header__action-btn">
                Colonne
              </button>
            </>
          }
        />

        <MasterDetailLayout
          detailCollapsed={detailCollapsed}
          onToggleDetail={() => setDetailCollapsed(c => !c)}
          master={
            <DataTable
              rows={filteredRows}
              columns={columns}
              rowKey={r => r.id}
              tableId="design-system"
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={keys => {
                setSelectedKeys(keys)
                if (keys.length === 1) {
                  const row = FAKE_CLIENTS.find(c => c.id === keys[0])
                  if (row) handleRowClick(row)
                }
              }}
              sortColumnId={sortColumnId}
              sortDirection={sortDirection}
              onSort={handleSort}
              onRowClick={handleRowClick}
              virtualize
              virtualizeThreshold={40}
            />
          }
          detail={
            <DetailPanel
              title={selected?.name}
              tabs={[
                {
                  id: 'anagrafica',
                  label: 'Anagrafica',
                  content: null,
                },
                {
                  id: 'commerciali',
                  label: 'Rapporti commerciali',
                  content: null,
                },
                {
                  id: 'varie',
                  label: 'Varie',
                  content: (
                    <div className="gestionale-demo-form-stack">
                      <FormField label="Note" htmlFor="demo-note">
                        <input
                          id="demo-note"
                          className="gestionale-form-field__input"
                          defaultValue="Cliente abituale — ritiro preferito nel pomeriggio."
                        />
                      </FormField>
                    </div>
                  ),
                },
              ]}
              activeTabId={detailTab}
              onTabChange={setDetailTab}
              fields={
                detailTab === 'anagrafica'
                  ? detailFieldsAnagrafica
                  : detailTab === 'commerciali'
                    ? detailFieldsCommerciali
                    : undefined
              }
              footer={
                <ToolButton label="WhatsApp" icon="💬" variant="success" title="Invia messaggio" />
              }
            />
          }
        />

        <ActionBar
          count={filteredRows.length}
          countLabel="clienti"
          actions={[
            { id: 'new', label: 'Nuovo', icon: '➕', onClick: () => {} },
            { id: 'dup', label: 'Duplica', icon: '📋' },
            { id: 'del', label: 'Elimina', icon: '🗑', variant: 'danger', disabled: selectedKeys.length === 0 },
            { id: 'print', label: 'Stampa', icon: '🖨' },
            { id: 'labels', label: 'Etichette', icon: '🏷' },
            { id: 'excel', label: 'Excel', icon: '📊' },
          ]}
        />
      </div>

      {/* Isolated component showcase */}
      <section className="gestionale-demo-section" style={{ flexShrink: 0 }}>
        <h3 className="gestionale-demo-section__title">Componenti isolati</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <ToolButton label="Predefinito" icon="📄" />
          <ToolButton label="Attivo" icon="✓" active />
          <ToolButton label="Elimina" icon="🗑" variant="danger" />
          <ToolButton label="WhatsApp" icon="💬" variant="success" />
          <ToolButton label="Disabilitato" disabled />
        </div>
        <div className="gestionale-demo-form-stack">
          <FormField label="Denominazione" required htmlFor="demo-name">
            <input
              id="demo-name"
              className="gestionale-form-field__input"
              value={formName}
              onChange={e => setFormName(e.target.value)}
            />
          </FormField>
          <FormField label="Telefono" htmlFor="demo-phone">
            <input
              id="demo-phone"
              className="gestionale-form-field__input"
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
            />
          </FormField>
          <FormField label="Con errore" error="Campo obbligatorio">
            <input className="gestionale-form-field__input" disabled placeholder="—" />
          </FormField>
        </div>
      </section>
    </div>
  )
}
