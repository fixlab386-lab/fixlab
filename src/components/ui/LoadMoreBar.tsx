type Props = {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  label?: string
}

export default function LoadMoreBar({ hasMore, loading, onLoadMore, label }: Props) {
  if (!hasMore && !loading) return null

  return (
    <div className="gestionale-load-more">
      {loading ? (
        <span className="gestionale-load-more__hint">Caricamento record…</span>
      ) : hasMore ? (
        <button
          type="button"
          className="gestionale-load-more__btn"
          onClick={onLoadMore}
        >
          {label ?? 'Carica altri'}
        </button>
      ) : null}
    </div>
  )
}
