/**
 * Limiti Firestore per tenere l'app fluida con archivi molto grandi.
 * Mai caricare collezioni intere in memoria: finestra live + pagine on demand.
 */
/** Record più recenti sincronizzati in tempo reale (multi-dispositivo). */
export const FIRESTORE_LIVE_WINDOW = 300

/** Dimensione pagina per «Carica altri». */
export const FIRESTORE_PAGE_SIZE = 100

/** Risultati massimi ricerche / cataloghi compatti (cassa, dialog). */
export const FIRESTORE_SEARCH_LIMIT = 40

/** Soglia oltre cui avvisare che conviene affinare i filtri. */
export const FIRESTORE_SOFT_CAP = 2000
