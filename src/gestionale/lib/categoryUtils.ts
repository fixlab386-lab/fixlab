import type { Category } from '../../types'

export function collectDescendantIds(catId: string, categories: Category[]): string[] {
  const children = categories.filter(c => c.parentId === catId)
  let ids = [catId]
  for (const child of children) ids = [...ids, ...collectDescendantIds(child.id, categories)]
  return ids
}

export function buildCategoryPath(catId: string, categories: Category[]): string {
  const cat = categories.find(c => c.id === catId)
  if (!cat) return ''
  if (cat.parentId) {
    const parentPath = buildCategoryPath(cat.parentId, categories)
    return parentPath ? `${parentPath} » ${cat.name}` : cat.name
  }
  return cat.name
}

export function getRootCategories(categories: Category[]): Category[] {
  return categories.filter(c => !c.parentId).sort((a, b) => a.order - b.order)
}

export function getChildCategories(categories: Category[], parentId: string): Category[] {
  return categories.filter(c => c.parentId === parentId).sort((a, b) => a.order - b.order)
}
