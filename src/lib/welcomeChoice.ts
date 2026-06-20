const STORAGE_KEY = 'fixlab.welcomeChoice'

export type WelcomeMode = 'desktop' | 'web'
export type WelcomeOs = 'windows' | 'mac'
export type WelcomeRam = 4 | 8 | 16

export type WelcomeChoice = {
  mode: WelcomeMode
  os?: WelcomeOs
  ramGb?: WelcomeRam
  completedAt: string
}

export function getWelcomeChoice(): WelcomeChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WelcomeChoice
    if (parsed?.mode !== 'desktop' && parsed?.mode !== 'web') return null
    return parsed
  } catch {
    return null
  }
}

export function hasWelcomeChoice(): boolean {
  return getWelcomeChoice() !== null
}

export function saveWelcomeChoice(choice: Omit<WelcomeChoice, 'completedAt'>): WelcomeChoice {
  const full: WelcomeChoice = { ...choice, completedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
  return full
}

export function clearWelcomeChoice(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isDesktopApp(): boolean {
  return window.fixlabDesktop?.isElectron === true
}

export async function getDesktopDownloadUrl(): Promise<{ url: string; version: string }> {
  try {
    const res = await fetch('/version.json')
    const data = (await res.json()) as { version: string }
    const version = data.version || '1.0.35'
    return {
      version,
      url: `https://github.com/fixlab386-lab/fixlab/releases/download/v${version}/FixLab-Setup-${version}.exe`,
    }
  } catch {
    return {
      version: 'latest',
      url: 'https://github.com/fixlab386-lab/fixlab/releases/latest',
    }
  }
}

export function ramCompatibility(ram: WelcomeRam | undefined): 'warn' | 'ok' | 'great' {
  if (!ram || ram <= 4) return 'warn'
  if (ram === 8) return 'ok'
  return 'great'
}
