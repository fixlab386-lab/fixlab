type Props = {
  total: number
  receiptResult: { ok: boolean; msg: string } | null
  stockWarning: string | null
  onNewSale: () => void
  onGoDocuments: () => void
}

export default function CassaSaleCompleteView({
  total,
  receiptResult,
  stockWarning,
  onNewSale,
  onGoDocuments,
}: Props) {
  return (
    <div className="gestionale-cassa-complete-view">
      <div className="gestionale-cassa-complete-view__icon">{receiptResult?.ok !== false ? '✅' : '⚠️'}</div>
      <h2 className="gestionale-cassa-complete-view__title">Vendita completata!</h2>
      <div className="gestionale-cassa-complete-view__total">€ {total.toFixed(2)}</div>
      {stockWarning ? (
        <div className="gestionale-cassa-complete-view__msg gestionale-cassa-complete-view__msg--warn">{stockWarning}</div>
      ) : null}
      {receiptResult ? (
        <div
          className={`gestionale-cassa-complete-view__msg${receiptResult.ok ? '' : ' gestionale-cassa-complete-view__msg--error'}`}
        >
          {receiptResult.msg}
        </div>
      ) : null}
      <div className="gestionale-cassa-complete-view__actions">
        <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--primary" onClick={onNewSale}>
          🛒 Nuova vendita
        </button>
        <button type="button" className="gestionale-cassa-btn" onClick={onGoDocuments}>
          📄 Vai ai documenti
        </button>
      </div>
    </div>
  )
}
