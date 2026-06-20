import type { Category, Product } from '../../types'

export type CategorySelection = {
  leafId: string
  categoryPath: string
  categoryId: string
  subcategoryId: string
  categoria: string
  sottocategoria: string
}

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

export function getRootCategoryId(catId: string, categories: Category[]): string {
  const cat = categories.find(c => c.id === catId)
  if (!cat) return catId
  if (!cat.parentId) return cat.id
  return getRootCategoryId(cat.parentId, categories)
}

export function computeCategoryLevel(catId: string, categories: Category[]): number {
  let level = 0
  let current = categories.find(c => c.id === catId)
  while (current?.parentId) {
    level += 1
    current = categories.find(c => c.id === current!.parentId)
  }
  return level
}

export function getProductLeafCategoryId(product: Pick<Product, 'categoryId' | 'subcategoryId'>): string {
  return product.subcategoryId || product.categoryId || ''
}

export function matchesProductCategoryTree(
  product: Pick<Product, 'categoryId' | 'subcategoryId'>,
  categoryTreeId: string | null,
  categories: Category[],
): boolean {
  if (!categoryTreeId) return true
  const ids = new Set(collectDescendantIds(categoryTreeId, categories))
  const leaf = getProductLeafCategoryId(product)
  if (leaf && ids.has(leaf)) return true
  return Boolean(product.categoryId && ids.has(product.categoryId))
}

export function resolveCategorySelection(leafId: string, categories: Category[]): CategorySelection | null {
  const cat = categories.find(c => c.id === leafId)
  if (!cat) return null
  const categoryPath = buildCategoryPath(leafId, categories)
  const rootId = getRootCategoryId(leafId, categories)
  const root = categories.find(c => c.id === rootId)
  const parts = categoryPath.split(' » ').map(s => s.trim()).filter(Boolean)
  return {
    leafId,
    categoryPath,
    categoryId: rootId,
    subcategoryId: leafId,
    categoria: root?.name || parts[0] || '',
    sottocategoria: parts.length > 1 ? parts[parts.length - 1] : '',
  }
}

export function getRootCategories(categories: Category[]): Category[] {
  return categories.filter(c => !c.parentId).sort((a, b) => a.order - b.order)
}

export function getChildCategories(categories: Category[], parentId: string): Category[] {
  return categories.filter(c => c.parentId === parentId).sort((a, b) => a.order - b.order)
}

export function getCategoryAncestorIds(leafId: string, categories: Category[]): string[] {
  const path: string[] = []
  let current = categories.find(c => c.id === leafId)
  while (current) {
    path.unshift(current.id)
    current = current.parentId ? categories.find(c => c.id === current!.parentId) : undefined
  }
  return path
}

export function countProductsInCategoryTree<T extends Pick<Product, 'categoryId' | 'subcategoryId'>>(
  categoryId: string,
  products: T[],
  categories: Category[],
): number {
  return products.filter(p => matchesProductCategoryTree(p, categoryId, categories)).length
}

export function flattenCategoriesForSelect(categories: Category[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = []
  const walk = (parentId: string | undefined, depth: number) => {
    const nodes = parentId ? getChildCategories(categories, parentId) : getRootCategories(categories)
    for (const node of nodes) {
      result.push({ id: node.id, label: `${'\u00a0'.repeat(depth * 2)}${node.name}` })
      walk(node.id, depth + 1)
    }
  }
  walk(undefined, 0)
  return result
}

export async function rebuildCategorySubtreePaths(
  catId: string,
  categories: Category[],
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>,
): Promise<void> {
  const path = buildCategoryPath(catId, categories)
  const cat = categories.find(c => c.id === catId)
  if (!cat) return
  const level = computeCategoryLevel(catId, categories)
  if (cat.path !== path || cat.level !== level) {
    await updateCategory(catId, { path, level })
    cat.path = path
    cat.level = level
  }
  for (const child of getChildCategories(categories, catId)) {
    await rebuildCategorySubtreePaths(child.id, categories, updateCategory)
  }
}
