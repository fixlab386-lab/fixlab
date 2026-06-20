import { useMemo } from 'react'
import type { Category } from '../../types'
import {
  getCategoryAncestorIds,
  getChildCategories,
  getRootCategories,
  resolveCategorySelection,
} from '../lib/categoryUtils'
import type { CategorySelection } from '../lib/categoryUtils'
import '../theme/category-tree.css'

type Props = {
  categories: Category[]
  leafId: string
  onChange: (selection: CategorySelection) => void
  onManage?: () => void
}

export default function CategoryCascadePicker({ categories, leafId, onChange, onManage }: Props) {
  const pathIds = useMemo(
    () => (leafId ? getCategoryAncestorIds(leafId, categories) : []),
    [leafId, categories],
  )

  const levels = useMemo(() => {
    const result: { label: string; parentId: string | undefined; selectedId: string; options: Category[] }[] = []
    let parentId: string | undefined = undefined

    for (let i = 0; i < Math.max(1, pathIds.length); i++) {
      const options = parentId ? getChildCategories(categories, parentId) : getRootCategories(categories)
      if (options.length === 0 && i > 0) break
      const selectedId = pathIds[i] ?? ''
      result.push({
        label: i === 0 ? 'Categoria' : 'Sottocategoria',
        parentId,
        selectedId,
        options,
      })
      if (!pathIds[i]) break
      parentId = pathIds[i]
    }

    const lastIdx = result.length - 1
    if (lastIdx >= 0 && pathIds[lastIdx]) {
      const children = getChildCategories(categories, pathIds[lastIdx])
      if (children.length > 0) {
        result.push({
          label: 'Sottocategoria',
          parentId: pathIds[lastIdx],
          selectedId: '',
          options: children,
        })
      }
    }

    return result
  }, [categories, pathIds])

  const pick = (levelIndex: number, id: string) => {
    if (!id) {
      if (levelIndex === 0) return
      const parentId = levels[levelIndex]?.parentId
      if (parentId) {
        const resolved = resolveCategorySelection(parentId, categories)
        if (resolved) onChange(resolved)
      }
      return
    }
    const resolved = resolveCategorySelection(id, categories)
    if (resolved) onChange(resolved)
  }

  return (
    <div className="category-cascade">
      {levels.map((level, i) => (
        <div key={`${level.label}-${i}`} className="prodotti-field">
          <label className="prodotti-field__label">{level.label}</label>
          <div className="category-cascade__row">
            <select
              className="prodotti-select prodotti-select--combo"
              value={level.selectedId}
              onChange={e => pick(i, e.target.value)}
            >
              {i > 0 ? <option value="">(Nessuna)</option> : <option value="">(Seleziona…)</option>}
              {level.options.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            {i === 0 && onManage ? (
              <button type="button" className="prodotti-btn-dots" title="Gestione categorie" onClick={onManage}>
                …
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {levels.length === 0 ? (
        <div className="prodotti-field">
          <label className="prodotti-field__label">Categoria</label>
          <div className="category-cascade__row">
            <select className="prodotti-select prodotti-select--combo" value="" disabled>
              <option value="">(Nessuna categoria)</option>
            </select>
            {onManage ? (
              <button type="button" className="prodotti-btn-dots" title="Gestione categorie" onClick={onManage}>
                …
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
