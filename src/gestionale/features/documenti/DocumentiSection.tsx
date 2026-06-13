import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { getDocuments, deleteDocument, addDocument } from '../../../lib/firestore'
import type { DocRecord } from '../../../types'
import { createStandardCrudActions } from '../../../components/anagrafica'
import {
  ACTIVE_DOCUMENT_LIST_LABELS,
  createDocumentTableColumns,
  DocumentFilterBar,
  DocumentSectionActions,
  documentTypeLabel,
  formatDocDate,
  sortDocumentRows,
  subjectLabelForType,
  type ActiveDocumentType,
} from './index'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  DetailPanel,
  ActionBar,
  ToolButton,
  type ActionBarAction,
} from '../../../components/ui'
import { exportDocumentsExcel } from './exportDocumentsExcel'
import { generateDocumentPDF } from '../../../lib/generatePDF'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useDocumentListState } from './hooks/useDocumentListState'
import { invalidateDashboardCache } from '../start/dashboardCache'
import DocumentListSidebar from './DocumentListSidebar'
import { getPeriodDateRange, type DocumentPeriodPreset } from './utils'
import '../../theme/gestionale-tokens.css'
import '../../theme/documenti-hub.css'

const OPTIONAL_DOC_COLUMNS = [
  { id: 'total', label: 'Totale' },
  { id: 'status', label: 'Stato' },
] as const

type Props = {
  lockedType: ActiveDocumentType
}

export default function DocumentiSection({ lockedType }: Props) {
  const { loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const filterClientId = searchParams.get('clientId') || undefined
  const filterSupplierId = searchParams.get('supplierId') || undefined
  const subjectFilterId = filterClientId || filterSupplierId
  const subjectFilterType = filterSupplierId ? ('supplier' as const) : filterClientId ? ('client' as const) : undefined

  const [documents, setDocuments] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(new Set())
  const [periodPreset, setPeriodPreset] = useState<DocumentPeriodPreset>('all')
  const [sidebarSubjectFilter, setSidebarSubjectFilter] = useState('all')

  const baseColumns = useMemo(() => createDocumentTableColumns({ hideType: true }), [])

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
    const { from, to } = getPeriodDateRange(periodPreset)
    list.setDateFrom(from)
    list.setDateTo(to)
  }, [periodPreset, list.setDateFrom, list.setDateTo])

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const data = await getDocuments(studioId)
      setDocuments(data)
      setLoadError(null)
    } catch {
      setLoadError('Impossibile aggiornare l’elenco documenti.')
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
    getDocuments(studioId)
      .then(data => {
        if (!cancelled) setDocuments(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare i documenti.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

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

  const hasActiveFilters =
    list.statusFilter !== 'all' ||
    periodPreset !== 'all' ||
    sidebarSubjectFilter !== 'all'

  const handleNew = useCallback(() => {
    const base = `/documenti/nuovo?type=${lockedType}`
    const subjectParam = filterSupplierId
      ? `&subjectId=${filterSupplierId}&subjectType=supplier`
      : filterClientId
        ? `&subjectId=${filterClientId}&subjectType=client`
        : ''
    navigate(base + subjectParam)
  }, [navigate, filterClientId, filterSupplierId, lockedType])

  const handleOpen = useCallback(
    (docId: string) => {
      navigate(`/documenti/${docId}`)
    },
    [navigate],
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
      await refresh()
    } catch {
      setLoadError('Eliminazione non riuscita.')
    }
  }, [list, documents, refresh, studioId])

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
      await refresh()
      invalidateDashboardCache(studioId)
      navigate(`/documenti/${ref.id}`)
    } catch {
      setLoadError('Duplicazione non riuscita.')
    }
  }, [list.selected, studioId, refresh, navigate])

  const handlePrint = useCallback(async () => {
    if (!list.selected) return
    const studioSnap = studioId ? await getDoc(doc(db, 'studios', studioId)) : null
    const studio = studioSnap?.exists() ? studioSnap.data() : undefined
    generateDocumentPDF(list.selected, studio as Parameters<typeof generateDocumentPDF>[1])
  }, [list.selected, studioId])

  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId
    exportDocumentsExcel(tableRows, archiveName)
  }, [tableRows, activeArchive?.name, studioId])

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      ...createStandardCrudActions({
        onNew: handleNew,
        onDuplicate: () => void handleDuplicate(),
        onDelete: () => void handleDelete(),
        onExcel: handleExcel,
        excelDisabled: tableRows.length === 0,
        duplicateDisabled: !list.selected,
        deleteDisabled: !list.selected && list.selectedKeys.length === 0,
      }),
      {
        id: 'print',
        label: 'Stampa',
        icon: '🖨',
        onClick: () => void handlePrint(),
        disabled: !list.selected,
      },
    ],
    [handleNew, handleDuplicate, handleDelete, handlePrint, handleExcel, list.selected, list.selectedKeys.length, tableRows.length],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento documenti…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && documents.length === 0) {
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
    <div className="gestionale-page" data-tutorial="page-documenti-lista">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}
      {filterBanner ? <div className="gestionale-page__banner">{filterBanner}</div> : null}

      <SectionHeader
        title={listTitle}
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca numero, cliente…"
        actions={
          <>
            <button
              type="button"
              className="gestionale-section-header__action-btn"
              onClick={() => navigate('/documenti')}
            >
              ← Tipi documento
            </button>
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
          </>
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
            setPeriodPreset('all')
            setSidebarSubjectFilter('all')
          }}
          hideTypeFilter
        />
      ) : null}

      <MasterDetailLayout
        detailCollapsed={list.detailCollapsed}
        onToggleDetail={() => list.setDetailCollapsed(c => !c)}
        master={
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
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => list.selectItem(item)}
            emptyMessage={`Nessun ${listTitle.toLowerCase()}. Usa «Nuovo» per crearne uno.`}
            virtualize
            virtualizeThreshold={50}
          />
        }
        detail={
          list.selected ? (
            <DetailPanel
              title={`${documentTypeLabel(list.selected.type)} ${list.selected.fullNumber}`}
              tabs={[{ id: 'riepilogo', label: 'Riepilogo', content: null }]}
              activeTabId="riepilogo"
              onTabChange={() => {}}
              fields={[
                { label: 'Numero', value: list.selected.fullNumber },
                { label: 'Data', value: formatDocDate(list.selected.date) },
                { label: subjectLabelForType(list.selected.type), value: list.selected.subjectName },
                { label: 'Totale', value: `€ ${list.selected.totalDocument.toFixed(2)}` },
                { label: 'Stato', value: list.selected.status },
                ...(list.selected.linkedDocumentId
                  ? [{ label: 'Collegato a', value: list.selected.linkedDocumentType || list.selected.linkedDocumentId }]
                  : []),
              ]}
              footer={
                <>
                  <ToolButton label="Apri" icon="📄" onClick={() => handleOpen(list.selected!.id)} />
                  <ToolButton label="Stampa PDF" icon="🖨" onClick={() => void handlePrint()} />
                </>
              }
            />
          ) : (
            <DocumentListSidebar
              documentType={lockedType}
              periodPreset={periodPreset}
              onPeriodChange={setPeriodPreset}
              subjectFilter={sidebarSubjectFilter}
              onSubjectFilterChange={setSidebarSubjectFilter}
              documents={typeDocuments}
            />
          )
        }
      />

      <ActionBar count={filteredRows.length} countLabel="documenti" actions={actionBarActions} />
    </div>
  )
}
