import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import { useOpenNewOnMount } from '../hooks/useOpenNewOnMount'
import { useDeviceListState } from '../hooks/useDeviceListState'
import {
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  findDeviceByCode,
  getRepairs,
  getClients,
} from '../lib/firestore'
import type { Client, Device, Repair } from '../types'
import BarcodeScanner from '../components/BarcodeScanner'
import ClientFormModal from '../components/ClientFormModal'
import { createStandardCrudActions } from '../components/anagrafica'
import {
  DeviceDetailPanel,
  DeviceSectionActions,
  DeviceFilterBar,
  createDeviceTableColumns,
  emptyDeviceForm,
  deviceToForm,
  formToDevicePayload,
  formToDeviceUpdate,
  sortDeviceRows,
  mergeRepairHistory,
} from '../components/devices'
import { exportDevicesExcel } from '../components/devices/exportDevicesExcel'
import {
  SectionHeader,
  MasterDetailLayout,
  DataTable,
  ActionBar,
  type ActionBarAction,
} from '../components/ui'
import type { DeviceFormState } from '../components/devices/deviceForm'

const deviceSearchHaystack = (d: Device) =>
  `${d.imei || ''}${d.serial || ''}${d.barcode || ''}${d.brand}${d.model}${d.type}${d.clientName || ''}${d.clientPhone || ''}`

const columns = createDeviceTableColumns()

type ScanResult = { device: Device | null; code: string }

export default function Dispositivi() {
  const { userProfile, loading: authLoading } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()

  const [devices, setDevices] = useState<Device[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<DeviceFormState>(emptyDeviceForm())
  const [showScanner, setShowScanner] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [linkedRepairs, setLinkedRepairs] = useState<Repair[]>([])
  const [scanning, setScanning] = useState(false)

  const list = useDeviceListState(devices, deviceSearchHaystack)
  const scanInputRef = useRef<HTMLInputElement>(null)

  const selectedId = list.selected?.id

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const [devs, cls] = await Promise.all([getDevices(studioId), getClients(studioId)])
      setDevices(devs)
      setClients(cls)
      setLoadError(null)
      if (selectedId) {
        const updated = devs.find(d => d.id === selectedId)
        if (updated) list.setSelected(updated)
      }
    } catch {
      setLoadError('Impossibile aggiornare l’elenco dispositivi.')
    }
  }, [studioId, selectedId, list.setSelected])

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([getDevices(studioId), getClients(studioId)])
      .then(([devs, cls]) => {
        if (cancelled) return
        setDevices(devs)
        setClients(cls)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare i dispositivi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  useEffect(() => {
    if (!list.selected || !studioId) {
      setLinkedRepairs([])
      return
    }
    let cancelled = false
    getRepairs(studioId)
      .then(allRepairs => {
        if (cancelled) return
        const code = list.selected!.imei || list.selected!.serial || ''
        const linked = allRepairs.filter(
          r => (code && r.imei === code) || r.deviceId === list.selected!.id,
        )
        setLinkedRepairs(linked)
      })
      .catch(() => {
        if (!cancelled) setLinkedRepairs([])
      })
    return () => {
      cancelled = true
    }
  }, [list.selected, studioId])

  const brandsInUse = useMemo(() => {
    const set = new Set(devices.map(d => d.brand).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'it'))
  }, [devices])

  const statusCounts = useMemo(() => {
    const m: Partial<Record<Device['status'], number>> = {}
    for (const d of devices) {
      m[d.status] = (m[d.status] || 0) + 1
    }
    return m
  }, [devices])

  const tableRows = useMemo(
    () =>
      sortDeviceRows(list.filtered, {
        groupBy: list.groupBy,
        sortColumnId: list.sortColumnId,
        sortDirection: list.sortDirection,
        columns,
      }),
    [list.filtered, list.groupBy, list.sortColumnId, list.sortDirection],
  )

  const repairHistory = useMemo(() => {
    if (!list.selected) return []
    return mergeRepairHistory(list.selected, linkedRepairs)
  }, [list.selected, linkedRepairs])

  const patchForm = useCallback((patch: Partial<DeviceFormState>) => {
    setForm(prev => ({ ...prev, ...patch }))
  }, [])

  const handleLookup = useCallback(
    async (code: string) => {
      if (!code.trim() || !studioId) return
      setScanning(true)
      setScanResult(null)
      setLookupError(null)
      try {
        const found = await findDeviceByCode(studioId, code.trim())
        setScanResult({ device: found, code: code.trim() })
        if (found) {
          list.selectItem(found)
          list.setDetailCollapsed(false)
        }
      } catch (err) {
        setLookupError(err instanceof Error ? err.message : 'Ricerca non riuscita.')
      } finally {
        setScanning(false)
      }
    },
    [studioId, list],
  )

  const handleBarcodeScan = useCallback(
    (code: string) => {
      setShowScanner(false)
      void handleLookup(code)
    },
    [handleLookup],
  )

  useEffect(() => {
    let buffer = ''
    let timeout: ReturnType<typeof setTimeout>

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      const isScanField = active === scanInputRef.current

      if (isInput && !isScanField) return

      if (e.key === 'Enter' && buffer.length >= 5) {
        e.preventDefault()
        void handleLookup(buffer)
        buffer = ''
        return
      }

      if (e.key.length === 1) {
        buffer += e.key
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          buffer = ''
        }, 280)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout)
    }
  }, [handleLookup])

  const handleNew = useCallback(
    (prefill?: Partial<DeviceFormState>) => {
      setForm(emptyDeviceForm(prefill))
      list.startNew()
      setScanResult(null)
    },
    [list],
  )

  useOpenNewOnMount(() => handleNew())

  const handleEdit = useCallback(() => {
    if (!list.selected) return
    setForm(deviceToForm(list.selected))
    list.startEdit()
  }, [list])

  const handleCancelEdit = useCallback(() => {
    list.cancelEdit()
    if (list.selected) setForm(deviceToForm(list.selected))
  }, [list])

  const handleConfirm = useCallback(async () => {
    if (!studioId || !form.brand.trim() || !form.model.trim()) return
    setSaving(true)
    try {
      if (list.editMode === 'edit' && list.selected) {
        await updateDevice(list.selected.id, formToDeviceUpdate(form))
      } else {
        const ref = await addDevice(formToDevicePayload(form, studioId))
        const created: Device = {
          ...formToDevicePayload(form, studioId),
          id: ref.id,
          createdAt: new Date(),
        }
        list.setSelected(created)
        list.setSelectedKeys([created.id])
      }
      list.setEditMode(null)
      await refresh()
    } catch {
      setLoadError('Salvataggio dispositivo non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [studioId, form, list, refresh])

  const handleDelete = useCallback(async () => {
    const target =
      list.selected ??
      (list.selectedKeys.length === 1 ? devices.find(d => d.id === list.selectedKeys[0]) : null)
    if (!target) return
    if (!confirm(`Eliminare il dispositivo "${target.brand} ${target.model}"?`)) return
    try {
      await deleteDevice(target.id)
      list.clearSelection()
      list.cancelEdit()
      await refresh()
    } catch {
      setLoadError('Eliminazione non riuscita.')
    }
  }, [list, devices, refresh])

  const handleDuplicate = useCallback(async () => {
    if (!list.selected || !studioId) return
    try {
      const { id: _id, createdAt: _ca, updatedAt: _ua, imei: _imei, serial: _serial, barcode: _barcode, ...rest } =
        list.selected
      const ref = await addDevice({
        ...rest,
        studioId,
        brand: rest.brand,
        model: `${rest.model} (copia)`,
        repairsHistory: [],
        salesHistory: [],
        totalRepairs: 0,
        totalSpentOnRepairs: 0,
      })
      await refresh()
      const dup: Device = {
        ...rest,
        id: ref.id,
        studioId,
        model: `${rest.model} (copia)`,
        repairsHistory: [],
        salesHistory: [],
        totalRepairs: 0,
        totalSpentOnRepairs: 0,
        createdAt: new Date(),
      }
      list.setSelected(dup)
      list.setSelectedKeys([dup.id])
    } catch {
      setLoadError('Duplicazione non riuscita.')
    }
  }, [list, studioId, refresh])

  const handleClientSaved = useCallback(
    (savedClient: Client) => {
      setClients(prev => {
        const exists = prev.find(c => c.id === savedClient.id)
        if (exists) return prev.map(c => (c.id === savedClient.id ? savedClient : c))
        return [savedClient, ...prev]
      })
      patchForm({
        clientId: savedClient.id,
        clientName: savedClient.name,
        clientPhone: savedClient.phone || savedClient.cellPhone || '',
      })
      setShowClientForm(false)
    },
    [patchForm],
  )

  const registerFromScan = useCallback(() => {
    if (!scanResult) return
    const isImei = /^\d{15}$/.test(scanResult.code)
    handleNew(isImei ? { imei: scanResult.code } : { serial: scanResult.code })
    setScanResult(null)
  }, [scanResult, handleNew])

  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId
    exportDevicesExcel(tableRows, archiveName)
  }, [tableRows, activeArchive?.name, studioId])

  const actionBarActions: ActionBarAction[] = useMemo(
    () => [
      ...createStandardCrudActions({
        onNew: () => handleNew(),
        onDuplicate: () => void handleDuplicate(),
        onDelete: () => void handleDelete(),
        onExcel: handleExcel,
        excelDisabled: tableRows.length === 0,
        duplicateDisabled: !list.selected,
        deleteDisabled: !list.selected && list.selectedKeys.length === 0,
      }),
      { id: 'scan', label: 'Scansiona', icon: '📷', onClick: () => setShowScanner(true) },
    ],
    [handleNew, handleDuplicate, handleDelete, handleExcel, list.selected, list.selectedKeys.length, tableRows.length],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento dispositivi…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError && devices.length === 0) {
    return (
      <div className="gestionale-page gestionale-datatable__empty" data-tutorial="page-dispositivi">
        {loadError}
      </div>
    )
  }

  return (
    <div className="gestionale-page" data-tutorial="page-dispositivi">
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}

      <SectionHeader
        title="Dispositivi"
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cerca IMEI, seriale, modello, cliente…"
        actions={
          <DeviceSectionActions
            groupBy={list.groupBy}
            onToggleGroupBy={list.toggleGroupBy}
            statusFilter={list.statusFilter}
            brandFilter={list.brandFilter}
            showFilterMenu={list.showFilterMenu}
            onToggleFilterMenu={list.toggleFilterMenu}
            selectionMode={list.selectionMode}
            onToggleSelectionMode={list.toggleSelectionMode}
            onScan={() => setShowScanner(true)}
          />
        }
      />

      <div className="gestionale-device-scan-row" data-tutorial="dispositivi-scan">
        <input
          ref={scanInputRef}
          type="search"
          className="gestionale-device-scan-row__input"
          placeholder="Scansiona o digita IMEI / seriale / barcode e premi Invio…"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const v = (e.target as HTMLInputElement).value
              void handleLookup(v)
              ;(e.target as HTMLInputElement).value = ''
            }
          }}
        />
        <button
          type="button"
          className="gestionale-section-header__action-btn"
          onClick={() => setShowScanner(true)}
          title="Fotocamera"
        >
          📷
        </button>
        {scanning ? <span className="gestionale-device-scan-row__hint">Ricerca…</span> : null}
      </div>

      {lookupError ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{lookupError}</div>
      ) : null}

      {scanResult ? (
        <div
          className={`gestionale-device-scan-banner${scanResult.device ? ' gestionale-device-scan-banner--found' : ' gestionale-device-scan-banner--missing'}`}
        >
          {scanResult.device ? (
            <>
              <span>
                Trovato: <strong>{scanResult.device.brand} {scanResult.device.model}</strong>
                {scanResult.device.clientName ? ` — ${scanResult.device.clientName}` : ''}
                {' · '}{scanResult.device.totalRepairs || 0} riparazioni
              </span>
              <button type="button" className="gestionale-section-header__action-btn" onClick={() => list.selectItem(scanResult.device!)}>
                Apri scheda
              </button>
            </>
          ) : (
            <>
              <span>
                Codice <strong style={{ fontFamily: 'monospace' }}>{scanResult.code}</strong> non registrato
              </span>
              <button type="button" className="gestionale-section-header__action-btn" onClick={registerFromScan}>
                + Registra nuovo
              </button>
            </>
          )}
          <button type="button" className="gestionale-section-header__action-btn" onClick={() => setScanResult(null)}>
            ✕
          </button>
        </div>
      ) : null}

      {list.showFilterMenu ? (
        <DeviceFilterBar
          idPrefix="dispositivi"
          brands={brandsInUse}
          statusFilter={list.statusFilter}
          brandFilter={list.brandFilter}
          statusCounts={statusCounts}
          totalCount={devices.length}
          onStatusFilterChange={list.setStatusFilter}
          onBrandFilterChange={list.setBrandFilter}
          onClearFilters={list.resetFilters}
        />
      ) : null}

      <MasterDetailLayout
        detailCollapsed={list.detailCollapsed}
        onToggleDetail={() => list.setDetailCollapsed(c => !c)}
        master={
          <DataTable
            rows={tableRows}
            columns={columns}
            rowKey={d => d.id}
            selectable={list.selectionMode}
            selectedKeys={list.selectedKeys}
            onSelectionChange={keys => {
              list.setSelectedKeys(keys)
              if (keys.length === 1) {
                const d = devices.find(x => x.id === keys[0])
                if (d) list.selectItem(d)
              }
            }}
            sortColumnId={list.groupBy !== 'none' ? null : list.sortColumnId}
            sortDirection={list.sortDirection}
            onSort={list.handleSort}
            onRowClick={item => {
              if (list.editMode) return
              list.selectItem(item)
            }}
            emptyMessage="Nessun dispositivo in questo elenco. Usa «Nuovo» o scansiona un IMEI."
            virtualize
            virtualizeThreshold={50}
          />
        }
        detail={
          list.editMode || list.selected ? (
            <DeviceDetailPanel
              device={list.selected}
              form={form}
              editMode={list.editMode}
              activeTab={list.detailTab}
              clients={clients}
              repairHistory={repairHistory}
              saving={saving}
              onTabChange={list.setDetailTab}
              onFormChange={patchForm}
              onConfirm={() => void handleConfirm()}
              onCancel={handleCancelEdit}
              onEdit={handleEdit}
              onDelete={() => void handleDelete()}
              onNewClient={() => setShowClientForm(true)}
            />
          ) : (
            <div className="gestionale-detail-panel gestionale-detail-panel--empty">
              <p className="gestionale-detail-panel__empty-msg">
                <strong>Nessun dispositivo selezionato</strong>
                Seleziona una riga nella tabella, scansiona un IMEI oppure usa «Nuovo».
              </p>
            </div>
          )
        }
      />

      <ActionBar count={list.filtered.length} countLabel="dispositivi" actions={actionBarActions} />

      {showClientForm ? (
        <ClientFormModal
          studioId={studioId}
          client={null}
          onSave={handleClientSaved}
          onClose={() => setShowClientForm(false)}
        />
      ) : null}

      {showScanner ? (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      ) : null}
    </div>
  )
}
