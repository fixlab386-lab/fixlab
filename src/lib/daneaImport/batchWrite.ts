import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { omitUndefined } from '../firestoreSanitize'
import {
  buildClientSearchTokens,
  buildProductSearchTokens,
  buildSupplierSearchTokens,
} from '../searchTokens'
import type { Client, DocRecord, Product, Supplier } from '../../types'

const BATCH_LIMIT = 450

export class ClientBatchWriter {
  private batch = writeBatch(db)
  private pending = 0

  async add(data: Omit<Client, 'id' | 'createdAt'>): Promise<string> {
    const ref = doc(collection(db, 'clients'))
    this.batch.set(ref, {
      ...omitUndefined(data),
      searchTokens: buildClientSearchTokens(data),
      createdAt: serverTimestamp(),
    })
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
    return ref.id
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return
    await this.batch.commit()
    this.batch = writeBatch(db)
    this.pending = 0
  }
}

export class SupplierBatchWriter {
  private batch = writeBatch(db)
  private pending = 0

  async add(data: Omit<Supplier, 'id' | 'createdAt'>): Promise<string> {
    const ref = doc(collection(db, 'suppliers'))
    this.batch.set(ref, {
      ...omitUndefined(data),
      searchTokens: buildSupplierSearchTokens(data),
      createdAt: serverTimestamp(),
    })
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
    return ref.id
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return
    await this.batch.commit()
    this.batch = writeBatch(db)
    this.pending = 0
  }
}

export class ProductBatchWriter {
  private batch = writeBatch(db)
  private pending = 0

  async add(data: Omit<Product, 'id' | 'createdAt'>): Promise<void> {
    const ref = doc(collection(db, 'products'))
    this.batch.set(ref, {
      ...omitUndefined(data),
      searchTokens: buildProductSearchTokens(data),
      createdAt: serverTimestamp(),
    })
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return
    await this.batch.commit()
    this.batch = writeBatch(db)
    this.pending = 0
  }
}

export class DocumentBatchWriter {
  private batch = writeBatch(db)
  private pending = 0

  async add(data: Omit<DocRecord, 'id' | 'createdAt'>): Promise<void> {
    const ref = doc(collection(db, 'documents'))
    this.batch.set(ref, {
      ...omitUndefined(data),
      createdAt: serverTimestamp(),
    })
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return
    await this.batch.commit()
    this.batch = writeBatch(db)
    this.pending = 0
  }
}

export const IMPORT_PROGRESS_EVERY = 250
