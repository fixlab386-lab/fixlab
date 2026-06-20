import ActionBarDropdown from '../../components/ActionBarDropdown'

const STAMPA_ITEMS = ['Elenco pagamenti', 'Prima nota', 'Scadenzario'] as const

type Props = {
  hasSelection: boolean
  hasMultiSelection: boolean
  canDelete: boolean
  onNuovoPagamento: () => void
  onNuovoGiroconto: () => void
  onModifica: () => void
  onDuplica: () => void
  onElimina: () => void
  onStampa: (tipo: string) => void
  onExcel: () => void
  onSaldoMultiplo: () => void
  onModificaSelez: () => void
}

export default function PagamentiActionBar({
  hasSelection,
  hasMultiSelection,
  canDelete,
  onNuovoPagamento,
  onNuovoGiroconto,
  onModifica,
  onDuplica,
  onElimina,
  onStampa,
  onExcel,
  onSaldoMultiplo,
  onModificaSelez,
}: Props) {
  return (
    <div className="pagamenti-actionbar" data-tutorial="pagamenti-toolbar">
      <div className="pagamenti-actionbar__group">
        <button type="button" className="pagamenti-actionbar__btn" onClick={onNuovoPagamento}>
          <span className="pagamenti-actionbar__icon pagamenti-actionbar__icon--new">+</span>
          Nuovo pagam.
        </button>
        <button type="button" className="pagamenti-actionbar__btn" onClick={onNuovoGiroconto}>
          <span className="pagamenti-actionbar__icon">↻</span>
          Nuovo giroc.
        </button>
        <button type="button" className="pagamenti-actionbar__btn" disabled={!hasSelection} onClick={onModifica}>
          <span className="pagamenti-actionbar__icon">✏</span>
          Modifica
        </button>
        <button type="button" className="pagamenti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          Duplica
        </button>
        <button type="button" className="pagamenti-actionbar__btn" disabled={!canDelete} onClick={onElimina}>
          <span className="pagamenti-actionbar__icon pagamenti-actionbar__icon--danger">🗑</span>
          Elimina
        </button>
      </div>
      <div className="pagamenti-actionbar__group">
        <ActionBarDropdown label="🖨 Stampa" items={[...STAMPA_ITEMS]} onPick={onStampa} />
        <button type="button" className="pagamenti-actionbar__btn" onClick={onExcel}>
          <span className="pagamenti-actionbar__icon">📊</span>
          Excel
        </button>
        <button type="button" className="pagamenti-actionbar__btn" onClick={onSaldoMultiplo}>
          Saldo multiplo
        </button>
        <button type="button" className="pagamenti-actionbar__btn" disabled={!hasMultiSelection} onClick={onModificaSelez}>
          Modifica selez.
        </button>
      </div>
    </div>
  )
}
