"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMPORT_PROGRESS_EVERY = exports.AdminBatchWriter = void 0;
const firestore_1 = require("firebase-admin/firestore");
const BATCH_LIMIT = 450;
class AdminBatchWriter {
    db = (0, firestore_1.getFirestore)('fixlab');
    batch = this.db.batch();
    pending = 0;
    async set(collection, data, id) {
        const ref = id ? this.db.collection(collection).doc(id) : this.db.collection(collection).doc();
        this.batch.set(ref, data);
        this.pending++;
        if (this.pending >= BATCH_LIMIT)
            await this.flush();
        return ref.id;
    }
    async update(collection, id, data) {
        const ref = this.db.collection(collection).doc(id);
        this.batch.update(ref, data);
        this.pending++;
        if (this.pending >= BATCH_LIMIT)
            await this.flush();
    }
    async flush() {
        if (this.pending === 0)
            return;
        await this.batch.commit();
        this.batch = this.db.batch();
        this.pending = 0;
    }
}
exports.AdminBatchWriter = AdminBatchWriter;
exports.IMPORT_PROGRESS_EVERY = 250;
//# sourceMappingURL=batchWriter.js.map