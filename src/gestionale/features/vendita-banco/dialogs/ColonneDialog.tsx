import { WinButton } from '../WinControls'
import type { ColonnaRigheId } from '../types'

const COLONNE_LABELS: Record<ColonnaRigheId, string> = {
  cod: 'Cod.',
  descrizione: 'Descrizione',
  tagliaColore: 'Taglia/Colore',
  qta: 'Q.tà',
  um: 'U.m.',
  prezzoIvato: 'Prezzo ivato',
  sconto: 'Scont▼',
  iva: 'Iva▼',
  scaricaMag: 'Scarica ma…',
  importoIvato: 'Importo ivato',
}

type Props = {
  visible: Record<ColonnaRigheId, boolean>
  labels?: Partial<Record<ColonnaRigheId, string>>
  onChange: (next: Record<ColonnaRigheId, boolean>) => void
  onClose: () => void
}

export default function ColonneDialog({ visible, labels, onChange, onClose }: Props) {
  const toggle = (id: ColonnaRigheId) => {
    onChange({ ...visible, [id]: !visible[id] })
  }

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--sm">
        <div className="vb-dialog__titlebar">
          <span>Colonne…</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body">
          <p style={{ margin: '0 0 8px' }}>Seleziona le colonne visibili nella griglia:</p>
          <div className="vb-colonne-grid">
            {(Object.keys(COLONNE_LABELS) as ColonnaRigheId[]).map(id => (
              <label key={id}>
                <input type="checkbox" checked={visible[id]} onChange={() => toggle(id)} />
                {labels?.[id] ?? COLONNE_LABELS[id]}
              </label>
            ))}
          </div>
        </div>
        <div className="vb-dialog__footer vb-dialog__footer--center">
          <WinButton onClick={onClose}>OK</WinButton>
        </div>
      </div>
    </div>
  )
}
