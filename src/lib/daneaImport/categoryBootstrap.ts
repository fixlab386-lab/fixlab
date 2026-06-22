import type { Category } from '../../types'
import { addCategory, getCategories } from '../firestore'

function splitCategoryPath(raw: string): string[] {
  return raw
    .split(/»|>|\/|\\/)
    .map(part => part.trim())
    .filter(Boolean)
}

export async function ensureCategoryPath(
  studioId: string,
  rawPath: string,
  cache: Category[],
): Promise<{ categoryId: string; subcategoryId: string; categoryPath: string; categories: Category[] }> {
  const parts = splitCategoryPath(rawPath)
  if (!parts.length) {
    return { categoryId: '', subcategoryId: '', categoryPath: '', categories: cache }
  }

  let categories = cache
  let parentId: string | undefined
  let leafId = ''

  for (let i = 0; i < parts.length; i++) {
    const name = parts[i]
    const existing = categories.find(
      c => c.name.toLowerCase() === name.toLowerCase() && (c.parentId ?? '') === (parentId ?? ''),
    )
    if (existing) {
      leafId = existing.id
      parentId = existing.id
      continue
    }

    const siblings = categories.filter(c => (c.parentId ?? '') === (parentId ?? ''))
    const level = parentId ? (categories.find(c => c.id === parentId)?.level ?? 0) + 1 : 0
    const parentPath = parentId ? categories.find(c => c.id === parentId)?.path : ''
    const path = parentPath ? `${parentPath} » ${name}` : name
    const ref = await addCategory({
      studioId,
      name,
      emoji: '📦',
      parentId,
      level,
      path,
      order: siblings.length,
    })
    const created: Category = {
      id: ref.id,
      studioId,
      name,
      emoji: '📦',
      parentId,
      level,
      path,
      order: siblings.length,
      createdAt: new Date(),
    }
    categories = [...categories, created]
    leafId = created.id
    parentId = created.id
  }

  const rootId = categories.find(c => c.id === leafId)
    ? findRootId(leafId, categories)
    : leafId
  const categoryPath = categories.find(c => c.id === leafId)?.path ?? parts.join(' » ')
  return {
    categoryId: rootId,
    subcategoryId: leafId,
    categoryPath,
    categories,
  }
}

function findRootId(leafId: string, categories: Category[]): string {
  let current = categories.find(c => c.id === leafId)
  while (current?.parentId) {
    current = categories.find(c => c.id === current!.parentId)
  }
  return current?.id ?? leafId
}

export async function loadStudioCategories(studioId: string): Promise<Category[]> {
  return getCategories(studioId, 2000)
}
