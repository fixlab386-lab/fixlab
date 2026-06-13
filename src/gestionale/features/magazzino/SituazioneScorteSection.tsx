import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { getProducts, getStockMovements } from '../../../lib/firestore'
import type { Product, StockMovement } from '../../../types'
import type { StockStatus } from '../../lib/stockAvailability'
import {
  ActionBar,
  DataTable,
  DetailPanel,
  MasterDetailLayout,
  SectionHeader,
  ToolButton,
  type ActionBarAction,
} from '../../../components/ui'
import {
  buildStockSituationRows,
  exportStockSituationCsv,
  filterStockSituation,
  STOCK_STATUS_LABELS,
  type StockSituationRow,
} from './stockSituation'
import { createStockSituationColumns } from './situazioneTableColumns'

const columns = createStockSituationColumns()

export default function SituazioneScorteSection() {
  const { loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all')
  const [selected, setSelected] = useState<StockSituationRow | null>(null)
  const [sortColumnId, setSortColumnId] = useState<string | null>('code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const [p, m] = await Promise.all([getProducts(studioId), getStockMovements(studioId)])
      setProducts(p)
      setMovements(m)
      setLoadError(null)
    } catch {
      setLoadError('Impossibile aggiornare la situazione scorte.')
    }
  }, [studioId])

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([getProducts(studioId), getStockMovements(studioId)])
      .then(([p, m]) => {
        if (!cancelled) {
          setProducts(p)
          setMovements(m)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare la situazione scorte.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  const allRows = useMemo(() => buildStockSituationRows(products, movements), [products, movements])

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () => filterStockSituation(allRows, searchLower, statusFilter),
    [allRows, searchLower, statusFilter],
  )

  const tableRows = useMemo(() => {
    const sorted = [...filtered]
    if (sortColumnId) {
      const col = columns.find(c => c.id === sortColumnId)
      if (col?.accessor) {
        const accessor = col.accessor
        sorted.sort((a, b) => {
          const av = accessor(a)
          const bv = accessor(b)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          if (typeof av === 'number' && typeof bv === 'number') return av - bv
          return String(av).localeCompare(String(bv), 'it', { sensitivity: 'base' })
        })
        if (sortDirection === 'desc') sorted.reverse()
      }
    }
    return sorted
  }, [filtered, sortColumnId, sortDirection])

  const handleSort = useCallback((columnId: string) => {
    setSortColumnId(prev => {
      if (prev === columnId) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return columnId
    })
  }, [])

  const handleExcel = useCallback(() => {
    exportStockSituationCsv(tableRows)
  }, [tableRows])

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      { id: 'refresh', label: 'Aggiorna', icon: '↻', onClick: () => void refresh() },
      { id: 'excel', label: 'Excel', icon: '📊', onClick: handleExcel, disabled: tableRows.length === 0 },
      { id: 'print', label: 'Stampa', icon: '🖨', onClick: () => window.print() },
    ],
    [refresh, handleExcel, tableRows.length],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento situazione scorte…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  return (
    <div className="gestionale-page" data-tutorial="page-situazione-scorte">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}

      <SectionHeader
        title="Situazione scorte"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cerca codice, descrizione, categoria…"
        actions={
          <select
            className="gestionale-page__filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StockStatus | 'all')}
            aria-label="Filtro stato scorte"
          >
            <option value="all">Tutti gli stati</option>
            {(Object.keys(STOCK_STATUS_LABELS) as StockStatus[]).map(k => (
              <option key={k} value={k}>
                {STOCK_STATUS_LABELS[k]}
              </option>
            ))}
          </select>
        }
      />

      <MasterDetailLayout
        detailCollapsed={false}
        onToggleDetail={() => {}}
        master={
          <DataTable
            rows={tableRows}
            columns={columns}
            rowKey={r => r.productId}
            sortColumnId={sortColumnId}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRowClick={row => setSelected(row)}
            emptyMessage="Nessun articolo con magazzino."
            virtualize
            virtualizeThreshold={60}
          />
        }
        detail={
          selected ? (
            <DetailPanel
              title={`${selected.code} — ${selected.name}`}
              tabs={[{ id: 'riepilogo', label: 'Riepilogo', content: null }]}
              activeTabId="riepilogo"
              onTabChange={() => {}}
              fields={[
                { label: 'Categoria', value: selected.category || '—' },
                { label: 'Giacenza', value: String(selected.giacenza) },
                { label: 'Impegnata', value: String(selected.impegnata) },
                { label: 'In arrivo', value: String(selected.ordinata) },
                { label: 'Disponibile', value: String(selected.disponibile) },
                { label: 'Scorta minima', value: String(selected.scortaMinima) },
                { label: 'Stato', value: STOCK_STATUS_LABELS[selected.stato] },
              ]}
              footer={
                <>
                  <ToolButton label="Apri prodotto" icon="📦" onClick={() => navigate('/magazzino')} />
                  <ToolButton
                    label="Movimenti"
                    icon="📋"
                    onClick={() => navigate(`/movimenti?productId=${selected.productId}&tab=movimenti`)}
                  />
                </>
              }
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun prodotto selezionato</strong>
                Seleziona una riga per vedere giacenza, impegnato e disponibile.
              </p>
            </div>
          )
        }
      />

      <ActionBar count={tableRows.length} countLabel="articoli" actions={actionBarActions} />
    </div>
  )
}
