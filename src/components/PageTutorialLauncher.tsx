import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { driver } from 'driver.js'
import type { Config } from 'driver.js'
import { getTutorialSteps } from '../tutorials/registry'

const driverDefaults: Partial<Config> = {
  showProgress: true,
  nextBtnText: 'Avanti',
  prevBtnText: 'Indietro',
  doneBtnText: 'Fine',
  progressText: '{{current}} di {{total}}',
  overlayOpacity: 0.75,
  smoothScroll: true,
  stagePadding: 10,
}

export default function PageTutorialLauncher() {
  const { pathname } = useLocation()

  const start = useCallback(() => {
    const steps = getTutorialSteps(pathname)
    if (!steps.length) return
    const d = driver({ ...driverDefaults, steps })
    d.drive()
  }, [pathname])

  return (
    <button
      type="button"
      data-tutorial="layout-tutorial-btn"
      onClick={start}
      title="Guida interattiva di questa pagina"
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-primary)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      Guida
    </button>
  )
}
