import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import type { StudioLiveSubscribe } from '../../../hooks/useStudioLiveQuery'
import { deleteDocument, addDocument, listenDocuments } from '../../../lib/firestore'
import { fetchDocumentsPage } from '../../../lib/firestorePagination'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import PaginatedFilterHint from '../../../components/ui/PaginatedFilterHint'
import type { DocRecord } from '../../../types'
import {
  ACTIVE_DOCUMENT_LIST_LABELS,
  columnsForDocumentType,
  DocumentFilterBar,
  DocumentSectionActions,
  sortDocumentRows,
  type ActiveDocumentType,
} from './index'
import { SectionHeader, DataTable } from '../../../components/ui'
import { exportDocumentsExcel } from './exportDocumentsExcel'
import { generateDocumentPDF } from '../../../lib/generatePDF'
import { doc as firestoreDoc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useDocumentListState } from './hooks/useDocumentListState'
import { invalidateDashboardCache } from '../start/dashboardCache'
import DocumentListSidebar, { type DocumentPeriodState } from './DocumentListSidebar'
import DocumentiActionBar from './DocumentiActionBar'
import { formatDocDate } from './utils'
import { resolvePeriodIsoRange } from '../analisi/analisiAggregation'
import { useOpenDocumentFlow } from '../../lib/openDocumentFlow'
import { ALL_DOCUMENT_TYPE_LABELS } from './constants'
import '../../theme/gestionale-tokens.css'
import '../../theme/documenti-hub.css'
import '../../theme/documenti-list-section.css'

const OPTIONAL_DOC_COLUMNS = [
  { id: 'total', label: 'Totale' },
  { id: 'status', label: 'Stato' },
  { id: 'comment', label: 'Commento' },
] as const

type Props = {
  lockedType: ActiveDocumentType
  embedded?: boolean
}

export default function DocumentiSection({ lockedType }: Props) {
  const { loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const { openNew, openEdit } = useOpenDocumentFlow()
  const [searchParams] = useSearchParams()

  const filterClientId = searchParams.get('clientId') || undefined
  const filterSupplierId = searchParams.get('supplierId') || undefined
  const subjectFilterId = filterClientId || filterSupplierId
  const subjectFilterType = filterSupplierId ? ('supplier' as const) : filterClientId ? ('client' as const) : undefined

  const listenDocsOfType = useMemo<StudioLiveSubscribe<DocRecord>>(
    () => (sid, cb, err, max) => listenDocuments(sid, cb, err, max, lockedType),
    [lockedType],
  )
  const fetchDocsOfType = useMemo(
    () => (sid: string, cursor: Parameters<typeof fetchDocumentsPage>[1], pageSize?: number) =>
      fetchDocumentsPage(sid, cursor, pageSize, lockedType),
    [lockedType],
  )

  const {
    data: documents,
    syncing,
    loadingMore,
    hasMore,
    truncated,
    error: loadError,
    loadMore,
    showInitialSpinner,
  } = useStudioPagedLiveQuery(
    studioId,
    listenDocsOfType,
    fetchDocsOfType,
    !authLoading && Boolean(studioId),
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(new Set())
  const [periodState, setPeriodState] = useState<DocumentPeriodState>({
    period: 'tutti',
    periodMonth: null,
    customFrom: '',
    customTo: '',
  })
  const [sidebarSubjectFilter, setSidebarSubjectFilter] = useState('all')

  const handleSubjectClick = useCallback(
    (doc: DocRecord) => {
      if (!doc.subjectId) return
      if (doc.subjectType === 'supplier') {
        navigate(`/fornitori`)
        return
      }
      navigate(`/clienti`)
    },
    [navigate],
  )

  const handleLinkedClick = useCallback(
    async (record: DocRecord) => {
      if (!record.linkedDocumentId) return
      const cached = documents.find(d => d.id === record.linkedDocumentId)
      if (cached) {
        openEdit(cached)
        return
      }
      try {
        const snap = await getDoc(firestoreDoc(db, 'documents', record.linkedDocumentId))
        if (!snap.exists()) return
        const linked = { id: snap.id, ...snap.data() } as DocRecord
        openEdit(linked)
      } catch {
        setActionError('Impossibile aprire il documento collegato.')
      }
    },
    [documents, openEdit],
  )

  const linkedStatusText = useCallback(
    (record: DocRecord) => {
      if (record.status === 'cancelled') return 'Annullato'
      if (record.linkedDocumentId) {
        const linked = documents.find(d => d.id === record.linkedDocumentId)
        if (linked) {
          const typeLabel = ALL_DOCUMENT_TYPE_LABELS[linked.type] || linked.type
          return `→ ${typeLabel} ${linked.fullNumber} del ${formatDocDate(linked.date)}`
        }
        if (record.linkedDocumentType) {
          const typeLabel = ALL_DOCUMENT_TYPE_LABELS[record.linkedDocumentType] || record.linkedDocumentType
          return `→ ${typeLabel}`
        }
      }
      return record.status
    },
    [documents],
  )

  const baseColumns = useMemo(
    () =>
      columnsForDocumentType(lockedType, {
        onSubjectClick: handleSubjectClick,
        onLinkedClick: d => void handleLinkedClick(d),
        linkedStatusText,
      }),
    [lockedType, handleSubjectClick, handleLinkedClick, linkedStatusText],
  )

  const visibleColumns = useMemo(
    () => baseColumns.filter(c => !hiddenColumnIds.has(c.id)),
    [baseColumns, hiddenColumnIds],
  )

  const toggleColumn = useCallback((columnId: string) => {
    setHiddenColumnIds(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) next.delete(columnId)
      else next.add(columnId)
      return next
    })
  }, [])

  const typeDocuments = useMemo(
    () => documents.filter(d => d.type === lockedType),
    [documents, lockedType],
  )

  const scopedDocuments = useMemo(() => {
    if (!subjectFilterId) return typeDocuments
    return typeDocuments.filter(
      d => d.subjectId === subjectFilterId && (!subjectFilterType || d.subjectType === subjectFilterType),
    )
  }, [typeDocuments, subjectFilterId, subjectFilterType])

  const list = useDocumentListState(scopedDocuments, lockedType)

  useEffect(() => {
    const { from, to } = resolvePeriodIsoRange({
      period: periodState.period,
      year: periodState.periodMonth?.year,
      month: periodState.periodMonth?.month,
      customFrom: periodState.customFrom,
      customTo: periodState.customTo,
    })
    list.setDateFrom(from)
    list.setDateTo(to)
  }, [periodState, list.setDateFrom, list.setDateTo])

  const filteredRows = useMemo(() => {
    if (sidebarSubjectFilter === 'all') return list.filtered
    return list.filtered.filter(d => d.subjectId === sidebarSubjectFilter)
  }, [list.filtered, sidebarSubjectFilter])

  const tableRows = useMemo(
    () =>
      sortDocumentRows(filteredRows, {
        groupBy: 'none',
        sortColumnId: list.sortColumnId,
        sortDirection: list.sortDirection,
        columns: visibleColumns,
      }),
    [filteredRows, list.sortColumnId, list.sortDirection, visibleColumns],
  )

  const totalDue = useMemo(
    () => filteredRows.reduce((sum, d) => sum + (d.totalDocument || 0), 0),
    [filteredRows],
  )

  const hasActiveFilters =
    list.statusFilter !== 'all' ||
    periodState.period !== 'tutti' ||
    sidebarSubjectFilter !== 'all'

  const handleNew = useCallback(() => {
    openNew(lockedType, {
      clientId: filterClientId,
      supplierId: filterSupplierId,
    })
  }, [openNew, lockedType, filterClientId, filterSupplierId])

  const handleModifica = useCallback(() => {
    const target =
      list.selected ??
      (list.selectedKeys.length === 1 ? documents.find(d => d.id === list.selectedKeys[0]) : null)
    if (target) openEdit(target)
  }, [list.selected, list.selectedKeys, documents, openEdit])

  const handleRowActivate = useCallback(
    (doc: DocRecord) => {
      openEdit(doc)
    },
    [openEdit],
  )

  const handleDelete = useCallback(async () => {
    const target =
      list.selected ??
      (list.selectedKeys.length === 1 ? documents.find(d => d.id === list.selectedKeys[0]) : null)
    if (!target) return
    if (!confirm(`Eliminare il documento ${target.fullNumber}?`)) return
    try {
      await deleteDocument(target.id)
      invalidateDashboardCache(studioId!)
      list.clearSelection()
    } catch {
      setActionError('Eliminazione non riuscita.')
    }
  }, [list, documents, studioId])

  const handleDuplicate = useCallback(async () => {
    if (!list.selected || !studioId) return
    try {
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...source } = list.selected
      const ref = await addDocument({
        ...source,
        studioId,
        number: source.number,
        fullNumber: `${source.fullNumber} (copia)`,
        status: 'draft',
        stockCommitted: false,
        internalNotes: source.internalNotes ? `${source.internalNotes}\n(copia)` : '(copia)',
      })
      invalidateDashboardCache(studioId)
      const copy = documents.find(d => d.id === ref.id)
      if (copy) openEdit(copy)
      else {
        const snap = await getDoc(firestoreDoc(db, 'documents', ref.id))
        if (snap.exists()) openEdit({ id: snap.id, ...snap.data() } as DocRecord)
      }
    } catch {
      setActionError('Duplicazione non riuscita.')
    }
  }, [list.selected, studioId, documents, openEdit])

  const handlePrint = useCallback(async () => {
    if (!list.selected) return
    const studioSnap = studioId ? await getDoc(firestoreDoc(db, 'studios', studioId)) : null
    const studio = studioSnap?.exists() ? studioSnap.data() : undefined
    generateDocumentPDF(list.selected, studio as Parameters<typeof generateDocumentPDF>[1])
  }, [list.selected, studioId])

  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId
    exportDocumentsExcel(tableRows, archiveName)
  }, [tableRows, activeArchive?.name, studioId])

  const hasSelection = Boolean(list.selected || list.selectedKeys.length === 1)

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && documents.length === 0 && !showInitialSpinner) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-documenti-lista">
        {loadError}
      </div>
    )
  }

  const filterBanner = subjectFilterId
    ? `Filtro attivo: documenti del ${subjectFilterType === 'supplier' ? 'fornitore' : 'cliente'} selezionato`
    : null

  const listTitle = ACTIVE_DOCUMENT_LIST_LABELS[lockedType]

  return (
    <div className="documenti-list-section gestionale-page" data-tutorial="page-documenti-lista">
      {syncing && documents.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinner ? <div className="gestionale-page-skeleton">Caricamento documenti…</div> : null}
      {loadError || actionError ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{loadError || actionError}</div>
      ) : null}
      {filterBanner ? <div className="gestionale-page__banner">{filterBanner}</div> : null}

      <SectionHeader
        title={listTitle}
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca n."
        actions={
          <DocumentSectionActions
            groupBy={list.groupBy}
            onToggleGroupBy={list.toggleGroupBy}
            showFilterMenu={list.showFilterMenu}
            hasActiveFilters={hasActiveFilters}
            onToggleFilterMenu={list.toggleFilterMenu}
            selectionMode={list.selectionMode}
            onToggleSelectionMode={list.toggleSelectionMode}
            showColumnsMenu={showColumnsMenu}
            onToggleColumnsMenu={() => setShowColumnsMenu(v => !v)}
            hiddenColumnIds={hiddenColumnIds}
            onToggleColumn={toggleColumn}
            optionalColumns={[...OPTIONAL_DOC_COLUMNS]}
          />
        }
      />

      {list.showFilterMenu ? (
        <DocumentFilterBar
          typeFilter={lockedType}
          statusFilter={list.statusFilter}
          dateFrom={list.dateFrom}
          dateTo={list.dateTo}
          onTypeFilterChange={() => {}}
          onStatusFilterChange={list.setStatusFilter}
          onDateFromChange={list.setDateFrom}
          onDateToChange={list.setDateTo}
          onClear={() => {
            list.resetFilters()
            setPeriodState({ period: 'tutti', periodMonth: null, customFrom: '', customTo: '' })
            setSidebarSubjectFilter('all')
          }}
          hideTypeFilter
        />
      ) : null}

      <div className="documenti-list-section__body">
        <div className="documenti-list-section__lista">
          <DataTable
            rows={tableRows}
            columns={visibleColumns}
            rowKey={d => d.id}
            selectable={list.selectionMode}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const d = scopedDocuments.find(x => x.id === keys[0])
                if (d) list.selectItem(d)
              } else if (keys.length === 0) {
                list.clearSelection()
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => list.selectItem(item)}
            onRowDoubleClick={handleRowActivate}
            emptyMessage={`Nessun ${listTitle.toLowerCase()}. Usa «Nuovo» per crearne uno.`}
            virtualize
            virtualizeThreshold={50}
          />
          <PaginatedFilterHint visible={truncated && hasActiveFilters} loading={loadingMore} onLoadMore={loadMore} />
          <LoadMoreBar hasMore={hasMore} loading={loadingMore} truncated={truncated} onLoadMore={loadMore} />

          <div className="documenti-list-section__foot">
            <span className="documenti-list-section__foot-count">{filteredRows.length} voci</span>
            <span className="documenti-list-section__foot-total">
              € {totalDue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <DocumentListSidebar
          documentType={lockedType}
          periodState={periodState}
          onPeriodStateChange={setPeriodState}
          subjectFilter={sidebarSubjectFilter}
          onSubjectFilterChange={setSidebarSubjectFilter}
          documents={typeDocuments}
        />
      </div>

      <DocumentiActionBar
        hasSelection={hasSelection}
        canDelete={hasSelection}
        onNuovo={handleNew}
        onModifica={handleModifica}
        onDuplica={() => void handleDuplicate()}
        onElimina={() => void handleDelete()}
        onStampa={() => void handlePrint()}
        onExcel={handleExcel}
      />
    </div>
  )
}
