/**
 * Limiti Firestore per tenere l'app fluida con archivi molto grandi.
 * Mai caricare collezioni intere in memoria: finestra live + pagine on demand.
 */
/** Finestra live sincronizzata in tempo reale (multi-dispositivo). */
export const FIRESTORE_LIVE_WINDOW = 300

/** Dimensione pagina per il caricamento dell'archivio completo. */
export const FIRESTORE_PAGE_SIZE = 200

/** Risultati massimi ricerche testuali mirate (dialog, cassa). */
export const FIRESTORE_SEARCH_LIMIT = 80
