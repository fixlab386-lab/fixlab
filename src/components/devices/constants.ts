import type { Device } from '../../types'

export const DEVICE_TYPES = ['Smartphone', 'Tablet', 'Laptop', 'Console', 'Smartwatch', 'PC Desktop', 'Altro']

export const DEVICE_BRANDS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Huawei',
  'Oppo',
  'Realme',
  'OnePlus',
  'Google',
  'Motorola',
  'Nokia',
  'Sony',
  'LG',
  'Asus',
  'Lenovo',
  'HP',
  'Dell',
  'Altro',
]

export const DEVICE_CONDITIONS: {
  key: NonNullable<Device['condition']>
  label: string
  emoji: string
}[] = [
  { key: 'new', label: 'Nuovo', emoji: '✨' },
  { key: 'like_new', label: 'Come nuovo', emoji: '🟢' },
  { key: 'good', label: 'Buono', emoji: '🔵' },
  { key: 'fair', label: 'Discreto', emoji: '🟡' },
  { key: 'poor', label: 'Usurato', emoji: '🟠' },
  { key: 'broken', label: 'Rotto/Guasto', emoji: '🔴' },
]

export const DEVICE_STATUSES: {
  key: Device['status']
  label: string
  emoji: string
}[] = [
  { key: 'client_owned', label: 'Del cliente', emoji: '👤' },
  { key: 'in_repair', label: 'In riparazione', emoji: '🔧' },
  { key: 'in_store', label: 'In negozio', emoji: '🏪' },
  { key: 'sold', label: 'Venduto', emoji: '💰' },
  { key: 'returned', label: 'Reso', emoji: '↩️' },
]

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  waiting: 'In attesa',
  accepted: 'Accettata',
  in_progress: 'In lavorazione',
  ready: 'Pronta',
  completed: 'Consegnata',
  on_hold: 'In sospeso',
}
