import CategoryTreeFilter from '../../components/CategoryTreeFilter'
import type { Category } from '../../../types'
import type { Prodotto } from './types'

type Props = {
  categories: Category[]
  prodotti: Prodotto[]
  categoryFilterId: string | null
  onCategoryFilter: (id: string | null) => void
  onAzzera: () => void
}

export default function ProdottiFiltriPanel({
  categories,
  prodotti,
  categoryFilterId,
  onCategoryFilter,
  onAzzera,
}: Props) {
  return (
    <div className="prodotti-filtri-panel" data-tutorial="magazzino-categories">
      <div className="prodotti-filtri-panel__header">
        <span>Filtra per categoria</span>
        {categoryFilterId ? (
          <button type="button" className="prodotti-link" onClick={onAzzera}>
            Azzera
          </button>
        ) : null}
      </div>
      <CategoryTreeFilter
        categories={categories}
        products={prodotti.map(p => ({
          categoryId: p.categoryId,
          subcategoryId: p.subcategoryId,
        }))}
        selectedId={categoryFilterId}
        onSelect={onCategoryFilter}
        className="prodotti-filtri-panel__tree"
      />
      <div className="prodotti-filtri-panel__actions">
        <button type="button" className="prodotti-dialog__btn" onClick={onAzzera}>
          Mostra tutti
        </button>
      </div>
    </div>
  )
}
