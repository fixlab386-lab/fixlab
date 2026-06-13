import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { getRepairs, updateRepair } from '../../../lib/firestore'
import type { Repair } from '../../../types'
import { exportRepairsExcel } from '../../../components/repairs/exportRepairsExcel'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  DetailPanel,
  ActionBar,
  ToolButton,
  type ActionBarAction,
} from '../../../components/ui'
import RepairFilterBar from './RepairFilterBar'
import RepairSectionActions from './RepairSectionActions'
import { createRepairTableColumns } from './repairTableColumns'
import { useRepairListState } from './hooks/useRepairListState'
import { REPAIR_PRIORITIES, REPAIR_STATUS_ORDER } from './constants'
import { formatRepairDate, repairStatusLabel } from './utils'
import '../../theme/gestionale-tokens.css'

const columns = createRepairTableColumns()

export default function RiparazioniSection() {
  const { loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [staleDays, setStaleDays] = useState<number | null>(null)

  const list = useRepairListState(repairs, staleDays)

  useEffect(() => {
    const status = searchParams.get('status')
    const open = searchParams.get('open')
    const stale = searchParams.get('stale')

    if (status === 'ready') list.setStatusFilter('ready')
    else if (status === 'completed') list.setStatusFilter('completed')
    else if (open === '1') list.setStatusFilter('active')
    else if (stale) {
      list.setStatusFilter('active')
      setStaleDays(parseInt(stale, 10) || 7)
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getRepairs(studioId)
      .then(data => {
        if (!cancelled) setRepairs(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare le riparazioni.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<string, number>> = {}
    for (const r of repairs) {
      counts[r.status] = (counts[r.status] || 0) + 1
    }
    return counts
  }, [repairs])

  const activeCount = useMemo(() => repairs.filter(r => r.status !== 'completed').length, [repairs])

  const hasActiveFilters =
    list.statusFilter !== 'active' || list.priorityFilter !== 'all' || staleDays != null

  const listTotalValue = useMemo(() => list.filtered.reduce((t, r) => t + (r.totalCost || 0), 0), [list.filtered])

  const advanceStatus = useCallback(
    async (repair: Repair) => {
      const idx = REPAIR_STATUS_ORDER.indexOf(repair.status)
      if (idx < 0 || idx >= REPAIR_STATUS_ORDER.length - 1) return
      const next = REPAIR_STATUS_ORDER[idx + 1]
      try {
        await updateRepair(repair.id, { status: next })
        setRepairs(prev => prev.map(r => (r.id === repair.id ? { ...r, status: next } : r)))
        if (list.selected?.id === repair.id) list.setSelected({ ...repair, status: next })
        setLoadError(null)
      } catch {
        setLoadError('Aggiornamento stato non riuscito.')
      }
    },
    [list],
  )

  const handleOpen = useCallback(
    (id: string) => {
      navigate(`/riparazioni/${id}`)
    },
    [navigate],
  )

  const handleNew = useCallback(() => {
    navigate('/riparazioni/nuova')
  }, [navigate])

  const handleExcel = useCallback(() => {
    exportRepairsExcel(list.filtered, activeArchive?.name ?? studioId ?? 'riparazioni')
  }, [list.filtered, activeArchive?.name, studioId])

  const handleRapportoIntervento = useCallback(
    (repair: Repair) => {
      const params = new URLSearchParams({ type: 'rapporto_intervento' })
      if (repair.clientId) {
        params.set('subjectId', repair.clientId)
        params.set('subjectType', 'client')
      }
      navigate(`/documenti/nuovo?${params.toString()}`)
    },
    [navigate],
  )

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      { id: 'new', label: 'Nuovo', icon: '➕', onClick: handleNew },
      { id: 'excel', label: 'Excel', icon: '📊', onClick: handleExcel, disabled: list.filtered.length === 0 },
      { id: 'cassa', label: 'Cassa', icon: '💰', onClick: () => navigate('/cassa') },
    ],
    [handleNew, handleExcel, list.filtered.length, navigate],
  )

  const filterBanner = staleDays != null ? `Filtro attivo: ticket fermi da almeno ${staleDays} giorni` : null

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento riparazioni…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && repairs.length === 0) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-riparazioni">
        {loadError}
      </div>
    )
  }

  return (
    <div className="gestionale-page" data-tutorial="page-riparazioni">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}
      {filterBanner ? <div className="gestionale-page__banner">{filterBanner}</div> : null}

      <SectionHeader
        title="Riparazioni"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca cliente, telefono, modello, ticket, problema…"
        actions={
          <RepairSectionActions
            showFilterMenu={list.showFilterMenu}
            hasActiveFilters={hasActiveFilters}
            onToggleFilterMenu={list.toggleFilterMenu}
            activeCount={activeCount}
            onCassa={() => navigate('/cassa')}
          />
        }
      />

      {list.showFilterMenu ? (
        <RepairFilterBar
          statusFilter={list.statusFilter}
          priorityFilter={list.priorityFilter}
          statusCounts={statusCounts}
          activeCount={activeCount}
          totalCount={repairs.length}
          onStatusFilterChange={list.setStatusFilter}
          onPriorityFilterChange={list.setPriorityFilter}
          onClearFilters={() => {
            list.resetFilters()
            setStaleDays(null)
          }}
        />
      ) : null}

      <MasterDetailLayout
        detailCollapsed={list.detailCollapsed}
        onToggleDetail={() => list.setDetailCollapsed(c => !c)}
        master={
          <DataTable
            rows={list.filtered}
            columns={columns}
            rowKey={r => r.id}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const r = repairs.find(x => x.id === keys[0])
                if (r) list.selectItem(r)
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => list.selectItem(item)}
            emptyMessage="Nessuna riparazione. Usa «Nuovo» per aprire un ticket officina."
            virtualize
            virtualizeThreshold={50}
          />
        }
        detail={
          list.selected ? (
            <DetailPanel
              title={list.selected.ticketNumber ? `Ticket ${list.selected.ticketNumber}` : 'Ticket riparazione'}
              tabs={[{ id: 'riepilogo', label: 'Riepilogo', content: null }]}
              activeTabId="riepilogo"
              onTabChange={() => {}}
              fields={[
                { label: 'Stato', value: repairStatusLabel(list.selected.status) },
                { label: 'Cliente', value: list.selected.clientName },
                { label: 'Telefono', value: list.selected.clientPhone },
                { label: 'Dispositivo', value: `${list.selected.deviceBrand} ${list.selected.deviceModel}`.trim() },
                { label: 'Problema', value: list.selected.problem, span: 2 },
                {
                  label: 'Priorità',
                  value: REPAIR_PRIORITIES[list.selected.priority]?.label || list.selected.priority,
                },
                { label: 'Totale', value: `€ ${(list.selected.totalCost || 0).toFixed(2)}` },
                { label: 'Apertura', value: formatRepairDate(list.selected.createdAt) },
                ...(list.selected.diagnosis ? [{ label: 'Diagnosi', value: list.selected.diagnosis, span: 2 as const }] : []),
              ]}
              footer={
                <>
                  <ToolButton label="Apri ticket" icon="🔧" onClick={() => handleOpen(list.selected!.id)} />
                  {list.selected.status === 'ready' ? (
                    <ToolButton
                      label="Incassa"
                      icon="💰"
                      onClick={() => navigate(`/cassa?repairId=${list.selected!.id}`)}
                    />
                  ) : null}
                  {list.selected.status !== 'completed' && list.selected.status !== 'on_hold' ? (
                    <ToolButton label="Avanti stato" icon="▶" onClick={() => void advanceStatus(list.selected!)} />
                  ) : null}
                  <ToolButton
                    label="Rapporto d'intervento"
                    icon="📄"
                    onClick={() => handleRapportoIntervento(list.selected!)}
                  />
                </>
              }
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun ticket selezionato</strong>
                Seleziona una riga per il riepilogo oppure usa «Nuovo» per aprire un ticket officina.
                <br />
                <span style={{ fontSize: 12, color: 'var(--gestionale-text-muted, #666)' }}>
                  Nei documenti il rapporto d&apos;intervento commerciale si crea da Documenti; qui gestisci il flusso officina
                  (stati, diagnosi, incasso cassa).
                </span>
              </p>
            </div>
          )
        }
      />

      <ActionBar
        count={list.filtered.length}
        countLabel="riparazioni"
        actions={actionBarActions}
        right={
          list.filtered.length > 0 ? (
            <span style={{ fontSize: 12 }}>
              Valore elenco: <strong>€ {listTotalValue.toFixed(2)}</strong>
            </span>
          ) : null
        }
      />
    </div>
  )
}
