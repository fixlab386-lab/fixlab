import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Client, Device } from '../../types'
import type { DeviceEditMode } from '../../hooks/useDeviceListState'
import { DetailPanel, DetailPanelFields, FormField, ToolButton, type DetailPanelField } from '../ui'
import {
  DEVICE_BRANDS,
  DEVICE_CONDITIONS,
  DEVICE_STATUSES,
  DEVICE_TYPES,
  REPAIR_STATUS_LABELS,
} from './constants'
import type { DeviceFormState } from './deviceForm'
import type { DeviceDetailTab, MergedRepairHistoryEntry } from './utils'
import { deviceIdentifier, displayDeviceValue, formatItDateShort } from './utils'

type DeviceDetailPanelProps = {
  device: Device | null
  form: DeviceFormState
  editMode: DeviceEditMode
  activeTab: DeviceDetailTab
  clients: Client[]
  repairHistory: MergedRepairHistoryEntry[]
  saving: boolean
  onTabChange: (tab: DeviceDetailTab) => void
  onFormChange: (patch: Partial<DeviceFormState>) => void
  onConfirm: () => void
  onCancel: () => void
  onEdit: () => void
  onDelete: () => void
  onNewClient: () => void
}

function deviceReadFields(device: Device): DetailPanelField[] {
  const condition = DEVICE_CONDITIONS.find(c => c.key === device.condition)
  const status = DEVICE_STATUSES.find(s => s.key === device.status)
  return [
    { label: 'Tipo', value: displayDeviceValue(device.type) },
    { label: 'Marca', value: displayDeviceValue(device.brand) },
    { label: 'Modello', value: displayDeviceValue(device.model) },
    { label: 'IMEI/SN', value: deviceIdentifier(device) },
    { label: 'Colore', value: displayDeviceValue(device.color) },
    { label: 'Storage', value: displayDeviceValue(device.storage) },
    { label: 'Stato', value: status ? `${status.emoji} ${status.label}` : '—' },
    { label: 'Condizione', value: condition ? `${condition.emoji} ${condition.label}` : '—' },
    { label: 'Cliente', value: displayDeviceValue(device.clientName) },
    { label: 'Tel. cliente', value: displayDeviceValue(device.clientPhone) },
    { label: 'Note', value: displayDeviceValue(device.notes), span: 2 },
  ]
}

export default function DeviceDetailPanel({
  device,
  form,
  editMode,
  activeTab,
  clients,
  repairHistory,
  saving,
  onTabChange,
  onFormChange,
  onConfirm,
  onCancel,
  onEdit,
  onDelete,
  onNewClient,
}: DeviceDetailPanelProps) {
  const navigate = useNavigate()
  const isEditing = editMode !== null
  const canSave = Boolean(form.brand.trim() && form.model.trim())

  const editContent = (
    <div className="gestionale-detail-edit-stack">
      <FormField label="IMEI (15 cifre)" htmlFor="dv-imei">
        <input
          id="dv-imei"
          className="gestionale-form-field__input"
          value={form.imei}
          onChange={e => onFormChange({ imei: e.target.value.replace(/\D/g, '').slice(0, 15) })}
          placeholder="356938035643809"
        />
      </FormField>
      <FormField label="Seriale" htmlFor="dv-serial">
        <input
          id="dv-serial"
          className="gestionale-form-field__input"
          value={form.serial}
          onChange={e => onFormChange({ serial: e.target.value })}
        />
      </FormField>
      <FormField label="Barcode" htmlFor="dv-barcode">
        <input
          id="dv-barcode"
          className="gestionale-form-field__input"
          value={form.barcode}
          onChange={e => onFormChange({ barcode: e.target.value })}
        />
      </FormField>
      <FormField label="Tipo" htmlFor="dv-type">
        <select
          id="dv-type"
          className="gestionale-form-field__input"
          value={form.type}
          onChange={e => onFormChange({ type: e.target.value })}
        >
          {DEVICE_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Marca" htmlFor="dv-brand">
        <select
          id="dv-brand"
          className="gestionale-form-field__input"
          value={form.brand}
          onChange={e => onFormChange({ brand: e.target.value })}
        >
          <option value="">— Seleziona —</option>
          {DEVICE_BRANDS.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Modello" htmlFor="dv-model">
        <input
          id="dv-model"
          className="gestionale-form-field__input"
          value={form.model}
          onChange={e => onFormChange({ model: e.target.value })}
          placeholder="iPhone 15 Pro"
        />
      </FormField>
      <FormField label="Colore" htmlFor="dv-color">
        <input
          id="dv-color"
          className="gestionale-form-field__input"
          value={form.color}
          onChange={e => onFormChange({ color: e.target.value })}
        />
      </FormField>
      <FormField label="Storage" htmlFor="dv-storage">
        <input
          id="dv-storage"
          className="gestionale-form-field__input"
          value={form.storage}
          onChange={e => onFormChange({ storage: e.target.value })}
          placeholder="256GB"
        />
      </FormField>
      <FormField label="Stato" htmlFor="dv-status">
        <select
          id="dv-status"
          className="gestionale-form-field__input"
          value={form.status}
          onChange={e => onFormChange({ status: e.target.value as Device['status'] })}
        >
          {DEVICE_STATUSES.map(s => (
            <option key={s.key} value={s.key}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Condizione" htmlFor="dv-condition">
        <select
          id="dv-condition"
          className="gestionale-form-field__input"
          value={form.condition}
          onChange={e => onFormChange({ condition: e.target.value as Device['condition'] })}
        >
          {DEVICE_CONDITIONS.map(c => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Cliente" htmlFor="dv-client">
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            id="dv-client"
            className="gestionale-form-field__input"
            style={{ flex: 1 }}
            value={form.clientId}
            onChange={e => {
              const cl = clients.find(c => c.id === e.target.value)
              onFormChange({
                clientId: cl?.id || '',
                clientName: cl?.name || '',
                clientPhone: cl?.phone || cl?.cellPhone || '',
              })
            }}
          >
            <option value="">— Seleziona cliente —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` (${c.phone})` : ''}
              </option>
            ))}
          </select>
          <button type="button" className="gestionale-tool-btn" onClick={onNewClient}>
            + Nuovo
          </button>
        </div>
      </FormField>
      <FormField label="Note" htmlFor="dv-notes">
        <textarea
          id="dv-notes"
          className="gestionale-form-field__input"
          rows={3}
          value={form.notes}
          onChange={e => onFormChange({ notes: e.target.value })}
        />
      </FormField>
    </div>
  )

  const historyContent = useMemo(() => {
    if (repairHistory.length === 0) {
      return (
        <p className="gestionale-detail-panel__empty-msg" style={{ padding: '12px 0' }}>
          Nessuna riparazione registrata per questo dispositivo.
        </p>
      )
    }
    return (
      <ul className="gestionale-device-history">
        {repairHistory.map(entry => (
          <li key={entry.repairId}>
            <button
              type="button"
              className="gestionale-device-history__item"
              onClick={() => navigate(`/riparazioni/${entry.repairId}`)}
            >
              <div className="gestionale-device-history__main">
                <span className="gestionale-device-history__problem">{entry.problem || 'Riparazione'}</span>
                <span className="gestionale-device-history__meta">
                  {formatItDateShort(entry.date)}
                  {' · '}
                  {REPAIR_STATUS_LABELS[entry.status] || entry.status}
                  {entry.ticketNumber ? ` · #${entry.ticketNumber}` : ''}
                </span>
              </div>
              <span className="gestionale-device-history__amount">€ {(entry.totalCost || 0).toFixed(2)}</span>
            </button>
          </li>
        ))}
      </ul>
    )
  }, [repairHistory, navigate])

  const title = isEditing
    ? editMode === 'new'
      ? 'Nuovo dispositivo'
      : `${form.brand} ${form.model}`.trim() || 'Modifica dispositivo'
    : device
      ? `${device.brand} ${device.model}`.trim()
      : undefined

  const readFields = device && !isEditing && activeTab === 'dispositivo' ? deviceReadFields(device) : []

  return (
    <DetailPanel
      title={title}
      tabs={[
        { id: 'dispositivo', label: 'Dispositivo', content: isEditing ? editContent : null },
        {
          id: 'storico',
          label: `Storico riparazioni${repairHistory.length ? ` (${repairHistory.length})` : ''}`,
          content: !isEditing ? historyContent : null,
          disabled: isEditing,
        },
      ]}
      activeTabId={activeTab}
      onTabChange={id => onTabChange(id as DeviceDetailTab)}
      fields={readFields.length ? readFields : undefined}
      footer={
        isEditing ? (
          <>
            <ToolButton
              label={saving ? 'Salvataggio…' : 'Conferma'}
              icon="✓"
              onClick={onConfirm}
              disabled={saving || !canSave}
            />
            <ToolButton label="Annulla" icon="↩" onClick={onCancel} disabled={saving} />
          </>
        ) : device ? (
          <>
            <ToolButton label="Modifica" icon="✏️" onClick={onEdit} />
            <ToolButton label="Elimina" icon="🗑" variant="danger" onClick={onDelete} />
          </>
        ) : null
      }
    />
  )
}
