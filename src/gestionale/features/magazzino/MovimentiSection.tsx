import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useStudioLiveQuery } from '../../../hooks/useStudioLiveQuery'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import {
  listenCategories,
  listenStockMovements,
} from '../../../lib/firestore'
import { fetchStockMovementsPage } from '../../../lib/firestorePagination'
import { loadRecentClients, loadRecentProducts, loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import {
  callRevertStockMovement,
  isStockFunctionUnavailable,
} from '../../../lib/commitStockMovement'
import type { Product, StockMovement } from '../../../types'
import { createMovementTableColumns } from './movementTableColumns'
import { exportMovementsCsv } from './exportMovements'
import { formatMovementDate, movementTotals, sortMovementRows } from './utils'
import MovimentiSidebar from './MovimentiSidebar'
import MovimentiActionBar from './MovimentiActionBar'
import OperazioneMagazzinoModal, {
  createEmptyOperazioneMagazzino,
  createOperazioneMagazzinoWithProduct,
  type OperazioneMagazzinoState,
} from './OperazioneMagazzinoModal'
import MovimentoDettaglioModal from './MovimentoDettaglioModal'
import { commitOperazioneMagazzinoLine } from './commitOperazioneMagazzino'
import SchedaProdottoModal, {
  buildSchedaProdottoPayload,
  type SchedaProdottoPayload,
} from '../shared/SchedaProdottoModal'
import type { OperazioneMagazzinoMode } from './constants'
import { SectionHeader, DataTable } from '../../../components/ui'
import { useStockMovementListState } from './hooks/useStockMovementListState'
import '../../theme/movimenti-section.css'

type Props = {
  initialProductId?: string
}

export default function MovimentiSection({ initialProductId }: Props) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const productIdFromUrl = initialProductId || searchParams.get('productId') || undefined
  const opParam = searchParams.get('op')

  const liveEnabled = !authLoading && Boolean(studioId)

  const {
    data: movements,
    syncing: movementsSyncing,
    loadingMore,
    hasMore,
    truncated,
    error: movementsError,
    loadMore,
    showInitialSpinner: movementsInitial,
  } = useStudioPagedLiveQuery(studioId, listenStockMovements, fetchStockMovementsPage, liveEnabled)

  const { data: categories } = useStudioLiveQuery(studioId, listenCategories, liveEnabled, 500)

  const loading = movementsInitial
  const loadError = movementsError
  const [actionError, setActionError] = useState<string | null>(null)

  const [stockWarning, setStockWarning] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const [operazioneMode, setOperazioneMode] = useState<OperazioneMagazzinoMode | null>(null)
  const [operazioneState, setOperazioneState] = useState<OperazioneMagazzinoState>(() =>
    createEmptyOperazioneMagazzino('load'),
  )
  const [detailMovement, setDetailMovement] = useState<StockMovement | null>(null)
  const [schedaPayload, setSchedaPayload] = useState<SchedaProdottoPayload | null>(null)
  const [schedaProduct, setSchedaProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const scopedMovements = useMemo(() => {
    if (!productIdFromUrl) return movements
    return movements.filter(m => m.productId === productIdFromUrl)
  }, [movements, productIdFromUrl])

  const list = useStockMovementListState(scopedMovements)
  const { setProductFilter } = list

  const [catalogSubjects, setCatalogSubjects] = useState<{ id: string; name: string }[]>([])
  const [catalogProducts, setCatalogProducts] = useState<{ id: string; code: string; name: string }[]>([])

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    void Promise.all([
      loadRecentClients(studioId, 200),
      loadRecentSuppliers(studioId, 200),
      loadRecentProducts(studioId, 300),
    ])
      .then(([clients, suppliers, products]) => {
        if (cancelled) return
        setCatalogSubjects([
          ...clients.map(c => ({ id: c.id, name: c.name })),
          ...suppliers.map(s => ({ id: s.id, name: s.name })),
        ])
        setCatalogProducts(products.map(p => ({ id: p.id, code: p.code || '', name: p.name })))
      })
      .catch(() => {
        /* catalogo non disponibile: la sidebar userà i soggetti dei movimenti */
      })
    return () => {
      cancelled = true
    }
  }, [studioId])

  useEffect(() => {
    if (productIdFromUrl) setProductFilter(productIdFromUrl)
  }, [productIdFromUrl, setProductFilter])

  const openDocument = useCallback(
    (documentId: string) => {
      navigate(`/documenti/${documentId}`)
    },
    [navigate],
  )

  const resolveProduct = useCallback(async (productId: string): Promise<Product | null> => {
    const snap = await getDoc(doc(db, 'products', productId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as Product
  }, [])

  const closeSchedaModal = useCallback(() => {
    setSchedaPayload(null)
    setSchedaProduct(null)
  }, [])

  const openSchedaFromMovement = useCallback(
    async (m: StockMovement) => {
      if (!m.productId) {
        setDetailMovement(m)
        list.selectItem(m)
        return
      }
      try {
        const product = await resolveProduct(m.productId)
        if (!product) {
          setActionError(`Prodotto «${m.productName || m.productCode || m.productId}» non trovato.`)
          return
        }
        setActionError(null)
        setSchedaProduct(product)
        setSchedaPayload(buildSchedaProdottoPayload(product, movements))
        setDetailMovement(null)
        list.selectItem(m)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Apertura scheda prodotto non riuscita.')
      }
    },
    [list, movements, resolveProduct],
  )

  const openOperazioneForSchedaProduct = useCallback(
    async (mode: OperazioneMagazzinoMode) => {
      if (!schedaProduct) return
      const product = await resolveProduct(schedaProduct.id)
      if (!product) {
        setActionError('Prodotto non trovato.')
        return
      }
      closeSchedaModal()
      setOperazioneMode(mode)
      setOperazioneState(createOperazioneMagazzinoWithProduct(mode, product))
      setSaveError(null)
      list.clearSelection()
    },
    [closeSchedaModal, list, resolveProduct, schedaProduct],
  )

  const columns = useMemo(
    () =>
      createMovementTableColumns({
        onProductClick: productId => {
          const m = scopedMovements.find(x => x.productId === productId)
          if (m) void openSchedaFromMovement(m)
          else {
            void (async () => {
              const product = await resolveProduct(productId)
              if (!product) {
                setActionError('Prodotto non trovato.')
                return
              }
              setSchedaProduct(product)
              setSchedaPayload(buildSchedaProdottoPayload(product, movements))
              setDetailMovement(null)
            })()
          }
        },
        onCauseClick: m => {
          if (m.linkedDocumentId) openDocument(m.linkedDocumentId)
          else setDetailMovement(m)
        },
      }),
    [movements, openDocument, openSchedaFromMovement, resolveProduct, scopedMovements],
  )

  const tableRows = useMemo(
    () =>
      sortMovementRows(list.filtered, {
        sortColumnId: list.sortColumnId,
        sortDirection: list.sortDirection,
        columns,
      }),
    [list.filtered, list.sortColumnId, list.sortDirection, columns],
  )

  const totals = useMemo(() => movementTotals(list.filtered), [list.filtered])

  const openOperazione = useCallback((mode: OperazioneMagazzinoMode) => {
    setOperazioneMode(mode)
    setOperazioneState(createEmptyOperazioneMagazzino(mode))
    setSaveError(null)
    list.clearSelection()
  }, [list])

  const handledOpRef = useRef<string | null>(null)
  useEffect(() => {
    if (!opParam || handledOpRef.current === opParam) return
    handledOpRef.current = opParam
    const opMode: OperazioneMagazzinoMode | null =
      opParam === 'load' || opParam === 'unload'
        ? opParam
        : opParam === 'rettifica' || opParam === 'adjust'
          ? 'adjust'
          : null
    if (opMode) openOperazione(opMode)
    const next = new URLSearchParams(searchParams)
    next.delete('op')
    setSearchParams(next, { replace: true })
  }, [opParam, openOperazione, searchParams, setSearchParams])

  const commitLine = useCallback(
    async (mode: OperazioneMagazzinoMode, state: OperazioneMagazzinoState, line: OperazioneMagazzinoState['lines'][0]) => {
      if (!studioId) return
      await commitOperazioneMagazzinoLine(mode, state, line, {
        studioId,
        operatorId: user?.uid,
        operatorName: userProfile?.name,
      })
    },
    [studioId, user?.uid, userProfile?.name],
  )

  const handleSaveOperazione = useCallback(async () => {
    if (!studioId || !operazioneMode || operazioneState.lines.length === 0) return
    setSaving(true)
    setSaveError(null)
    setStockWarning(null)
    try {
      for (const line of operazioneState.lines) {
        await commitLine(operazioneMode, operazioneState, line)
      }
      setOperazioneMode(null)
      setActionMessage(
        operazioneMode === 'load'
          ? 'Carico magazzino registrato.'
          : operazioneMode === 'unload'
            ? 'Scarico magazzino registrato.'
            : 'Rettifica giacenza registrata.',
      )
      window.setTimeout(() => setActionMessage(null), 2500)
    } catch (err) {
      if (isStockFunctionUnavailable(err)) {
        setStockWarning('Alcune giacenze potrebbero non essere aggiornate (function non attiva).')
        setOperazioneMode(null)
      } else {
        setSaveError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
      }
    } finally {
      setSaving(false)
    }
  }, [commitLine, operazioneMode, operazioneState, studioId])

  const handleDelete = useCallback(async () => {
    const target =
      list.selected ??
      (list.selectedKeys.length === 1 ? movements.find(m => m.id === list.selectedKeys[0]) : null)
    if (!target || !studioId) return

    if (target.linkedDocumentId) {
      alert('Movimento collegato a un documento: elimina o storna dal documento.')
      return
    }

    if (!confirm(`Eliminare il movimento del ${formatMovementDate(target.date)} su ${target.productName}?`)) {
      return
    }

    try {
      await callRevertStockMovement(target.id, studioId)
      list.clearSelection()
      setDetailMovement(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Eliminazione non riuscita.')
    }
  }, [list, movements, studioId])

  const handlePrint = useCallback(() => window.print(), [])
  const handleExcel = useCallback(() => {
    exportMovementsCsv(list.filtered.length ? list.filtered : scopedMovements)
  }, [list.filtered, scopedMovements])

  const openDetail = useCallback((movement: StockMovement) => {
    setDetailMovement(movement)
    list.selectItem(movement)
  }, [list])

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && movements.length === 0 && !loading) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-movimenti">
        {loadError}
      </div>
    )
  }

  return (
    <div className="movimenti-section gestionale-page" data-tutorial="page-movimenti">
      {movementsSyncing && movements.length > 0 ? (
        <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div>
      ) : null}
      {loading ? <div className="gestionale-page-skeleton">Caricamento movimenti…</div> : null}
      {loadError || actionError ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{loadError || actionError}</div>
      ) : null}
      {stockWarning ? (
        <div className="gestionale-page__banner gestionale-page__banner--warning">{stockWarning}</div>
      ) : null}
      {actionMessage ? <div className="gestionale-page__banner gestionale-page__banner--ok">{actionMessage}</div> : null}
      {productIdFromUrl ? (
        <div className="gestionale-page__banner">Filtro attivo: movimenti del prodotto selezionato</div>
      ) : null}

      <SectionHeader
        title="Movimenti magazzino"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca codice…"
      />

      <div className="movimenti-section__body">
        <div className="movimenti-section__lista">
          <DataTable
            rows={tableRows}
            columns={columns}
            rowKey={m => m.id}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const m = scopedMovements.find(x => x.id === keys[0])
                if (m) list.selectItem(m)
              } else if (keys.length === 0) {
                list.clearSelection()
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={m => void openSchedaFromMovement(m)}
            emptyMessage="Nessun movimento. Usa «Carica» o «Scarica» per registrarne uno."
            virtualize={false}
          />

          <div className="movimenti-section__foot">
            <span className="movimenti-section__foot-count">{list.filtered.length} voci</span>
            <span />
            <span />
            <span />
            <span className="movimenti-section__foot-num">{totals.loaded || ''}</span>
            <span className="movimenti-section__foot-num">{totals.unloaded || ''}</span>
            <span className="movimenti-section__foot-num">{totals.committed || ''}</span>
            <span />
            <span className="movimenti-section__foot-num">{totals.incoming || ''}</span>
          </div>
          <LoadMoreBar hasMore={hasMore} loading={loadingMore} truncated={truncated} onLoadMore={loadMore} />
        </div>

        <MovimentiSidebar
          period={list.period}
          statusFilter={list.statusFilter}
          productFilter={list.productFilter}
          subjectFilter={list.subjectFilter}
          movements={scopedMovements}
          catalogSubjects={catalogSubjects}
          catalogProducts={catalogProducts}
          onPeriodChange={list.setPeriod}
          onStatusFilterChange={list.setStatusFilter}
          onProductFilterChange={list.setProductFilter}
          onSubjectFilterChange={list.setSubjectFilter}
        />
      </div>

      <MovimentiActionBar
        hasSelection={!!list.selected}
        canDelete={!!list.selected || list.selectedKeys.length > 0}
        onCarica={() => openOperazione('load')}
        onScarica={() => openOperazione('unload')}
        onRettifica={() => openOperazione('adjust')}
        onModifica={() => list.selected && openDetail(list.selected)}
        onElimina={() => void handleDelete()}
        onStampa={handlePrint}
        onExcel={handleExcel}
      />

      {operazioneMode ? (
        <OperazioneMagazzinoModal
          open
          mode={operazioneMode}
          state={operazioneState}
          studioId={studioId!}
          saving={saving}
          saveError={saveError}
          onChange={setOperazioneState}
          onSave={() => void handleSaveOperazione()}
          onClose={() => {
            if (!saving) {
              setOperazioneMode(null)
              setSaveError(null)
            }
          }}
        />
      ) : null}

      {schedaPayload && schedaProduct && studioId ? (
        <SchedaProdottoModal
          studioId={studioId}
          categories={categories}
          payload={schedaPayload}
          onClose={closeSchedaModal}
          onCarica={() => void openOperazioneForSchedaProduct('load')}
          onScarica={() => void openOperazioneForSchedaProduct('unload')}
          onRettifica={() => void openOperazioneForSchedaProduct('adjust')}
        />
      ) : null}

      {detailMovement ? (
        <MovimentoDettaglioModal
          movement={detailMovement}
          onClose={() => setDetailMovement(null)}
          onOpenDocument={openDocument}
        />
      ) : null}
    </div>
  )
}
