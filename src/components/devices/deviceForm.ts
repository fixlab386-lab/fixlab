import type { Device } from '../../types'

export type DeviceFormState = {
  imei: string
  serial: string
  barcode: string
  type: string
  brand: string
  model: string
  color: string
  storage: string
  status: Device['status']
  condition: NonNullable<Device['condition']>
  clientId: string
  clientName: string
  clientPhone: string
  warrantyExpiry: string
  purchaseDate: string
  purchasePrice: number
  notes: string
}

export function emptyDeviceForm(prefill?: Partial<DeviceFormState>): DeviceFormState {
  return {
    imei: '',
    serial: '',
    barcode: '',
    type: 'Smartphone',
    brand: '',
    model: '',
    color: '',
    storage: '',
    status: 'client_owned',
    condition: 'good',
    clientId: '',
    clientName: '',
    clientPhone: '',
    warrantyExpiry: '',
    purchaseDate: '',
    purchasePrice: 0,
    notes: '',
    ...prefill,
  }
}

export function deviceToForm(device: Device): DeviceFormState {
  return {
    imei: device.imei || '',
    serial: device.serial || '',
    barcode: device.barcode || '',
    type: device.type || 'Smartphone',
    brand: device.brand || '',
    model: device.model || '',
    color: device.color || '',
    storage: device.storage || '',
    status: device.status || 'client_owned',
    condition: device.condition || 'good',
    clientId: device.clientId || '',
    clientName: device.clientName || '',
    clientPhone: device.clientPhone || '',
    warrantyExpiry: device.warrantyExpiry || '',
    purchaseDate: device.purchaseDate || '',
    purchasePrice: device.purchasePrice ?? 0,
    notes: device.notes || '',
  }
}

export function formToDevicePayload(form: DeviceFormState, studioId: string): Omit<Device, 'id' | 'createdAt' | 'updatedAt'> {
  const raw: Record<string, unknown> = {
    studioId,
    type: form.type,
    brand: form.brand.trim(),
    model: form.model.trim(),
    status: form.status,
    condition: form.condition,
    repairsHistory: [],
    salesHistory: [],
    totalRepairs: 0,
    totalSpentOnRepairs: 0,
    ...(form.imei.trim() ? { imei: form.imei.trim() } : {}),
    ...(form.serial.trim() ? { serial: form.serial.trim() } : {}),
    ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
    ...(form.color.trim() ? { color: form.color.trim() } : {}),
    ...(form.storage.trim() ? { storage: form.storage.trim() } : {}),
    ...(form.clientId ? { clientId: form.clientId } : {}),
    ...(form.clientName.trim() ? { clientName: form.clientName.trim() } : {}),
    ...(form.clientPhone.trim() ? { clientPhone: form.clientPhone.trim() } : {}),
    ...(form.warrantyExpiry ? { warrantyExpiry: form.warrantyExpiry } : {}),
    ...(form.purchaseDate ? { purchaseDate: form.purchaseDate } : {}),
    ...(form.purchasePrice > 0 ? { purchasePrice: form.purchasePrice } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
  }
  return raw as Omit<Device, 'id' | 'createdAt' | 'updatedAt'>
}

export function formToDeviceUpdate(form: DeviceFormState): Partial<Device> {
  return {
    type: form.type,
    brand: form.brand.trim(),
    model: form.model.trim(),
    status: form.status,
    condition: form.condition,
    ...(form.imei.trim() ? { imei: form.imei.trim() } : {}),
    ...(form.serial.trim() ? { serial: form.serial.trim() } : {}),
    ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
    ...(form.color.trim() ? { color: form.color.trim() } : {}),
    ...(form.storage.trim() ? { storage: form.storage.trim() } : {}),
    ...(form.clientId ? { clientId: form.clientId } : {}),
    ...(form.clientName.trim() ? { clientName: form.clientName.trim() } : {}),
    ...(form.clientPhone.trim() ? { clientPhone: form.clientPhone.trim() } : {}),
    ...(form.warrantyExpiry ? { warrantyExpiry: form.warrantyExpiry } : {}),
    ...(form.purchaseDate ? { purchaseDate: form.purchaseDate } : {}),
    ...(form.purchasePrice > 0 ? { purchasePrice: form.purchasePrice } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
  }
}
