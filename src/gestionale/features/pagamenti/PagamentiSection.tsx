import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { useStudioLiveQuery } from '../../../hooks/useStudioLiveQuery'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import { usePaymentListState } from './hooks/usePaymentListState'
import {
  listenPayments,
  listenPaymentResources,
  addPayment,
  updatePayment,
  deletePayment,
  ensureDefaultPaymentResources,
} from '../../../lib/firestore'
import { fetchPaymentsPage } from '../../../lib/firestorePagination'
import { loadRecentClients, loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import {
  computePaymentSummary,
  getDefaultResource,
  resourceTypeToLegacy,
} from '../../lib/paymentResources'
import type { Client, Payment, PaymentResource, Supplier } from '../../../types'
import { createPaymentTableColumns } from './paymentTableColumns'
import {
  createEmptyPaymentForm,
  paymentToFormState,
  type PaymentFormState,
} from './PagamentoModal'
import PagamentoModal from './PagamentoModal'
import PagamentoDettaglioModal, { createDettaglioStateFromPayment } from './PagamentoDettaglioModal'
import { buildPaymentUpdateFromDettaglio } from './paymentDettaglio'
import type { PagamentoDettaglioState } from './paymentDettaglio'
import { exportPaymentsExcel } from './exportPaymentsExcel'
import { sortPaymentRows } from './utils'
import PagamentiSidebar from './PagamentiSidebar'
import PagamentiActionBar from './PagamentiActionBar'
import SchedaSoggettoModal, {
  buildSchedaPayloadFromPayment,
  type SchedaSoggettoPayload,
} from '../shared/SchedaSoggettoModal'
import type { SoggettoRicercaRecord } from '../../lib/ricercaSoggetto'
import { invalidateDashboardCache } from '../start/dashboardCache'
import { SectionHeader, DataTable } from '../../../components/ui'
import '../../theme/pagamenti-section.css'

type ModalMode = 'new' | null

function buildPaymentPayload(
  form: PaymentFormState,
  studioId: string,
  resource: PaymentResource,
): Omit<Payment, 'id' | 'createdAt'> {
  return {
    studioId,
    date: form.dueDate,
    resource: resourceTypeToLegacy(resource.type),
    resourceId: resource.id,
    resourceName: resource.name,
    subjectType: form.subjectType,
    subjectId: form.subjectId || undefined,
    subjectName: form.subjectName || undefined,
    description: form.description.trim(),
    paymentMethod: form.paymentMethod || resource.name,
    amountIn: form.amountIn > 0 ? form.amountIn : undefined,
    amountOut: form.amountOut > 0 ? form.amountOut : undefined,
    settled: form.settled,
    settledDate: form.settled ? form.settledDate || form.dueDate : undefined,
    linkedDocumentId: form.linkedDocumentId || undefined,
    linkedDocumentNumber: form.linkedDocumentNumber || undefined,
    notes: form.notes || undefined,
  }
}

export default function PagamentiSection() {
  const { loading: authLoading } = useAuth()
  const { studioId, activeArchive, loading: studioLoading } = useActiveStudio()
  const { openPagamentiRisorse } = useAppWindows()
  const [searchParams] = useSearchParams()

  const liveEnabled = !authLoading && Boolean(studioId)

  const {
    data: payments,
    syncing,
    loadingMore,
    hasMore,
    error: loadError,
    loadMore,
    showInitialSpinner,
  } = useStudioPagedLiveQuery(studioId, listenPayments, fetchPaymentsPage, liveEnabled)
  const { data: resources, loading: resourcesLoading } = useStudioLiveQuery(
    studioId,
    listenPaymentResources,
    liveEnabled,
    50,
  )
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    if (!studioId) {
      setClients([])
      setSuppliers([])
      return
    }
    let cancelled = false
    void Promise.all([loadRecentClients(studioId), loadRecentSuppliers(studioId)]).then(([c, s]) => {
      if (!cancelled) {
        setClients(c)
        setSuppliers(s)
      }
    })
    return () => {
      cancelled = true
    }
  }, [studioId])

  const showInitialSpinnerCombined = showInitialSpinner || resourcesLoading
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!studioId) return
    void ensureDefaultPaymentResources(studioId)
  }, [studioId])

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null)
  const [detailState, setDetailState] = useState<PagamentoDettaglioState | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailSaveError, setDetailSaveError] = useState<string | null>(null)
  const [form, setForm] = useState<PaymentFormState>(() => createEmptyPaymentForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [schedaPayment, setSchedaPayment] = useState<Payment | null>(null)
  const [schedaPayload, setSchedaPayload] = useState<SchedaSoggettoPayload | null>(null)

  const filterClientId = searchParams.get('clientId') || undefined
  const filterSupplierId = searchParams.get('supplierId') || undefined
  const filterSubjectId = filterClientId || filterSupplierId || searchParams.get('subjectId') || undefined
  const filterSubjectType = filterSupplierId
    ? ('supplier' as const)
    : filterClientId || searchParams.get('subjectType') === 'client'
      ? ('client' as const)
      : searchParams.get('subjectType') === 'supplier'
        ? ('supplier' as const)
        : undefined

  const scopedPayments = useMemo(() => {
    if (!filterSubjectId) return payments
    return payments.filter(
      p => p.subjectId === filterSubjectId && (!filterSubjectType || p.subjectType === filterSubjectType),
    )
  }, [payments, filterSubjectId, filterSubjectType])

  const list = usePaymentListState(scopedPayments, resources)

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'to_settle') list.setStatusFilter('to_settle')
    else if (status === 'settled') list.setStatusFilter('settled')
    else if (searchParams.get('flow') || searchParams.get('method') || searchParams.get('settleBy')) {
      // keep status from URL only when explicitly set
    } else if (!filterSubjectId) {
      list.setStatusFilter('all')
    }

    const flow = searchParams.get('flow')
    if (flow === 'in' || flow === 'out') list.setFlowFilter(flow)
    else if (!searchParams.get('method') && !searchParams.get('settleBy')) list.setFlowFilter('all')

    const method = searchParams.get('method')
    if (method === 'riba' || method === 'bonifico') list.setMethodFilter(method)
    else list.setMethodFilter('all')

    const settleBy = searchParams.get('settleBy')
    list.setSettleByDate(settleBy && /^\d{4}-\d{2}-\d{2}$/.test(settleBy) ? settleBy : undefined)

    if (filterSubjectId) list.setSubjectFilter(filterSubjectId)
  }, [
    searchParams,
    filterSubjectId,
    list.setStatusFilter,
    list.setFlowFilter,
    list.setMethodFilter,
    list.setSettleByDate,
    list.setSubjectFilter,
  ])

  const openNewModal = useCallback(() => {
    const def = getDefaultResource(resources)
    setForm(createEmptyPaymentForm(def?.id || ''))
    setSaveError(null)
    setModalMode('new')
    setDetailPayment(null)
    setDetailState(null)
    list.clearSelection()
  }, [resources, list])

  const openDetailModal = useCallback(
    (p: Payment) => {
      setDetailPayment(p)
      setDetailState(createDettaglioStateFromPayment(p, resources))
      setDetailSaveError(null)
      setModalMode(null)
      setSchedaPayment(null)
      setSchedaPayload(null)
      list.selectItem(p)
    },
    [resources, list],
  )

  const studioSoggettiRecords = useMemo<SoggettoRicercaRecord[]>(() => {
    const fromClients = clients.map(c => ({
      denominazione: c.name,
      indirizzo: c.address,
      cap: c.cap,
      citta: c.city,
      prov: c.province,
      cf: c.fiscalCode,
      piva: c.vatNumber,
    }))
    const fromSuppliers = suppliers.map(s => ({
      denominazione: s.name,
      indirizzo: s.address,
      cap: s.cap,
      citta: s.city,
      prov: s.province,
      cf: s.fiscalCode,
      piva: s.vatNumber,
    }))
    return [...fromClients, ...fromSuppliers]
  }, [clients, suppliers])

  const openSchedaFromPayment = useCallback(
    (p: Payment) => {
      const payload = buildSchedaPayloadFromPayment(p, clients, suppliers)
      if (!payload) {
        setActionError(
          p.subjectName
            ? `Soggetto «${p.subjectName}» non trovato nell'archivio. Collega il pagamento a un cliente o fornitore.`
            : 'Nessun soggetto collegato a questo pagamento.',
        )
        if (!p.subjectName && !p.subjectType) {
          openDetailModal(p)
        }
        return
      }
      setActionError(null)
      setSchedaPayment(p)
      setSchedaPayload(payload)
      setDetailPayment(null)
      setDetailState(null)
      setModalMode(null)
      list.selectItem(p)
    },
    [clients, suppliers, list, openDetailModal],
  )

  const closeSchedaModal = useCallback(() => {
    setSchedaPayment(null)
    setSchedaPayload(null)
  }, [])

  const closeDetailModal = useCallback(() => {
    if (detailSaving) return
    setDetailPayment(null)
    setDetailState(null)
    setDetailSaveError(null)
  }, [detailSaving])

  const handleToggleSettled = useCallback(
    async (p: Payment) => {
      const next = !p.settled
      const settledDate = next ? new Date().toISOString().split('T')[0] : ''
      try {
        await updatePayment(p.id, { settled: next, settledDate })
        invalidateDashboardCache(studioId!)
        if (list.selected?.id === p.id) {
          list.setSelected({ ...p, settled: next, settledDate })
        }
      } catch {
        setActionError('Aggiornamento stato non riuscito.')
      }
    },
    [list, studioId],
  )

  const columns = useMemo(
    () =>
      createPaymentTableColumns(
        resources,
        p => void handleToggleSettled(p),
        p => openSchedaFromPayment(p),
        p => openSchedaFromPayment(p),
      ),
    [resources, handleToggleSettled, openSchedaFromPayment],
  )

  const tableRows = useMemo(
    () =>
      sortPaymentRows(list.filtered, {
        sortColumnId: list.sortColumnId,
        sortDirection: list.sortDirection,
        columns,
      }),
    [list.filtered, list.sortColumnId, list.sortDirection, columns],
  )

  const summary = useMemo(
    () => computePaymentSummary(list.filtered, resources),
    [list.filtered, resources],
  )

  const handleSave = useCallback(async () => {
    if (!studioId || !form.description.trim() || !form.resourceId) return
    const resource = resources.find(r => r.id === form.resourceId)
    if (!resource) return
    if (form.amountIn <= 0 && form.amountOut <= 0) return

    setSaving(true)
    setSaveError(null)
    try {
      const payload = buildPaymentPayload(form, studioId, resource)
      await addPayment(payload)
      invalidateDashboardCache(studioId)
      setModalMode(null)
      list.clearSelection()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [studioId, form, resources, list])

  const handleSaveDettaglio = useCallback(async () => {
    if (!studioId || !detailPayment || !detailState) return
    const resource = resources.find(r => r.id === detailState.resourceId)
    if (!resource) return

    setDetailSaving(true)
    setDetailSaveError(null)
    try {
      const payload = buildPaymentUpdateFromDettaglio(detailState, studioId, resource)
      await updatePayment(detailPayment.id, payload)
      invalidateDashboardCache(studioId)
      const updated = { ...detailPayment, ...payload, id: detailPayment.id }
      setDetailPayment(updated)
      setDetailState(createDettaglioStateFromPayment(updated, resources))
    } catch (e) {
      setDetailSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setDetailSaving(false)
    }
  }, [studioId, detailPayment, detailState, resources])

  const closeModal = useCallback(() => {
    if (saving) return
    setModalMode(null)
    setSaveError(null)
  }, [saving])

  const handleDelete = useCallback(async () => {
    const target =
      list.selected ??
      (list.selectedKeys.length === 1 ? payments.find(p => p.id === list.selectedKeys[0]) : null)
    if (!target) return
    if (!confirm(`Eliminare il movimento «${target.description}»?`)) return
    try {
      await deletePayment(target.id)
      invalidateDashboardCache(studioId!)
      list.clearSelection()
      setModalMode(null)
      setDetailPayment(null)
      setDetailState(null)
    } catch {
      setActionError('Eliminazione non riuscita.')
    }
  }, [list, payments, studioId])

  const handleDuplicate = useCallback(() => {
    const target = list.selected
    if (!target) return
    const dup = paymentToFormState(target, resources)
    dup.description = `${dup.description} (copia)`
    setForm(dup)
    setSaveError(null)
    setModalMode('new')
    setDetailPayment(null)
    setDetailState(null)
  }, [list.selected, resources])

  const handlePrint = useCallback(() => window.print(), [])
  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId
    exportPaymentsExcel(tableRows, resources, archiveName)
  }, [tableRows, resources, activeArchive?.name, studioId])

  const showToast = useCallback((msg: string) => {
    setActionMessage(msg)
    window.setTimeout(() => setActionMessage(null), 2500)
  }, [])

  if (authLoading || studioLoading) {
    return <div className="gestionale-page gestionale-page-skeleton">Caricamento pagamenti…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && payments.length === 0 && !showInitialSpinnerCombined) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-pagamenti">
        {loadError}
      </div>
    )
  }

  return (
    <div className="pagamenti-section gestionale-page" data-tutorial="page-pagamenti">
      {syncing && payments.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinnerCombined ? <div className="gestionale-page-skeleton">Caricamento pagamenti…</div> : null}
      {loadError || actionError ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{loadError || actionError}</div>
      ) : null}
      {actionMessage ? <div className="gestionale-page__banner gestionale-page__banner--ok">{actionMessage}</div> : null}

      <SectionHeader
        title="Pagamenti"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca descrizione…"
        className="pagamenti-section__header"
      />

      <div className="pagamenti-section__body">
        <div className="pagamenti-section__lista">
          <DataTable
            rows={tableRows}
            columns={columns}
            rowKey={p => p.id}
            tableId="pagamenti"
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const p = payments.find(x => x.id === keys[0])
                if (p) list.selectItem(p)
              } else if (keys.length === 0) {
                list.clearSelection()
              }
            }}
            sortColumnId={list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => openSchedaFromPayment(item)}
            emptyMessage="Nessun movimento. Usa «Nuovo pagam.» per registrarne uno."
            virtualize
            virtualizeThreshold={80}
          />
          <LoadMoreBar hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />

          <div className="pagamenti-section__foot">
            <span className="pagamenti-section__foot-count">{list.filtered.length} voci</span>
            <span />
            <span />
            <span />
            <span />
            <span className="pagamenti-section__foot-in">€ {summary.totalIn.toFixed(2)}</span>
            <span className="pagamenti-section__foot-out">€ {summary.totalOut.toFixed(2)}</span>
            <span />
          </div>
        </div>

        <PagamentiSidebar
          period={list.period}
          statusFilter={list.statusFilter}
          resourceFilter={list.resourceFilter}
          subjectFilter={list.subjectFilter}
          resources={resources}
          payments={scopedPayments}
          onPeriodChange={list.setPeriod}
          onStatusFilterChange={list.setStatusFilter}
          onResourceFilterChange={list.setResourceFilter}
          onSubjectFilterChange={list.setSubjectFilter}
        />
      </div>

      <PagamentiActionBar
        hasSelection={!!list.selected}
        hasMultiSelection={list.selectedKeys.length > 1}
        canDelete={!!list.selected || list.selectedKeys.length > 0}
        onNuovoPagamento={openNewModal}
        onNuovoGiroconto={() => showToast('Giroconto tra risorse — in arrivo.')}
        onModifica={() => list.selected && openDetailModal(list.selected)}
        onDuplica={handleDuplicate}
        onElimina={() => void handleDelete()}
        onStampa={() => handlePrint()}
        onExcel={handleExcel}
        onSaldoMultiplo={() => openPagamentiRisorse()}
        onModificaSelez={() => showToast('Modifica selezione multipla — in arrivo.')}
      />

      <PagamentoModal
        open={modalMode === 'new'}
        mode="new"
        form={form}
        resources={resources}
        studioId={studioId}
        saving={saving}
        saveError={saveError}
        onChange={setForm}
        onSave={() => void handleSave()}
        onClose={closeModal}
        onManageResources={() => openPagamentiRisorse()}
      />

      {schedaPayment && schedaPayload && studioId ? (
        <SchedaSoggettoModal
          payment={schedaPayment}
          studioId={studioId}
          studioRecords={studioSoggettiRecords}
          payload={schedaPayload}
          onClose={closeSchedaModal}
        />
      ) : null}

      {detailPayment && detailState ? (
        <PagamentoDettaglioModal
          payment={detailPayment}
          state={detailState}
          resources={resources}
          studioId={studioId}
          saving={detailSaving}
          saveError={detailSaveError}
          onChange={setDetailState}
          onSave={() => void handleSaveDettaglio()}
          onClose={closeDetailModal}
        />
      ) : null}
    </div>
  )
}
