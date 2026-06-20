import type { ComponentType, ReactNode } from 'react'

/** Icone toolbar stile Danea Easyfatt (SVG multicolore 32×32). */

type IconProps = { size?: number }

function IconWrap({ children, size = 32 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export function IconNuovo({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <circle cx="16" cy="16" r="14" fill="#ffd54f" stroke="#f9a825" strokeWidth="1" />
      <rect x="14" y="8" width="4" height="16" rx="1" fill="#fff" />
      <rect x="8" y="14" width="16" height="4" rx="1" fill="#fff" />
    </IconWrap>
  )
}

export function IconStart({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <path d="M4 14 L16 6 L28 14 V26 H4 Z" fill="#4caf50" stroke="#2e7d32" strokeWidth="1" />
      <rect x="12" y="18" width="8" height="8" fill="#fff" stroke="#2e7d32" strokeWidth="0.5" />
    </IconWrap>
  )
}

export function IconClienti({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <circle cx="16" cy="11" r="6" fill="#42a5f5" />
      <path d="M6 28c0-6 4.5-10 10-10s10 4 10 10" fill="#1976d2" />
    </IconWrap>
  )
}

export function IconFornitori({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="4" y="10" width="24" height="16" rx="2" fill="#78909c" stroke="#546e7a" strokeWidth="1" />
      <rect x="8" y="6" width="16" height="8" rx="1" fill="#90a4ae" />
      <rect x="10" y="16" width="5" height="6" fill="#eceff1" />
      <rect x="17" y="16" width="5" height="6" fill="#eceff1" />
    </IconWrap>
  )
}

export function IconProdotti({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="5" y="8" width="22" height="18" rx="2" fill="#ffb74d" stroke="#f57c00" strokeWidth="1" />
      <rect x="8" y="11" width="7" height="5" fill="#fff3e0" />
      <rect x="17" y="11" width="7" height="5" fill="#fff3e0" />
      <rect x="8" y="18" width="16" height="5" fill="#fff3e0" />
    </IconWrap>
  )
}

export function IconDocumenti({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <path d="M8 4h12l6 6v18H8Z" fill="#fff" stroke="#1565c0" strokeWidth="1" />
      <path d="M20 4v6h6" fill="none" stroke="#1565c0" strokeWidth="1" />
      <line x1="11" y1="16" x2="21" y2="16" stroke="#1565c0" strokeWidth="1.5" />
      <line x1="11" y1="20" x2="21" y2="20" stroke="#1565c0" strokeWidth="1.5" />
    </IconWrap>
  )
}

export function IconPagamenti({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#ffd54f" stroke="#f9a825" strokeWidth="1" />
      <ellipse cx="16" cy="14" rx="12" ry="8" fill="#ffeb3b" stroke="#f9a825" strokeWidth="1" />
      <text x="16" y="17" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#795548">
        €
      </text>
    </IconWrap>
  )
}

export function IconMagazzino({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="4" y="14" width="24" height="12" fill="#8d6e63" stroke="#5d4037" strokeWidth="1" />
      <path d="M6 14 L16 6 L26 14" fill="none" stroke="#5d4037" strokeWidth="2" />
      <rect x="12" y="18" width="8" height="8" fill="#d7ccc8" />
    </IconWrap>
  )
}

export function IconRiparazioni({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <path
        d="M8 22 L14 16 L18 20 L24 10 L26 12 L19 24 L15 20 L10 25 Z"
        fill="#78909c"
        stroke="#455a64"
        strokeWidth="1"
      />
    </IconWrap>
  )
}

export function IconAnalisi({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="6" y="20" width="5" height="8" fill="#66bb6a" />
      <rect x="13" y="14" width="5" height="14" fill="#42a5f5" />
      <rect x="20" y="8" width="5" height="20" fill="#ef5350" />
    </IconWrap>
  )
}

export function IconStrumenti({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="6" y="14" width="20" height="4" rx="1" fill="#90a4ae" transform="rotate(-45 16 16)" />
      <circle cx="22" cy="10" r="4" fill="#78909c" />
    </IconWrap>
  )
}

export function IconArchivi({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="5" y="8" width="22" height="6" rx="1" fill="#8d6e63" />
      <rect x="5" y="14" width="22" height="6" rx="1" fill="#a1887f" />
      <rect x="5" y="20" width="22" height="6" rx="1" fill="#bcaaa4" />
    </IconWrap>
  )
}

export function IconOpzioni({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <circle cx="16" cy="16" r="5" fill="#78909c" stroke="#546e7a" strokeWidth="1" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#546e7a" strokeWidth="2" strokeDasharray="4 3" />
    </IconWrap>
  )
}

export function IconEsci({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <rect x="6" y="8" width="14" height="16" rx="1" fill="#ef5350" stroke="#c62828" strokeWidth="1" />
      <path d="M14 16 H26 M22 12 L26 16 L22 20" fill="none" stroke="#c62828" strokeWidth="2" />
    </IconWrap>
  )
}

export function IconAdmin({ size }: IconProps) {
  return (
    <IconWrap size={size}>
      <path d="M16 4 L28 10 V22 L16 28 L4 22 V10 Z" fill="#5c6bc0" stroke="#3949ab" strokeWidth="1" />
      <path d="M16 10 L22 13 V19 L16 22 L10 19 V13 Z" fill="#fff" />
    </IconWrap>
  )
}

const TOOLBAR_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  start: IconStart,
  clienti: IconClienti,
  fornitori: IconFornitori,
  prodotti: IconProdotti,
  documenti: IconDocumenti,
  pagamenti: IconPagamenti,
  magazzino: IconMagazzino,
  riparazioni: IconRiparazioni,
  analisi: IconAnalisi,
  strumenti: IconStrumenti,
  archivi: IconArchivi,
  impostazioni: IconOpzioni,
  admin: IconAdmin,
  esci: IconEsci,
}

export default function ToolbarIcon({ id, size = 32 }: { id: string; size?: number }) {
  const Cmp = TOOLBAR_ICON_MAP[id]
  if (!Cmp) return null
  return <Cmp size={size} />
}
