import type { Repair } from '../../../types'

export type RepairStatus = Repair['status']

export type RepairStatusDef = {
  key: RepairStatus | 'active'
  label: string
  short: string
}

export const REPAIR_STATUSES: RepairStatusDef[] = [
  { key: 'waiting', label: 'In attesa', short: 'Attesa' },
  { key: 'accepted', label: 'Accettata', short: 'Accettata' },
  { key: 'in_progress', label: 'In lavorazione', short: 'Lavorazione' },
  { key: 'ready', label: 'Pronta', short: 'Pronta' },
  { key: 'on_hold', label: 'In sospeso', short: 'Sospeso' },
  { key: 'completed', label: 'Completata', short: 'Completata' },
]

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  waiting: 'In attesa',
  accepted: 'Accettata',
  in_progress: 'In lavorazione',
  ready: 'Pronta',
  completed: 'Completata',
  on_hold: 'In sospeso',
}

export const REPAIR_PRIORITIES: Record<string, { label: string }> = {
  normal: { label: 'Normale' },
  urgent: { label: 'Urgente' },
  express: { label: 'Express' },
}

export const REPAIR_STATUS_ORDER: RepairStatus[] = ['waiting', 'accepted', 'in_progress', 'ready', 'completed']
