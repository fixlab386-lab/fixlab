import { getFirestore, type DocumentData } from 'firebase-admin/firestore'

const BATCH_LIMIT = 450

export class AdminBatchWriter {
  private db = getFirestore('fixlab')
  private batch = this.db.batch()
  private pending = 0

  async set(collection: string, data: DocumentData, id?: string): Promise<string> {
    const ref = id ? this.db.collection(collection).doc(id) : this.db.collection(collection).doc()
    this.batch.set(ref, data)
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
    return ref.id
  }

  async update(collection: string, id: string, data: DocumentData): Promise<void> {
    const ref = this.db.collection(collection).doc(id)
    this.batch.update(ref, data)
    this.pending++
    if (this.pending >= BATCH_LIMIT) await this.flush()
  }

  async flush(): Promise<void> {
    if (this.pending === 0) return
    await this.batch.commit()
    this.batch = this.db.batch()
    this.pending = 0
  }
}

export const IMPORT_PROGRESS_EVERY = 250
