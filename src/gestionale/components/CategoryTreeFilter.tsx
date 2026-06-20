import { memo, useMemo, useState } from 'react'
import type { Category } from '../../types'
import {
  countProductsInCategoryTree,
  getChildCategories,
  getRootCategories,
} from '../lib/categoryUtils'
import '../theme/category-tree.css'

const CategoryTreeNode = memo(function CategoryTreeNode({
  category,
  categories,
  selectedId,
  depth,
  counts,
  onSelect,
}: {
  category: Category
  categories: Category[]
  selectedId: string | null
  depth: number
  counts: Map<string, number>
  onSelect: (id: string) => void
}) {
  const children = getChildCategories(categories, category.id)
  const hasChildren = children.length > 0
  const isSelected = selectedId === category.id
  const count = counts.get(category.id) ?? 0
  const [expanded, setExpanded] = useState(depth < 1)

  if (count === 0 && !hasChildren) return null

  return (
    <div>
      <div
        className={`category-tree__node${isSelected ? ' category-tree__node--active' : ''}`}
        style={{ paddingLeft: `${4 + depth * 14}px` }}
        onClick={() => onSelect(category.id)}
      >
        <button
          type="button"
          className="category-tree__toggle"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          onClick={e => {
            e.stopPropagation()
            setExpanded(v => !v)
          }}
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="category-tree__name">{category.name}</span>
        {count > 0 ? <span className="category-tree__count">{count}</span> : null}
      </div>
      {expanded
        ? children.map(child => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              categories={categories}
              selectedId={selectedId}
              depth={depth + 1}
              counts={counts}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  )
})

type ProductLike = { categoryId: string; subcategoryId?: string }

type Props<T extends ProductLike> = {
  categories: Category[]
  products: T[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  title?: string
  showAllOption?: boolean
  hideEmpty?: boolean
  className?: string
}

export default function CategoryTreeFilter<T extends ProductLike>({
  categories,
  products,
  selectedId,
  onSelect,
  title = 'Categorie',
  showAllOption = true,
  hideEmpty = true,
  className,
}: Props<T>) {
  const roots = useMemo(() => getRootCategories(categories), [categories])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const cat of categories) {
      const n = countProductsInCategoryTree(cat.id, products, categories)
      if (n > 0 || !hideEmpty) map.set(cat.id, n)
    }
    return map
  }, [categories, products, hideEmpty])

  const totalCount = products.length

  return (
    <div className={`category-tree${className ? ` ${className}` : ''}`}>
      {title ? <div className="category-tree__title">{title}</div> : null}
      {showAllOption ? (
        <button
          type="button"
          className={`category-tree__all${selectedId === null ? ' category-tree__all--active' : ''}`}
          onClick={() => onSelect(null)}
        >
          (Tutte le categorie)
          {totalCount > 0 ? <span className="category-tree__count">{totalCount}</span> : null}
        </button>
      ) : null}
      <div className="category-tree__body">
        {roots.map(root => (
          <CategoryTreeNode
            key={root.id}
            category={root}
            categories={categories}
            selectedId={selectedId}
            depth={0}
            counts={counts}
            onSelect={onSelect}
          />
        ))}
        {roots.length === 0 ? (
          <div className="category-tree__empty">Nessuna categoria. Usa «…» in scheda prodotto per crearne.</div>
        ) : null}
      </div>
    </div>
  )
}
