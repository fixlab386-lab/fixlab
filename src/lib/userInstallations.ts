import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import { omitUndefined } from './firestoreSanitize'

const INSTALLATION_ID_KEY = 'fixlab_installation_id'
const HEARTBEAT_MS = 2 * 60 * 1000
const ACTIVE_WITHIN_MS = 5 * 60 * 1000

export type InstallationPlatform = 'desktop' | 'web'

export interface UserInstallation {
  id: string
  userId: string
  platform: InstallationPlatform
  os: string
  appVersion: string
  browser?: string
  label?: string
  firstSeenAt?: Date
  lastSeenAt?: Date
}

function readInstallationId(): string {
  try {
    const existing = localStorage.getItem(INSTALLATION_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(INSTALLATION_ID_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function detectOs(): string {
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Sconosciuto'
}

function detectBrowser(): string | undefined {
  const ua = navigator.userAgent
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari'
  return undefined
}

export function getCurrentInstallationId(): string {
  return readInstallationId()
}

export function getInstallationSnapshot(): Pick<
  UserInstallation,
  'platform' | 'os' | 'appVersion' | 'browser'
> {
  const isDesktop = window.fixlabDesktop?.isElectron === true
  return {
    platform: isDesktop ? 'desktop' : 'web',
    os: detectOs(),
    appVersion: import.meta.env.VITE_APP_VERSION ?? (isDesktop ? 'desktop' : 'web'),
    browser: isDesktop ? undefined : detectBrowser(),
  }
}

function installationRef(userId: string, installationId: string) {
  return doc(db, 'users', userId, 'installations', installationId)
}

function mapInstallation(id: string, data: Record<string, unknown>): UserInstallation {
  const toDate = (v: unknown) => {
    if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate()
    }
    return undefined
  }
  return {
    id,
    userId: String(data.userId ?? ''),
    platform: (data.platform === 'desktop' ? 'desktop' : 'web') as InstallationPlatform,
    os: String(data.os ?? 'Sconosciuto'),
    appVersion: String(data.appVersion ?? '—'),
    browser: data.browser ? String(data.browser) : undefined,
    label: data.label ? String(data.label) : undefined,
    firstSeenAt: toDate(data.firstSeenAt),
    lastSeenAt: toDate(data.lastSeenAt),
  }
}

export async function registerUserInstallation(userId: string): Promise<void> {
  const installationId = readInstallationId()
  const ref = installationRef(userId, installationId)
  const snap = getInstallationSnapshot()
  const existing = await getDoc(ref)

  if (existing.exists()) {
    await updateDoc(ref, omitUndefined({
      ...snap,
      lastSeenAt: serverTimestamp(),
    }))
    return
  }

  await setDoc(ref, omitUndefined({
    userId,
    ...snap,
    firstSeenAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  }))
}

export function listenUserInstallations(
  userId: string,
  callback: (installations: UserInstallation[]) => void,
  maxItems = 20,
): Unsubscribe {
  const q = query(collection(db, 'users', userId, 'installations'), limit(maxItems))
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => mapInstallation(d.id, d.data() as Record<string, unknown>))
    items.sort((a, b) => (b.lastSeenAt?.getTime() ?? 0) - (a.lastSeenAt?.getTime() ?? 0))
    callback(items)
  })
}

export async function removeUserInstallation(userId: string, installationId: string): Promise<void> {
  await deleteDoc(installationRef(userId, installationId))
}

export function isInstallationActive(lastSeenAt?: Date, now = Date.now()): boolean {
  if (!lastSeenAt) return false
  return now - lastSeenAt.getTime() <= ACTIVE_WITHIN_MS
}

export function formatInstallationLastSeen(lastSeenAt?: Date, now = Date.now()): string {
  if (!lastSeenAt) return 'Mai'
  const diffMs = now - lastSeenAt.getTime()
  if (diffMs < 60_000) return 'Adesso'
  if (diffMs < 3_600_000) {
    const mins = Math.max(1, Math.round(diffMs / 60_000))
    return `${mins} min fa`
  }
  if (diffMs < 86_400_000) {
    const hours = Math.max(1, Math.round(diffMs / 3_600_000))
    return `${hours} h fa`
  }
  return lastSeenAt.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function installationDisplayName(installation: UserInstallation): string {
  if (installation.label?.trim()) return installation.label.trim()
  const kind = installation.platform === 'desktop' ? 'App desktop' : 'Browser'
  const extra = installation.platform === 'web' && installation.browser ? ` (${installation.browser})` : ''
  return `${kind} · ${installation.os}${extra}`
}

export const USER_INSTALLATION_HEARTBEAT_MS = HEARTBEAT_MS
