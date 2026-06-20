type Props = {
  hasMore: boolean
  loading: boolean
  truncated?: boolean
  onLoadMore: () => void
  label?: string
}

/**
 * Barra «Carica altri» disattivata: non mostriamo più alcun messaggio sui record
 * né il pulsante di caricamento storico in nessuna pagina.
 */
export default function LoadMoreBar(_props: Props) {
  return null
}
