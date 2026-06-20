import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { useStudioFeatures } from '../../../hooks/useStudioFeatures'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import { updateRepair, listenRepairs } from '../../../lib/firestore'
import { fetchRepairsPage } from '../../../lib/firestorePagination'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import type { Repair } from '../../../types'
import { exportRepairsExcel } from '../../../components/repairs/exportRepairsExcel'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  ActionBar,
  type ActionBarAction,
} from '../../../components/ui'
import RepairFilterBar from './RepairFilterBar'
import RepairSectionActions from './RepairSectionActions'
import RepairDetailPanel from './RepairDetailPanel'
import { createRepairTableColumns } from './repairTableColumns'
import { useRepairListState } from './hooks/useRepairListState'
import { REPAIR_STATUS_ORDER } from './constants'
import { openOrdineForRepair } from './openOrdineForRepair'
import '../../theme/gestionale-tokens.css'

export default function RiparazioniSection() {
  const { loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { openOrdineCliente, openOrdineClienteEdit } = useAppWindows()
  const { isEnabled } = useStudioFeatures()
  const posEnabled = isEnabled('pos')

  const {
    data: repairs,
    syncing,
    loadingMore,
    hasMore,
    truncated,
    error: loadError,
    loadMore,
    showInitialSpinner,
  } = useStudioPagedLiveQuery(studioId, listenRepairs, fetchRepairsPage, !authLoading && Boolean(studioId))
  const [staleDays, setStaleDays] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = useRepairListState(repairs, staleDays)

  useEffect(() => {
    const status = searchParams.get('status')
    const open = searchParams.get('open')
    const stale = searchParams.get('stale')
    const repairId = searchParams.get('repairId')

    if (status === 'ready') list.setStatusFilter('ready')
    else if (status === 'completed') list.setStatusFilter('completed')
    else if (open === '1') list.setStatusFilter('active')
    else if (stale) {
      list.setStatusFilter('active')
      setStaleDays(parseInt(stale, 10) || 7)
    }

    if (repairId && repairs.length) {
      const repair = repairs.find(r => r.id === repairId)
      if (repair) list.selectItem(repair)
    }
  }, [searchParams, repairs])

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
        if (list.selected?.id === repair.id) list.setSelected({ ...repair, status: next })
      } catch {
        setActionError('Aggiornamento stato non riuscito.')
      }
    },
    [list],
  )

  const openOrdineFromRepair = useCallback(
    (repair: Repair) => {
      openOrdineForRepair(repair, openOrdineCliente, openOrdineClienteEdit)
    },
    [openOrdineCliente, openOrdineClienteEdit],
  )

  const columns = useMemo(
    () => createRepairTableColumns({ onTicketClick: openOrdineFromRepair }),
    [openOrdineFromRepair],
  )

  const handleNewOrdine = useCallback(() => {
    if (list.selected) {
      openOrdineFromRepair(list.selected)
      return
    }
    openOrdineCliente()
  }, [list.selected, openOrdineFromRepair, openOrdineCliente])

  const handleExcel = useCallback(() => {
    exportRepairsExcel(list.filtered, activeArchive?.name ?? studioId ?? 'riparazioni')
  }, [list.filtered, activeArchive?.name, studioId])

  const handleRapportoIntervento = useCallback(
    (repair: Repair) => {
      openOrdineFromRepair(repair)
    },
    [openOrdineFromRepair],
  )

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      { id: 'new', label: 'Nuovo', icon: '➕', onClick: handleNewOrdine },
      { id: 'excel', label: 'Excel', icon: '📊', onClick: handleExcel, disabled: list.filtered.length === 0 },
      ...(posEnabled
        ? [{ id: 'cassa', label: 'Cassa', icon: '💰', onClick: () => navigate('/cassa') } satisfies ActionBarAction]
        : []),
    ],
    [handleNewOrdine, handleExcel, list.filtered.length, navigate, posEnabled],
  )

  const filterBanner = staleDays != null ? `Filtro attivo: ticket fermi da almeno ${staleDays} giorni` : null

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && repairs.length === 0 && !showInitialSpinner) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-riparazioni">
        {loadError}
      </div>
    )
  }

  return (
    <div className="gestionale-page" data-tutorial="page-riparazioni">
      {syncing && repairs.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinner ? <div className="gestionale-page-skeleton">Caricamento riparazioni…</div> : null}
      {loadError || actionError ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{loadError || actionError}</div>
      ) : null}
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
            onCassa={posEnabled ? () => navigate('/cassa') : undefined}
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
        detailWidth={420}
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
            onRowDoubleClick={openOrdineFromRepair}
            emptyMessage="Nessuna riparazione. Usa «Nuovo» per aprire un ordine cliente."
            virtualize
            virtualizeThreshold={50}
          />
        }
        detail={
          list.selected ? (
            <RepairDetailPanel
              repair={list.selected}
              activeTab={list.detailTab}
              onTabChange={list.setDetailTab}
              onAdvanceStatus={() => void advanceStatus(list.selected!)}
              onRapportoIntervento={() => handleRapportoIntervento(list.selected!)}
              onIncassa={posEnabled ? () => navigate(`/cassa?repairId=${list.selected!.id}`) : undefined}
              canAdvance={list.selected.status !== 'completed' && list.selected.status !== 'on_hold'}
              isReady={list.selected.status === 'ready'}
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun ticket selezionato</strong>
                Seleziona una riga per il dettaglio oppure usa «Nuovo» per aprire un ordine cliente.
                <br />
                <span style={{ fontSize: 12, color: 'var(--gestionale-text-muted, #666)' }}>
                  Da ordine cliente puoi concludere in rapporto d&apos;intervento, DDT, vendita al banco e fatture pro-forma.
                </span>
              </p>
            </div>
          )
        }
      />

      <LoadMoreBar hasMore={hasMore} loading={loadingMore} truncated={truncated} onLoadMore={loadMore} />

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
