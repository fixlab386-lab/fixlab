import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import {
  getStockMovements,
  getProducts,
  addStockMovement,
  deleteStockMovement,
} from '../../../lib/firestore'
import {
  callCommitStockMovement,
  callRevertStockMovement,
  isStockFunctionUnavailable,
} from '../../../lib/commitStockMovement'
import type { Product, StockMovement } from '../../../types'
import { MOVEMENT_TYPE_LABELS } from './constants'
import { createMovementTableColumns } from './movementTableColumns'
import { exportMovementsCsv } from './exportMovements'
import { formatMovementDate, linkedDocumentLabel, sortMovementRows } from './utils'
import { movementQuantityDisplay } from './stockPreview'
import MovementFilterBar from './MovementFilterBar'
import MovementSectionActions from './MovementSectionActions'
import StockMovementFormPanel, {
  createEmptyMovementForm,
  type MovementFormState,
} from './StockMovementFormPanel'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  DetailPanel,
  ActionBar,
  ToolButton,
  type ActionBarAction,
} from '../../../components/ui'
import { useStockMovementListState } from './hooks/useStockMovementListState'

const columns = createMovementTableColumns()

type Props = {
  initialProductId?: string
}

export default function MovimentiSection({ initialProductId }: Props) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const [searchParams] = useSearchParams()
  const productIdFromUrl = initialProductId || searchParams.get('productId') || undefined

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'new' | null>(null)
  const [form, setForm] = useState<MovementFormState>(() => createEmptyMovementForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const scopedMovements = useMemo(() => {
    if (!productIdFromUrl) return movements
    return movements.filter(m => m.productId === productIdFromUrl)
  }, [movements, productIdFromUrl])

  const list = useStockMovementListState(scopedMovements)

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const [m, p] = await Promise.all([getStockMovements(studioId), getProducts(studioId)])
      setMovements(m)
      setProducts(p)
      setLoadError(null)
    } catch {
      setLoadError('Impossibile aggiornare i movimenti.')
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
    Promise.all([getStockMovements(studioId), getProducts(studioId)])
      .then(([m, p]) => {
        if (!cancelled) {
          setMovements(m)
          setProducts(p)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare i movimenti.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  const tableRows = useMemo(
    () =>
      sortMovementRows(list.filtered, {
        sortColumnId: list.sortColumnId,
        sortDirection: list.sortDirection,
        columns,
      }),
    [list.filtered, list.sortColumnId, list.sortDirection],
  )

  const hasActiveFilters =
    list.period !== 'all' || list.typeFilter !== 'all' || list.productFilter !== 'all'

  const saveWithFallback = useCallback(async () => {
    const product = products.find(p => p.id === form.productId)
    if (!product) return

    const base = {
      studioId,
      date: form.date,
      productId: product.id,
      productCode: product.code || '',
      productName: product.name,
      type: form.type,
      cause: form.cause || undefined,
      notes: form.notes || undefined,
      operatorId: user?.uid,
      operatorName: userProfile?.name,
      stockUpdated: false,
    }

    if (form.type === 'load') {
      await addStockMovement({ ...base, loaded: form.quantity })
    } else if (form.type === 'unload') {
      await addStockMovement({ ...base, unloaded: form.quantity })
    } else if (form.type === 'committed') {
      await addStockMovement({ ...base, committed: form.quantity })
    } else if (form.type === 'incoming') {
      await addStockMovement({ ...base, incoming: form.quantity })
    } else if (form.type === 'adjust') {
      await addStockMovement({
        ...base,
        adjustTo: form.adjustMode === 'absolute' ? form.quantity : undefined,
        adjustDelta: form.adjustMode === 'delta' ? form.quantity : undefined,
      })
    }

    setStockWarning('Giacenza non aggiornata (function non attiva).')
  }, [form, products, studioId, user?.uid, userProfile?.name])

  const handleSave = useCallback(async () => {
    const product = products.find(p => p.id === form.productId)
    if (!product || !studioId) return

    setSaving(true)
    setSaveError(null)
    setStockWarning(null)

    try {
      await callCommitStockMovement({
        movement: {
          studioId,
          date: form.date,
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          type: form.type,
          quantity: form.quantity,
          adjustTo: form.type === 'adjust' && form.adjustMode === 'absolute' ? form.quantity : undefined,
          adjustMode: form.adjustMode,
          cause: form.cause || undefined,
          notes: form.notes || undefined,
          operatorId: user?.uid,
          operatorName: userProfile?.name,
        },
      })
      setFormMode(null)
      list.clearSelection()
      await refresh()
    } catch (err) {
      if (isStockFunctionUnavailable(err)) {
        try {
          await saveWithFallback()
          setFormMode(null)
          list.clearSelection()
          await refresh()
        } catch (fallbackErr) {
          setSaveError(fallbackErr instanceof Error ? fallbackErr.message : 'Salvataggio non riuscito.')
        }
      } else {
        setSaveError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
      }
    } finally {
      setSaving(false)
    }
  }, [form, products, studioId, user?.uid, userProfile?.name, saveWithFallback, refresh, list])

  const handleNew = useCallback(() => {
    const empty = createEmptyMovementForm()
    if (productIdFromUrl) empty.productId = productIdFromUrl
    setForm(empty)
    setSaveError(null)
    setFormMode('new')
    list.clearSelection()
    list.setDetailCollapsed(false)
  }, [list, productIdFromUrl])

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
      setFormMode(null)
      await refresh()
    } catch (err) {
      if (isStockFunctionUnavailable(err)) {
        await deleteStockMovement(target.id)
        setStockWarning('Giacenza non ripristinata (function non attiva).')
        list.clearSelection()
        setFormMode(null)
        await refresh()
      } else {
        setLoadError(err instanceof Error ? err.message : 'Eliminazione non riuscita.')
      }
    }
  }, [list, movements, studioId, refresh])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExcel = useCallback(() => {
    exportMovementsCsv(list.filtered.length ? list.filtered : scopedMovements)
  }, [list.filtered, scopedMovements])

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      { id: 'new', label: 'Nuovo', icon: '➕', onClick: handleNew },
      {
        id: 'del',
        label: 'Elimina',
        icon: '🗑',
        variant: 'danger',
        onClick: () => void handleDelete(),
        disabled: !list.selected && list.selectedKeys.length === 0,
      },
      { id: 'print', label: 'Stampa', icon: '🖨', onClick: handlePrint },
      { id: 'excel', label: 'Excel', icon: '📊', onClick: handleExcel },
    ],
    [handleNew, handleDelete, handlePrint, handleExcel, list.selected, list.selectedKeys.length],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento movimenti…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && movements.length === 0) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-movimenti">
        {loadError}
      </div>
    )
  }

  const filterBanner = productIdFromUrl
    ? `Filtro attivo: movimenti del prodotto selezionato`
    : null

  return (
    <div className="gestionale-page" data-tutorial="page-movimenti">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}
      {stockWarning ? (
        <div className="gestionale-page__banner gestionale-page__banner--warning">{stockWarning}</div>
      ) : null}
      {filterBanner ? <div className="gestionale-page__banner">{filterBanner}</div> : null}

      <SectionHeader
        title="Movimenti di magazzino"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca prodotto, causale, operatore…"
        actions={
          <MovementSectionActions
            showFilterMenu={list.showFilterMenu}
            hasActiveFilters={hasActiveFilters}
            onToggleFilterMenu={list.toggleFilterMenu}
            selectionMode={list.selectionMode}
            onToggleSelectionMode={list.toggleSelectionMode}
          />
        }
      />

      {list.showFilterMenu ? (
        <MovementFilterBar
          period={list.period}
          typeFilter={list.typeFilter}
          productFilter={list.productFilter}
          products={products}
          onPeriodChange={list.setPeriod}
          onTypeFilterChange={list.setTypeFilter}
          onProductFilterChange={list.setProductFilter}
          onClear={list.resetFilters}
        />
      ) : null}

      <MasterDetailLayout
        detailCollapsed={list.detailCollapsed}
        onToggleDetail={() => list.setDetailCollapsed(c => !c)}
        master={
          <DataTable
            rows={tableRows}
            columns={columns}
            rowKey={m => m.id}
            selectable={list.selectionMode}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const m = scopedMovements.find(x => x.id === keys[0])
                if (m) {
                  list.selectItem(m)
                  setFormMode(null)
                }
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => {
              list.selectItem(item)
              setFormMode(null)
            }}
            emptyMessage="Nessun movimento. Usa «Nuovo» per registrarne uno."
            virtualize
            virtualizeThreshold={80}
          />
        }
        detail={
          formMode === 'new' ? (
            <StockMovementFormPanel
              products={products}
              form={form}
              onChange={setForm}
              saving={saving}
              saveError={saveError}
              onSave={() => void handleSave()}
              onCancel={() => {
                setFormMode(null)
                setSaveError(null)
              }}
            />
          ) : list.selected ? (
            <DetailPanel
              title={`${MOVEMENT_TYPE_LABELS[list.selected.type]} — ${list.selected.productName}`}
              tabs={[{ id: 'riepilogo', label: 'Riepilogo', content: null }]}
              activeTabId="riepilogo"
              onTabChange={() => {}}
              fields={[
                { label: 'Data', value: formatMovementDate(list.selected.date) },
                { label: 'Prodotto', value: `${list.selected.productCode} — ${list.selected.productName}` },
                { label: 'Tipo', value: MOVEMENT_TYPE_LABELS[list.selected.type] },
                { label: 'Quantità', value: movementQuantityDisplay(list.selected) },
                { label: 'Causale', value: list.selected.cause || '—' },
                { label: 'Documento', value: linkedDocumentLabel(list.selected) },
                { label: 'Operatore', value: list.selected.operatorName || '—' },
                ...(list.selected.notes ? [{ label: 'Note', value: list.selected.notes }] : []),
                ...(list.selected.stockUpdated === false
                  ? [{ label: 'Giacenza', value: 'Non aggiornata (solo registro)' }]
                  : []),
              ]}
              footer={
                list.selected.linkedDocumentId ? null : (
                  <ToolButton label="Elimina" icon="🗑" onClick={() => void handleDelete()} />
                )
              }
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun movimento selezionato</strong>
                Seleziona una riga per i dettagli oppure crea un nuovo movimento manuale.
              </p>
              <ToolButton label="Nuovo movimento" icon="➕" onClick={handleNew} />
            </div>
          )
        }
      />

      <ActionBar count={list.filtered.length} countLabel="movimenti" actions={actionBarActions} />
    </div>
  )
}
