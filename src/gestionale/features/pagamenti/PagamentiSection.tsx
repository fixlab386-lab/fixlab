import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { usePaymentListState } from './hooks/usePaymentListState'
import {
  getPayments,
  addPayment,
  updatePayment,
  deletePayment,
  getClients,
  getSuppliers,
  ensureDefaultPaymentResources,
  getPaymentResources,
  addPaymentResource,
  updatePaymentResource,
  deletePaymentResource,
} from '../../../lib/firestore'
import {
  computePaymentSummary,
  getDefaultResource,
  resourceTypeToLegacy,
  resolvePaymentResourceName,
} from '../../lib/paymentResources'
import type { Client, Payment, PaymentResource, Supplier } from '../../../types'
import {
  createPaymentTableColumns,
} from './paymentTableColumns'
import {
  createEmptyPaymentForm,
  type PaymentFormState,
} from './PaymentFormPanel'
import { exportPaymentsExcel } from './exportPaymentsExcel'
import {
  formatPaymentAmount,
  formatPaymentDate,
  linkedDocumentLabel,
  paymentFlowType,
  sortPaymentRows,
} from './utils'
import { PAYMENT_FLOW_LABELS, PAYMENT_STATUS_LABELS } from './constants'
import PaymentFilterBar from './PaymentFilterBar'
import PaymentFormPanel from './PaymentFormPanel'
import PaymentResourceManagerPopup from './PaymentResourceManagerPopup'
import PaymentSectionActions from './PaymentSectionActions'
import PaymentSummaryBar from './PaymentSummaryBar'
import { invalidateDashboardCache } from '../start/dashboardCache'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  DetailPanel,
  ActionBar,
  ToolButton,
  type ActionBarAction,
} from '../../../components/ui'

export default function PagamentiSection() {
  const { userProfile, loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()
  const [searchParams] = useSearchParams()

  const [payments, setPayments] = useState<Payment[]>([])
  const [resources, setResources] = useState<PaymentResource[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'new' | null>(null)
  const [form, setForm] = useState<PaymentFormState>(() => createEmptyPaymentForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showResourceManager, setShowResourceManager] = useState(false)

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
  const columns = useMemo(() => createPaymentTableColumns(resources), [resources])

  useEffect(() => {
    if (searchParams.get('status') === 'to_settle') {
      list.setStatusFilter('to_settle')
      list.setShowFilterMenu(true)
    }
  }, [searchParams, list.setStatusFilter, list.setShowFilterMenu])

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const [p, r, c, s] = await Promise.all([
        getPayments(studioId),
        ensureDefaultPaymentResources(studioId),
        getClients(studioId),
        getSuppliers(studioId),
      ])
      setPayments(p)
      setResources(r)
      setClients(c)
      setSuppliers(s)
      setLoadError(null)
    } catch {
      setLoadError('Impossibile aggiornare i pagamenti.')
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
    Promise.all([
      getPayments(studioId),
      ensureDefaultPaymentResources(studioId),
      getClients(studioId),
      getSuppliers(studioId),
    ])
      .then(([p, r, c, s]) => {
        if (!cancelled) {
          setPayments(p)
          setResources(r)
          setClients(c)
          setSuppliers(s)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare i pagamenti.')
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

  const hasActiveFilters =
    list.period !== 'all' ||
    list.flowFilter !== 'all' ||
    list.statusFilter !== 'all' ||
    list.resourceFilter !== 'all'

  const handleNew = useCallback(
    (flowType: 'in' | 'out' = 'in') => {
      const def = getDefaultResource(resources)
      setForm({ ...createEmptyPaymentForm(def?.id || ''), flowType })
      setSaveError(null)
      setFormMode('new')
      list.clearSelection()
      list.setDetailCollapsed(false)
    },
    [resources, list],
  )

  const handleSave = useCallback(async () => {
    if (!studioId || !form.description.trim() || !form.resourceId) return
    const resource = resources.find(r => r.id === form.resourceId)
    if (!resource) return

    setSaving(true)
    setSaveError(null)
    try {
      const payload: Omit<Payment, 'id' | 'createdAt'> = {
        studioId,
        date: form.date,
        resource: resourceTypeToLegacy(resource.type),
        resourceId: resource.id,
        resourceName: resource.name,
        subjectType: form.subjectType,
        subjectId: form.subjectId || undefined,
        subjectName: form.subjectName || undefined,
        description: form.description.trim(),
        paymentMethod: resource.name,
        amountIn: form.flowType === 'in' ? form.amount : undefined,
        amountOut: form.flowType === 'out' ? form.amount : undefined,
        settled: form.settled,
        ...(form.settled ? { settledDate: form.date } : {}),
        linkedDocumentId: form.linkedDocumentId || undefined,
        linkedDocumentNumber: form.linkedDocumentNumber || undefined,
        notes: form.notes || undefined,
      }
      await addPayment(payload)
      invalidateDashboardCache(studioId)
      setFormMode(null)
      list.clearSelection()
      await refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [studioId, form, resources, refresh, list])

  const handleToggleSettled = useCallback(
    async (p: Payment) => {
      const next = !p.settled
      try {
        await updatePayment(p.id, {
          settled: next,
          settledDate: next ? new Date().toISOString().split('T')[0] : '',
        })
        setPayments(prev =>
          prev.map(x => (x.id === p.id ? { ...x, settled: next, settledDate: next ? new Date().toISOString().split('T')[0] : '' } : x)),
        )
        invalidateDashboardCache(studioId!)
        if (list.selected?.id === p.id) {
          list.setSelected({ ...p, settled: next })
        }
      } catch {
        setLoadError('Aggiornamento stato non riuscito.')
      }
    },
    [list, studioId],
  )

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
      setFormMode(null)
      await refresh()
    } catch {
      setLoadError('Eliminazione non riuscita.')
    }
  }, [list, payments, refresh])

  const handlePrint = useCallback(() => window.print(), [])
  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId
    exportPaymentsExcel(tableRows, resources, archiveName)
  }, [tableRows, resources, activeArchive?.name, studioId])

  const handleSetDefaultResource = useCallback(
    async (id: string) => {
      await Promise.all(
        resources.map(r => updatePaymentResource(r.id, { isDefault: r.id === id })),
      )
      const updated = await getPaymentResources(studioId)
      setResources(updated)
    },
    [resources, studioId],
  )

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      { id: 'new', label: 'Nuovo', icon: '➕', onClick: () => handleNew('in') },
      {
        id: 'del',
        label: 'Elimina',
        icon: '🗑',
        variant: 'danger',
        onClick: () => void handleDelete(),
        disabled: !list.selected && list.selectedKeys.length === 0,
      },
      { id: 'print', label: 'Stampa', icon: '🖨', onClick: handlePrint },
      { id: 'excel', label: 'Excel', icon: '📊', onClick: handleExcel, disabled: tableRows.length === 0 },
    ],
    [handleNew, handleDelete, handlePrint, handleExcel, list.selected, list.selectedKeys.length, tableRows.length],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento pagamenti…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && payments.length === 0) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-pagamenti">
        {loadError}
      </div>
    )
  }

  return (
    <div className="gestionale-page" data-tutorial="page-pagamenti">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}

      <SectionHeader
        title="Pagamenti — Prima nota"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca descrizione, cliente, risorsa…"
        actions={
          <PaymentSectionActions
            showFilterMenu={list.showFilterMenu}
            hasActiveFilters={hasActiveFilters}
            onToggleFilterMenu={list.toggleFilterMenu}
            selectionMode={list.selectionMode}
            onToggleSelectionMode={list.toggleSelectionMode}
            onManageResources={() => setShowResourceManager(true)}
          />
        }
      />

      <PaymentSummaryBar summary={summary} />

      {list.showFilterMenu ? (
        <PaymentFilterBar
          period={list.period}
          flowFilter={list.flowFilter}
          statusFilter={list.statusFilter}
          resourceFilter={list.resourceFilter}
          resources={resources}
          onPeriodChange={list.setPeriod}
          onFlowFilterChange={list.setFlowFilter}
          onStatusFilterChange={list.setStatusFilter}
          onResourceFilterChange={list.setResourceFilter}
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
            rowKey={p => p.id}
            selectable={list.selectionMode}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const p = payments.find(x => x.id === keys[0])
                if (p) {
                  list.selectItem(p)
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
            <PaymentFormPanel
              resources={resources}
              clients={clients}
              suppliers={suppliers}
              form={form}
              onChange={setForm}
              saving={saving}
              saveError={saveError}
              onSave={() => void handleSave()}
              onCancel={() => {
                setFormMode(null)
                setSaveError(null)
              }}
              onManageResources={() => setShowResourceManager(true)}
            />
          ) : list.selected ? (
            <DetailPanel
              title={`${PAYMENT_FLOW_LABELS[paymentFlowType(list.selected)]} — ${list.selected.description}`}
              tabs={[{ id: 'riepilogo', label: 'Riepilogo', content: null }]}
              activeTabId="riepilogo"
              onTabChange={() => {}}
              fields={[
                { label: 'Data', value: formatPaymentDate(list.selected.date) },
                { label: 'Tipo', value: PAYMENT_FLOW_LABELS[paymentFlowType(list.selected)] },
                { label: 'Importo', value: formatPaymentAmount(list.selected) },
                { label: 'Risorsa', value: resolvePaymentResourceName(list.selected, resources) },
                { label: 'Cliente/Fornitore', value: list.selected.subjectName || '—' },
                {
                  label: 'Stato',
                  value: list.selected.settled
                    ? PAYMENT_STATUS_LABELS.settled
                    : PAYMENT_STATUS_LABELS.to_settle,
                },
                { label: 'Documento', value: linkedDocumentLabel(list.selected) },
                ...(list.selected.notes ? [{ label: 'Note', value: list.selected.notes }] : []),
              ]}
              footer={
                <>
                  <ToolButton
                    label={list.selected.settled ? 'Segna da saldare' : 'Segna saldato'}
                    icon={list.selected.settled ? '○' : '✓'}
                    onClick={() => void handleToggleSettled(list.selected!)}
                  />
                  <ToolButton label="Elimina" icon="🗑" onClick={() => void handleDelete()} />
                </>
              }
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun movimento selezionato</strong>
                Seleziona una riga per i dettagli oppure registra una nuova entrata/uscita.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <ToolButton label="Nuova entrata" icon="➕" onClick={() => handleNew('in')} />
                <ToolButton label="Nuova uscita" icon="➖" onClick={() => handleNew('out')} />
              </div>
            </div>
          )
        }
      />

      <ActionBar count={list.filtered.length} countLabel="movimenti" actions={actionBarActions} />

      {showResourceManager ? (
        <PaymentResourceManagerPopup
          resources={resources}
          payments={payments}
          onClose={() => setShowResourceManager(false)}
          onAdd={async data => {
            const sortOrder = resources.length
            await addPaymentResource({
              studioId,
              name: data.name,
              type: data.type,
              initialBalance: data.initialBalance,
              isDefault: data.isDefault,
              sortOrder,
            })
            const updated = await getPaymentResources(studioId)
            setResources(updated)
          }}
          onUpdate={async (id, data) => {
            await updatePaymentResource(id, data)
            const updated = await getPaymentResources(studioId)
            setResources(updated)
          }}
          onDelete={async id => {
            await deletePaymentResource(id)
            const updated = await getPaymentResources(studioId)
            setResources(updated)
          }}
          onSetDefault={handleSetDefaultResource}
        />
      ) : null}
    </div>
  )
}
