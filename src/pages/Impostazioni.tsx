import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import { useOnboardingContext } from '../contexts/OnboardingContext'
import { useCookieConsent } from '../contexts/CookieConsentContext'
import EnterpriseConfigSection from '../gestionale/features/config/EnterpriseConfigSection'
import DesktopAppInfoSection from '../components/desktop/DesktopAppInfoSection'
import { db, storage, auth } from '../firebase'
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  limit,
  startAfter,
  Timestamp,
  DocumentReference,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  getBlob,
  getMetadata,
} from 'firebase/storage'
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth'
import { FormField, ToolButton } from '../components/ui'
import CapLookupPopup from '../components/anagrafica/assist/CapLookupPopup'
import { FEATURE_OPTIONS } from '../components/onboarding/constants'
import { DEFAULT_STUDIO_FEATURES } from '../lib/studioOnboarding'
import { fetchStudioCollectionForExport } from '../lib/firestorePagination'
import { backfillSearchTokens } from '../lib/searchBackfill'
import { logoutAndClearSession } from '../lib/logout'
import {
  DEFAULT_DISCLAIMER,
  DEFAULT_WA_TEMPLATE,
  settingsFormToFirestorePatch,
  studioDocToSettingsForm,
} from '../lib/studioSettings'
import { parseStudioArubaConfig, type StudioArubaPublicConfig } from '../lib/arubaInvoicing'
import { uploadStudioLogoFile } from '../lib/studioLogo'
import { WhatsAppConnectionPanel } from '../WhatsAppSetup'
import type { StudioFeatures } from '../types'
import OpzioniApplicazioneShell, { type OpzioniTabId } from '../components/settings/opzioni/OpzioniApplicazioneShell'
import TabModuli from '../components/settings/opzioni/TabModuli'
import TabAzienda from '../components/settings/opzioni/TabAzienda'
import TabClientiFornitori from '../components/settings/opzioni/TabClientiFornitori'
import TabProdotti from '../components/settings/opzioni/TabProdotti'
import TabDocumenti from '../components/settings/opzioni/TabDocumenti'
import TabFatturazioneElettronica from '../components/settings/opzioni/TabFatturazioneElettronica'
import TabAvvisi from '../components/settings/opzioni/TabAvvisi'
import TabAbbonamento from '../components/settings/opzioni/TabAbbonamento'
import TabVarie from '../components/settings/opzioni/TabVarie'
import {
  applicationOptionsToFirestore,
  defaultApplicationOptions,
  loadApplicationOptions,
  syncAppOptionsFromFeatures,
  syncFeaturesFromAppOptions,
  type ApplicationOptions,
} from '../lib/applicationOptions'
import '../theme/gestionale-settings.css'
import '../theme/gestionale-opzioni-applicazione.css'
import '../theme/gestionale-dialog.css'
import '../components/onboarding/onboarding.css'

const RT_MODELS = [
  { value: '', label: 'Seleziona modello...' },
  { value: 'epson_fp90', label: 'Epson FP-90III' },
  { value: 'epson_fp81', label: 'Epson FP-81II' },
  { value: 'custom_rt', label: 'Custom RT' },
  { value: 'custom_k3', label: 'Custom K3' },
  { value: 'ditron', label: 'Ditron' },
  { value: 'rch_print_f', label: 'RCH Print F' },
  { value: 'rch_nettuno', label: 'RCH Nettuno' },
  { value: 'axon', label: 'Axon RT' },
  { value: 'none', label: 'Non ho un RT' },
]

const TEMPLATE_VARS = [
  { var: '{{nome}}', desc: 'Nome del cliente' },
  { var: '{{dispositivo}}', desc: 'Marca e modello dispositivo' },
  { var: '{{telefono_negozio}}', desc: 'Telefono del negozio' },
  { var: '{{nome_negozio}}', desc: 'Nome del negozio' },
]

/** Checklist operativa: cosa controllare in laboratorio (stampa da browser se serve). */
const VERIFICA_SECTIONS: { title: string; subtitle: string; items: string[] }[] = [
  {
    title: 'Responsabile / Admin',
    subtitle: 'Configurazione studio e conformità di base.',
    items: [
      'Impostazioni → La mia officina: nome, indirizzo, P.IVA/CF, telefono e email corretti; logo visibile sui PDF.',
      'Impostazioni → Documenti e stampa: disclaimer e testi garanzia/piè coerenti con la pratica del laboratorio.',
      'Impostazioni → Documenti e stampa: modello RT e IP allineati al reale (o «Non ho un RT» se usi solo la macchina fiscale fisica).',
      'Impostazioni → Dati e backup: nome utente e prova export JSON (backup).',
      'Dashboard: KPI e scorte basse coerenti con il magazzino reale.',
      'Menu laterale: ricerca globale trova cliente, prodotto o riparazione con parole chiave note.',
    ],
  },
  {
    title: 'Tecnico / Riparazioni',
    subtitle: 'Flusso ticket e dati riparazione.',
    items: [
      'Riparazioni: filtri e ricerca; apertura scheda; stati e priorità salvano correttamente.',
      'Nuova riparazione: cliente, dispositivo, problema e totali; salvataggio e riapertura senza perdita dati.',
    ],
  },
  {
    title: 'Magazzino / acquisti',
    subtitle: 'Catalogo, codici e movimenti.',
    items: [
      'Categorie e prodotti: creazione, modifica, prezzi listino e giacenza.',
      'Barcode prodotto: campo ricerca Magazzino + lettore USB (codice lungo + Invio) oppure Â«ScansionaÂ» con fotocamera.',
      'Movimenti magazzino: carico/scarico registrato e riflesso sullo stock.',
      'Fornitori: anagrafica aggiornata se usata in documenti.',
    ],
  },
  {
    title: 'Cassa / amministrazione banco',
    subtitle: 'Vendite e documenti commerciali.',
    items: [
      'Cassa: aggiunta prodotti al carrello, totale, sconto, cliente; vendita di prova e controllo magazzino dopo scarico.',
      'Scontrino fiscale: se usi la macchina classica, verifica che corrisponda all\'importo in cassa; invio da app solo se avete configurato rete/bridge.',
      'Documenti: creazione preventivo/fattura (secondo i tipi che usate), salvataggio, PDF se previsto.',
      'Pagamenti: movimenti coerenti con incassi registrati a cassa o altrove.',
    ],
  },
  {
    title: 'Comunicazione e accessi',
    subtitle: 'Messaggi e sicurezza.',
    items: [
      'WhatsApp: template in Impostazioni e pagina `/impostazioni/whatsapp` se usate Evolution API.',
      'Logout e login da un secondo browser o profilo: stessi dati studio.',
      'Cookie: preferenze salvate e app utilizzabile dopo consenso.',
    ],
  },
  {
    title: 'Smoke test — pagina per pagina (URL)',
    subtitle:
      'Apri ogni percorso in ordine (menu o barra indirizzi). Segna OK se la schermata si carica senza schermata bianca/errore e le azioni base rispondono.',
    items: [
      '`/` Dashboard: caricamento, KPI, ultime riparazioni e scorte basse; almeno un click verso dettaglio.',
      '`/clienti` Elenco clienti, ricerca/filtri se presenti, apertura scheda o creazione bozza.',
      '`/fornitori` Elenco e modale o form fornitore senza errori in console critici.',
      '`/magazzino` Lista prodotti, ricerca, eventuale scansione/barcode; modifica giacenza o prodotto di prova.',
      '`/riparazioni` Lista-only: filtri, apertura ticket esistente da riga.',
      '`/riparazioni/nuova` Flusso nuovo ticket: cliente + dispositivo, salva e verifica che compaia in lista.',
      '`/riparazioni/{id}` Apri un ID reale dalla lista: dati coerenti, salvataggio campo di prova.',
      '`/documenti` Lista documenti; `/documenti/nuovo` creazione bozza; `/documenti/{id}` riapertura salvata.',
      '`/pagamenti` Lista e filtri periodo; totale coerente con righe visibili.',
      '`/movimenti` Movimenti magazzino: filtri e tabella popolata o stato vuoto gestito.',
      '`/cassa` Carrello: aggiunta articolo, totale, azione vendita/scontrino secondo la vostra procedura (anche annulla).',
      '`/impostazioni` Tutte le schede; salva su una scheda con campi e ricarica pagina.',
      '`/impostazioni/whatsapp` Solo se usate Evolution: QR/stato connessione senza crash.',
      '`/login` e `/register` (finestra anonima): form visibili, validazione messaggi, nessun errore JS bloccante.',
      '`/privacy` e `/cookie` testi leggibili da link footer o URL diretto.',
      '`/analytics` deve reindirizzare a `/` (vecchio segnalibro).',
    ],
  },
]

const TENANT_ROOT_COLLECTIONS = [
  'categories',
  'products',
  'repairs',
  'clients',
  'suppliers',
  'documents',
  'payments',
  'stockMovements',
  'devices',
] as const

const STUDIO_SUBCOLLECTIONS = [
  'clients', 'repairs', 'products', 'devices', 'invoices',
  'payments', 'suppliers', 'documents', 'inventory', 'categories',
]

function serializeForExport(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) return { _firestoreTimestamp: value.toDate().toISOString() }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof DocumentReference) return { _firestoreDocumentPath: value.path }
  if (Array.isArray(value)) return value.map(serializeForExport)
  if (typeof value === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      o[k] = serializeForExport(v)
    }
    return o
  }
  return value
}

async function deleteDocsFromQuery(q: Query<DocumentData>): Promise<number> {
  let total = 0
  const pageSize = 400
  let lastDoc: import('firebase/firestore').QueryDocumentSnapshot<DocumentData> | undefined
  for (;;) {
    const pageQ = lastDoc ? query(q, startAfter(lastDoc), limit(pageSize)) : query(q, limit(pageSize))
    const snap = await getDocs(pageQ)
    if (snap.empty) break
    let batch = writeBatch(db)
    let batchCount = 0
    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref)
      batchCount++
      total++
      if (batchCount >= pageSize) {
        await batch.commit()
        batch = writeBatch(db)
        batchCount = 0
      }
    }
    if (batchCount > 0) await batch.commit()
    if (snap.docs.length < pageSize) break
    lastDoc = snap.docs[snap.docs.length - 1]
  }
  return total
}

const EXPORT_ZIP_MAX_TOTAL_BYTES = 350 * 1024 * 1024
const EXPORT_ZIP_MAX_SINGLE_FILE_BYTES = 48 * 1024 * 1024

async function collectStorageFullPaths(storageRoot: string): Promise<string[]> {
  const paths: string[] = []
  const walk = async (p: string) => {
    const folderRef = ref(storage, p)
    try {
      const list = await listAll(folderRef)
      for (const item of list.items) paths.push(item.fullPath)
      for (const prefix of list.prefixes) await walk(prefix.fullPath)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'storage/object-not-found') console.warn('Storage list:', p, err)
    }
  }
  await walk(storageRoot)
  return paths
}

function storageRelativeToStudio(fullPath: string, studioId: string): string {
  const prefix = `studios/${studioId}/`
  return fullPath.startsWith(prefix) ? fullPath.slice(prefix.length) : fullPath
}

async function loadExportPayload(
  studioId: string,
  userId: string,
  onProgress?: (msg: string) => void,
) {
  const [userSnap, studioSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDoc(doc(db, 'studios', studioId)),
  ])
  const collections: Record<string, Array<{ id: string } & Record<string, unknown>>> = {}
  for (const name of TENANT_ROOT_COLLECTIONS) {
    onProgress?.(`Esportazione ${name}…`)
    const rows = await fetchStudioCollectionForExport(name, studioId, loaded => {
      onProgress?.(`${name}: ${loaded} record…`)
    })
    collections[name] = rows.map(r => {
      const { id, ...data } = r
      return { id, ...(serializeForExport(data) as Record<string, unknown>) }
    })
  }
  const storageFilePaths = await collectStorageFullPaths(`studios/${studioId}`)
  const payload: Record<string, unknown> = {
    meta: {
      app: 'FIXLab',
      formatVersion: 1,
      exportedAtISO: new Date().toISOString(),
      studioId,
    },
    user: userSnap.exists()
      ? { id: userSnap.id, ...(serializeForExport(userSnap.data()) as Record<string, unknown>) }
      : null,
    studio: studioSnap.exists()
      ? { id: studioSnap.id, ...(serializeForExport(studioSnap.data()) as Record<string, unknown>) }
      : null,
    collections,
    storageFilePaths,
    note:
      'Dati da Firestore in dati.json; i file binari sono in Firebase Storage (percorsi in storageFilePaths). Con l\'archivio ZIP, la cartella storage/ contiene una copia dei file scaricati.',
  }
  return { payload, storageFilePaths }
}

async function buildStudioExportZipBlob(params: {
  studioId: string
  payload: Record<string, unknown>
  storageFilePaths: string[]
  onProgress: (msg: string) => void
}): Promise<Blob> {
  const { studioId, payload, storageFilePaths, onProgress } = params
  onProgress('Caricamento modulo ZIP…')
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file(
    'LEGGIMI.txt',
    [
      'FIXLab — copia di sicurezza (archivio ZIP)',
      '',
      '• dati.json — dati da Firestore (anagrafiche, riparazioni, ecc.).',
      '• storage/ — copia dei file da Firebase Storage (foto, logo, allegati) se il download è riuscito.',
      '• storage_download_errors.json — presente solo in caso di errori o file esclusi per limiti di dimensione.',
      '',
      `Generato (UTC): ${new Date().toISOString()}`,
    ].join('\n'),
  )

  const errors: { path: string; reason: string }[] = []
  let totalBytes = 0
  let includedFileCount = 0
  const prefix = `studios/${studioId}/`

  for (let i = 0; i < storageFilePaths.length; i++) {
    const fullPath = storageFilePaths[i]
    onProgress(`Download file ${i + 1} di ${storageFilePaths.length}…`)
    if (!fullPath.startsWith(prefix)) {
      errors.push({ path: fullPath, reason: 'Percorso non ammesso' })
      continue
    }
    try {
      const sref = ref(storage, fullPath)
      const meta = await getMetadata(sref)
      const size = meta.size ?? 0
      if (size > EXPORT_ZIP_MAX_SINGLE_FILE_BYTES) {
        errors.push({
          path: fullPath,
          reason: `File oltre ${Math.round(EXPORT_ZIP_MAX_SINGLE_FILE_BYTES / 1024 / 1024)} MB (escluso dallo ZIP)`,
        })
        continue
      }
      if (totalBytes + size > EXPORT_ZIP_MAX_TOTAL_BYTES) {
        errors.push({
          path: fullPath,
          reason: 'Raggiunto il limite di dimensione totale dello ZIP; file successivi non inclusi',
        })
        break
      }
      const blob = await getBlob(sref)
      const rel = storageRelativeToStudio(fullPath, studioId)
      zip.file(`storage/${rel}`, blob)
      totalBytes += blob.size
      includedFileCount += 1
    } catch (e: unknown) {
      errors.push({ path: fullPath, reason: e instanceof Error ? e.message : 'Download non riuscito' })
    }
  }

  const prevMeta = (payload.meta as Record<string, unknown> | undefined) ?? {}
  const payloadOut = {
    ...payload,
    meta: {
      ...prevMeta,
      exportBundle: 'zip-with-storage',
      zip: {
        includedStorageBytes: totalBytes,
        limits: {
          maxTotalBytes: EXPORT_ZIP_MAX_TOTAL_BYTES,
          maxSingleFileBytes: EXPORT_ZIP_MAX_SINGLE_FILE_BYTES,
        },
        storageFilesListed: storageFilePaths.length,
        storageFilesDownloaded: includedFileCount,
        storageDownloadErrors: errors.length,
      },
    },
  }
  zip.file('dati.json', JSON.stringify(payloadOut, null, 2))
  if (errors.length > 0) {
    zip.file('storage_download_errors.json', JSON.stringify(errors, null, 2))
  }
  onProgress('Creazione archivio ZIP…')
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

export type ImpostazioniPanelProps = {
  onClose: () => void
  initialTab?: OpzioniTabId
}

export default function ImpostazioniPanel({ onClose, initialTab: initialTabProp }: ImpostazioniPanelProps) {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const { studioId, legacyStudioId, loading: studioLoading } = useActiveStudio()
  const { reopenOnboarding } = useOnboardingContext()
  const { consent, openSettings: openCookieSettings } = useCookieConsent()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState<OpzioniTabId>(() => initialTabProp ?? 'moduli')
  const [showCapPopup, setShowCapPopup] = useState(false)
  const [appOptions, setAppOptions] = useState<ApplicationOptions>(() => defaultApplicationOptions())
  const [arubaConfig, setArubaConfig] = useState<StudioArubaPublicConfig>({})

  useEffect(() => {
    if (initialTabProp) setActiveTab(initialTabProp)
  }, [initialTabProp])

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteProgress, setDeleteProgress] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportMode, setExportMode] = useState<'idle' | 'json' | 'zip'>('idle')
  const [exportError, setExportError] = useState('')
  const [exportProgress, setExportProgress] = useState('')
  const [indexingSearch, setIndexingSearch] = useState(false)
  const [indexSearchProgress, setIndexSearchProgress] = useState('')
  const [indexSearchError, setIndexSearchError] = useState('')

  const [shopName, setShopName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [cap, setCap] = useState('')
  const [phone, setPhone] = useState('')
  const [cellPhone, setCellPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [fiscalCode, setFiscalCode] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [features, setFeatures] = useState<StudioFeatures>({ ...DEFAULT_STUDIO_FEATURES })
  const [rtModel, setRtModel] = useState('')
  const [rtIp, setRtIp] = useState('')
  const [warrantyText, setWarrantyText] = useState('Garanzia 90 giorni sulla riparazione.')
  const [footerText, setFooterText] = useState('Grazie per aver scelto il nostro servizio!')
  const [disclaimer, setDisclaimer] = useState(DEFAULT_DISCLAIMER)
  const [userName, setUserName] = useState('')
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE)

  useEffect(() => {
    if (studioLoading || !userProfile?.id) return

    if (!studioId) {
      setLoading(false)
      setLoadError('Nessun archivio selezionato.')
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError('')

    void (async () => {
      try {
        const snap = await getDoc(doc(db, 'studios', studioId))
        if (cancelled) return

        if (snap.exists()) {
          const data = snap.data()
          const loaded = studioDocToSettingsForm(data, userProfile.email || '')
          setShopName(loaded.shopName)
          setSubtitle(loaded.subtitle)
          setAddress(loaded.address)
          setCity(loaded.city)
          setProvince(loaded.province)
          setCap(loaded.cap)
          setPhone(loaded.phone)
          setCellPhone(loaded.cellPhone)
          setEmail(loaded.email)
          setWebsite(loaded.website)
          setVatNumber(loaded.vatNumber)
          setFiscalCode(loaded.fiscalCode)
          setLogoUrl(loaded.logoUrl)
          setRtModel(loaded.rtModel)
          setRtIp(loaded.rtIp)
          setWarrantyText(loaded.warrantyText)
          setFooterText(loaded.footerText)
          setDisclaimer(loaded.disclaimer)
          setWaTemplate(loaded.waTemplate)
          setFeatures(loaded.features)
          const opts = syncAppOptionsFromFeatures(loadApplicationOptions(data), loaded.features)
          if (loaded.cellPhone && !opts.azienda.phone2) {
            opts.azienda.phone2 = loaded.cellPhone
          }
          setAppOptions(opts)
          setArubaConfig(parseStudioArubaConfig(data))
        } else {
          setLoadError('Dati officina non trovati per questo archivio.')
        }

        setUserName(userProfile.name || '')
      } catch {
        if (!cancelled) setLoadError('Impossibile caricare le impostazioni.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [studioId, studioLoading, userProfile?.id, userProfile?.email, userProfile?.name])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !studioId) return
    setUploadingLogo(true)
    try {
      const url = await uploadStudioLogoFile(studioId, file)
      setLogoUrl(url)
      await updateDoc(doc(db, 'studios', studioId), { logoUrl: url })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore caricamento logo')
    }
    setUploadingLogo(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!studioId || !userProfile?.id) return
    if (!shopName.trim()) {
      setSaveError('Inserisci la denominazione dell\'officina prima di salvare.')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      const syncedFeatures: StudioFeatures = {
        ...features,
        ...syncFeaturesFromAppOptions(appOptions, features),
        whatsapp: appOptions.moduli.ecommerce,
      }
      const appOptionsToSave: ApplicationOptions = {
        ...appOptions,
        azienda: {
          ...appOptions.azienda,
          phone2: appOptions.azienda.phone2 || cellPhone,
        },
      }
      await updateDoc(
        doc(db, 'studios', studioId),
        {
          ...settingsFormToFirestorePatch({
            shopName,
            subtitle,
            address,
            city,
            province,
            cap,
            phone,
            cellPhone: appOptionsToSave.azienda.phone2 || cellPhone,
            email,
            website,
            vatNumber,
            fiscalCode,
            logoUrl,
            features: syncedFeatures,
            rtModel,
            rtIp,
            warrantyText,
            footerText,
            disclaimer,
            waTemplate,
          }),
          ...applicationOptionsToFirestore(appOptionsToSave),
        },
      )
      setFeatures(syncedFeatures)
      await updateDoc(doc(db, 'users', userProfile.id), { name: userName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Salvataggio non riuscito. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!studioId || !userProfile?.id) return
    setExporting(true)
    setExportMode('json')
    setExportError('')
    setExportProgress('Lettura dati…')
    try {
      const { payload } = await loadExportPayload(studioId, userProfile.id, msg => setExportProgress(msg))
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fixlab-dati-${studioId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Esportazione non riuscita')
    } finally {
      setExportProgress('')
      setExportMode('idle')
      setExporting(false)
    }
  }

  const handleIndexSearch = async () => {
    if (!studioId) return
    setIndexingSearch(true)
    setIndexSearchError('')
    setIndexSearchProgress('Indicizzazione prodotti…')
    try {
      const counts = await backfillSearchTokens(studioId, ({ collection, updated }) => {
        const label =
          collection === 'products' ? 'prodotti' : collection === 'clients' ? 'clienti' : 'fornitori'
        setIndexSearchProgress(`Indicizzazione ${label}: ${updated} record…`)
      })
      setIndexSearchProgress(
        `Completato: ${counts.products} prodotti, ${counts.clients} clienti, ${counts.suppliers} fornitori.`,
      )
    } catch (e: unknown) {
      setIndexSearchError(e instanceof Error ? e.message : 'Indicizzazione non riuscita')
      setIndexSearchProgress('')
    } finally {
      setIndexingSearch(false)
    }
  }

  const handleExportZip = async () => {
    if (!studioId || !userProfile?.id) return
    setExporting(true)
    setExportMode('zip')
    setExportError('')
    setExportProgress('')
    try {
      setExportProgress('Lettura dati…')
      const { payload, storageFilePaths } = await loadExportPayload(studioId, userProfile.id, msg =>
        setExportProgress(msg),
      )
      const zipBlob = await buildStudioExportZipBlob({
        studioId,
        payload,
        storageFilePaths,
        onProgress: msg => setExportProgress(msg),
      })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fixlab-archivio-${studioId}-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Creazione ZIP non riuscita')
    } finally {
      setExportProgress('')
      setExportMode('idle')
      setExporting(false)
    }
  }

  const deleteStorageFolder = async (path: string) => {
    try {
      const folderRef = ref(storage, path)
      const list = await listAll(folderRef)
      for (const item of list.items) {
        await deleteObject(item)
      }
      for (const prefix of list.prefixes) {
        await deleteStorageFolder(prefix.fullPath)
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'storage/object-not-found') {
        console.warn('Errore eliminazione storage:', path, err)
      }
    }
  }

  const deleteSubcollection = async (studioId: string, subcollectionName: string) => {
    const colRef = collection(db, 'studios', studioId, subcollectionName)
    return deleteDocsFromQuery(query(colRef))
  }

  const handleDeleteAccount = async () => {
    if (!studioId || !auth.currentUser || !userProfile) return
    if (deleteConfirmText !== 'ELIMINA') return

    setDeleting(true)
    setDeleteError('')

    try {
      setDeleteProgress('Verifica credenziali...')
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      setDeleteProgress('Eliminazione dati operativi...')
      const deleteStudioId = legacyStudioId
      for (const col of TENANT_ROOT_COLLECTIONS) {
        setDeleteProgress(`Eliminazione ${col}...`)
        await deleteDocsFromQuery(query(collection(db, col), where('studioId', '==', deleteStudioId)))
      }

      for (const sub of STUDIO_SUBCOLLECTIONS) {
        setDeleteProgress(`Eliminazione legacy ${sub}...`)
        await deleteSubcollection(deleteStudioId, sub)
      }

      setDeleteProgress('Eliminazione file...')
      await deleteStorageFolder(`studios/${deleteStudioId}`)

      setDeleteProgress('Eliminazione studio...')
      await deleteDoc(doc(db, 'studios', deleteStudioId))

      setDeleteProgress('Eliminazione profilo utente...')
      await deleteDoc(doc(db, 'users', userProfile.id))

      setDeleteProgress('Eliminazione account...')
      await deleteUser(auth.currentUser)
    } catch (err: unknown) {
      console.error('Errore eliminazione account:', err)
      const code = (err as { code?: string })?.code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Password errata. Riprova.')
      } else if (code === 'auth/too-many-requests') {
        setDeleteError('Troppi tentativi. Riprova tra qualche minuto.')
      } else {
        setDeleteError(`Errore: ${err instanceof Error ? err.message : 'Qualcosa è andato storto'}`)
      }
      setDeleting(false)
      setDeleteProgress('')
    }
  }

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    setDeleteStep(1)
    setDeletePassword('')
    setDeleteConfirmText('')
    setDeleteError('')
    setDeleteProgress('')
    setDeleting(false)
  }

  const handleLogout = async () => {
    await logoutAndClearSession()
    onClose?.()
    navigate('/login')
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setShowDeleteModal(false)
  }

  const previewMessage = waTemplate
    .replace('{{nome}}', 'Mario Rossi')
    .replace('{{dispositivo}}', 'Apple iPhone 14 Pro')
    .replace('{{telefono_negozio}}', phone || cellPhone || '+39 02 1234567')
    .replace('{{nome_negozio}}', shopName || 'TechFix Milano')

  const roleLabel =
    userProfile?.role === 'admin' ? 'Amministratore' : userProfile?.role === 'technician' ? 'Tecnico' : 'Cassiere'

  const patchModuli = (patch: Partial<ApplicationOptions['moduli']>) => {
    setAppOptions(prev => {
      const moduli = { ...prev.moduli, ...patch }
      setFeatures(f => ({
        ...f,
        warehouse: moduli.magazzinoGestione,
        pos: moduli.venditaTouchscreen,
        rtPrinter: moduli.registratoreCassa,
        whatsapp: moduli.ecommerce,
      }))
      return { ...prev, moduli }
    })
  }

  const patchAzienda = (patch: Partial<Parameters<typeof TabAzienda>[0]>) => {
    if ('shopName' in patch && patch.shopName !== undefined) setShopName(patch.shopName)
    if ('subtitle' in patch && patch.subtitle !== undefined) setSubtitle(patch.subtitle)
    if ('address' in patch && patch.address !== undefined) setAddress(patch.address)
    if ('cap' in patch && patch.cap !== undefined) setCap(patch.cap)
    if ('city' in patch && patch.city !== undefined) setCity(patch.city)
    if ('province' in patch && patch.province !== undefined) setProvince(patch.province)
    if ('fiscalCode' in patch && patch.fiscalCode !== undefined) setFiscalCode(patch.fiscalCode)
    if ('vatNumber' in patch && patch.vatNumber !== undefined) setVatNumber(patch.vatNumber)
    if ('website' in patch && patch.website !== undefined) setWebsite(patch.website)
    if ('phone' in patch && patch.phone !== undefined) setPhone(patch.phone)
    if ('email' in patch && patch.email !== undefined) setEmail(patch.email)
    if ('phone2' in patch && patch.phone2 !== undefined) {
      setCellPhone(patch.phone2)
      setAppOptions(prev => ({ ...prev, azienda: { ...prev.azienda, phone2: patch.phone2! } }))
      return
    }
    if ('phone3' in patch || 'fax' in patch || 'pec' in patch || 'nation' in patch || 'regImprese' in patch || 'altro' in patch) {
      setAppOptions(prev => ({
        ...prev,
        azienda: {
          ...prev.azienda,
          ...(patch.phone3 !== undefined ? { phone3: patch.phone3 } : {}),
          ...(patch.fax !== undefined ? { fax: patch.fax } : {}),
          ...(patch.pec !== undefined ? { pec: patch.pec } : {}),
          ...(patch.nation !== undefined ? { nation: patch.nation } : {}),
          ...(patch.regImprese !== undefined ? { regImprese: patch.regImprese } : {}),
          ...(patch.altro !== undefined ? { altro: patch.altro } : {}),
        },
      }))
    }
  }

  const saveButtonLabel = saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva'

  if (loading || studioLoading) {
    return createPortal(
      <div
        className="opzioni-backdrop gestionale-theme"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="opzioni-window" role="dialog" aria-labelledby="opzioni-title" onClick={e => e.stopPropagation()}>
          <div className="opzioni-window__loading">Caricamento impostazioni…</div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <>
      <div
        className="opzioni-backdrop gestionale-theme"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div
          className="opzioni-window"
          role="dialog"
          aria-labelledby="opzioni-title"
          data-tutorial="page-impostazioni"
          onClick={e => e.stopPropagation()}
        >
          {loadError ? (
            <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ margin: 12 }}>
              {loadError}
            </div>
          ) : null}

          <OpzioniApplicazioneShell
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={onClose}
            onHelp={() => alert('Guida Opzioni applicazione FixLab — consulta la documentazione in-app.')}
            footer={
              <>
                <button type="button" className="opzioni-btn" onClick={onClose}>
                  Chiudi
                </button>
              {(saveError || saved) && (
                <span
                  className="opzioni-save-status"
                  style={{ fontSize: 11, color: saveError ? '#c00' : '#080' }}
                >
                  {saveError || 'Modifiche salvate.'}
                </span>
              )}
              <button
                type="button"
                className="opzioni-btn"
                disabled={saving || Boolean(loadError)}
                onClick={() => void handleSave()}
              >
                {saveButtonLabel}
              </button>
            </>
          }
        >
          {activeTab === 'moduli' && (
            <>
              <TabModuli
                value={appOptions.moduli}
                onChange={patchModuli}
                onUtenti={() => alert('Gestione utenti — in arrivo.')}
                onConfiguraVendita={reopenOnboarding}
              />
              <details className="opzioni-advanced-block" open>
                <summary>Moduli FixLab e configurazione avanzata</summary>
                <div className="gestionale-onboarding-check-list" style={{ marginTop: 8 }}>
                  {FEATURE_OPTIONS.map(opt => (
                    <label key={opt.key} className="gestionale-onboarding-check">
                      <input
                        type="checkbox"
                        checked={features[opt.key]}
                        onChange={e => setFeatures(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <EnterpriseConfigSection />
              </details>
            </>
          )}

          {activeTab === 'azienda' && (
            <>
              <TabAzienda
                shopName={shopName}
                subtitle={subtitle}
                address={address}
                nation={appOptions.azienda.nation}
                cap={cap}
                city={city}
                province={province}
                fiscalCode={fiscalCode}
                vatNumber={vatNumber}
                regImprese={appOptions.azienda.regImprese}
                website={website}
                altro={appOptions.azienda.altro}
                phone={phone}
                phone2={appOptions.azienda.phone2 || cellPhone}
                phone3={appOptions.azienda.phone3}
                fax={appOptions.azienda.fax}
                email={email}
                pec={appOptions.azienda.pec}
                logoUrl={logoUrl}
                uploadingLogo={uploadingLogo}
                onChange={patchAzienda}
                onLogoUpload={handleLogoUpload}
                onDeleteLogo={() => setLogoUrl('')}
                onCapLookup={() => setShowCapPopup(true)}
              />
              <div style={{ marginTop: 12 }}>
                <ToolButton label="Riapri configurazione guidata" onClick={reopenOnboarding} />
              </div>
            </>
          )}

          {activeTab === 'clienti' && (
            <TabClientiFornitori
              value={appOptions.clienti}
              onChange={patch => setAppOptions(prev => ({ ...prev, clienti: { ...prev.clienti, ...patch } }))}
            />
          )}

          {activeTab === 'prodotti' && (
            <TabProdotti
              value={appOptions.prodotti}
              onChange={patch => setAppOptions(prev => ({ ...prev, prodotti: { ...prev.prodotti, ...patch } }))}
            />
          )}

          {activeTab === 'documenti' && (
            <>
              <TabDocumenti
                value={appOptions.documenti}
                onChange={patch =>
                  setAppOptions(prev => ({
                    ...prev,
                    documenti: {
                      ...prev.documenti,
                      ...patch,
                      tipi: patch.tipi ? { ...prev.documenti.tipi, ...patch.tipi } : prev.documenti.tipi,
                    },
                  }))
                }
                disclaimer={disclaimer}
                onDisclaimerChange={setDisclaimer}
                rtModel={rtModel}
                rtIp={rtIp}
                onRtModelChange={setRtModel}
                onRtIpChange={setRtIp}
                rtModels={RT_MODELS}
                studioPreview={{
                  name: shopName,
                  subtitle,
                  address,
                  city,
                  province,
                  cap,
                  nation: appOptions.azienda.nation,
                  vatNumber,
                  phone,
                  cellPhone,
                  email,
                  logoUrl,
                  disclaimer,
                }}
              />
              <details className="opzioni-advanced-block">
                <summary>Testi scheda riparazione e piè di pagina</summary>
                <div className="opzioni-tab-panel" style={{ marginTop: 8 }}>
                  <div className="opzioni-field-row">
                    <label className="opzioni-field-row__label">Testo garanzia</label>
                    <input className="opzioni-input" value={warrantyText} onChange={e => setWarrantyText(e.target.value)} />
                  </div>
                  <div className="opzioni-field-row">
                    <label className="opzioni-field-row__label">Piè di pagina</label>
                    <input className="opzioni-input" value={footerText} onChange={e => setFooterText(e.target.value)} />
                  </div>
                  <ToolButton label="↺ Ripristina disclaimer default" onClick={() => setDisclaimer(DEFAULT_DISCLAIMER)} />
                </div>
              </details>
            </>
          )}

          {activeTab === 'fatturazione' && studioId ? (
            <TabFatturazioneElettronica
              studioId={studioId}
              config={arubaConfig}
              onConfigChange={patch => setArubaConfig(prev => ({ ...prev, ...patch }))}
            />
          ) : null}

          {activeTab === 'avvisi' && (
            <TabAvvisi
              value={appOptions.avvisi}
              onChange={(id, enabled) =>
                setAppOptions(prev => ({ ...prev, avvisi: { ...prev.avvisi, [id]: enabled } }))
              }
            />
          )}

          {activeTab === 'abbonamento' && <TabAbbonamento />}

          {activeTab === 'varie' && (
            <TabVarie
              value={appOptions.varie}
              onChange={patch => setAppOptions(prev => ({ ...prev, varie: { ...prev.varie, ...patch } }))}
              extraSections={
                <>
                  <details className="opzioni-advanced-block" open>
                    <summary>WhatsApp</summary>
                    <div className="gestionale-settings-section" style={{ marginTop: 8 }}>
                      <p className="gestionale-settings-section__hint">
                        Template messaggio riparazione pronta. Pagina dedicata:{' '}
                        <Link to="/impostazioni/whatsapp">/impostazioni/whatsapp</Link>
                      </p>
                      <div className="gestionale-settings-var-chips">
                        {TEMPLATE_VARS.map(v => (
                          <button
                            key={v.var}
                            type="button"
                            className="gestionale-settings-var-chip"
                            title={v.desc}
                            onClick={() => setWaTemplate(t => t + v.var)}
                          >
                            {v.var}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="opzioni-textarea"
                        value={waTemplate}
                        onChange={e => setWaTemplate(e.target.value)}
                        rows={6}
                      />
                      <ToolButton label="↺ Ripristina default" onClick={() => setWaTemplate(DEFAULT_WA_TEMPLATE)} />
                      <div className="gestionale-settings-preview gestionale-settings-preview--wa" style={{ marginTop: 8 }}>
                        {previewMessage}
                      </div>
                      <WhatsAppConnectionPanel compact />
                    </div>
                  </details>

                  <details className="opzioni-advanced-block">
                    <summary>Dati, backup e account</summary>
                    <div style={{ marginTop: 8 }}>
                      <DesktopAppInfoSection />
                      <div className="opzioni-field-row" style={{ marginTop: 12 }}>
                        <label className="opzioni-field-row__label">Il tuo nome</label>
                        <input className="opzioni-input" value={userName} onChange={e => setUserName(e.target.value)} />
                      </div>
                      <div className="opzioni-field-row">
                        <label className="opzioni-field-row__label">E-mail</label>
                        <input className="opzioni-input" value={userProfile?.email || ''} disabled />
                      </div>
                      <div className="opzioni-field-row">
                        <label className="opzioni-field-row__label">Ruolo</label>
                        <input className="opzioni-input" value={roleLabel} disabled />
                      </div>
                      {exportProgress ? <p className="gestionale-settings-section__hint">{exportProgress}</p> : null}
                      {exportError ? (
                        <div className="gestionale-settings-info-box gestionale-settings-info-box--danger">{exportError}</div>
                      ) : null}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <ToolButton
                          label={exporting && exportMode === 'json' ? 'Esportazione…' : 'Scarica JSON'}
                          onClick={handleExportData}
                          disabled={exporting}
                        />
                        <ToolButton
                          label={exporting && exportMode === 'zip' ? 'Esportazione…' : 'Scarica ZIP (JSON + file)'}
                          onClick={handleExportZip}
                          disabled={exporting}
                        />
                      </div>
                      <p className="gestionale-settings-section__hint" style={{ marginTop: 12 }}>
                        Ricerca catalogo: indicizza prodotti, clienti e fornitori per trovare record anche molto vecchi
                        (consigliato una volta dopo l&apos;aggiornamento, poi automatico su ogni salvataggio).
                      </p>
                      {indexSearchProgress ? (
                        <p className="gestionale-settings-section__hint">{indexSearchProgress}</p>
                      ) : null}
                      {indexSearchError ? (
                        <div className="gestionale-settings-info-box gestionale-settings-info-box--danger">{indexSearchError}</div>
                      ) : null}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <ToolButton
                          label={indexingSearch ? 'Indicizzazione…' : 'Indicizza ricerca catalogo'}
                          onClick={() => void handleIndexSearch()}
                          disabled={indexingSearch || exporting}
                        />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        <ToolButton label="Esci e torna al login" onClick={() => void handleLogout()} />
                      </div>
                      <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginTop: 12 }}>
                        Eliminando il tuo account verranno cancellati permanentemente tutti i dati. Azione irreversibile.
                      </div>
                      <ToolButton label="Elimina account e tutti i dati" variant="danger" onClick={openDeleteModal} />
                    </div>
                  </details>

                  <details className="opzioni-advanced-block" data-tutorial="impostazioni-verifica">
                    <summary>Checklist di verifica</summary>
                    <div style={{ marginTop: 8 }}>
                      <ToolButton label="Apri finestra di stampa" onClick={() => window.print()} style={{ marginBottom: 12 }} />
                      {VERIFICA_SECTIONS.map(sec => (
                        <div key={sec.title} className="gestionale-settings-checklist-block">
                          <div className="gestionale-settings-checklist-block__title">{sec.title}</div>
                          <div className="gestionale-settings-checklist-block__subtitle">{sec.subtitle}</div>
                          <ul>
                            {sec.items.map((item, i) => (
                              <li key={`${sec.title}-${i}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="opzioni-advanced-block">
                    <summary>Legale e privacy</summary>
                    <div className="gestionale-settings-legal-links" style={{ marginTop: 8 }}>
                      <div className="gestionale-settings-legal-card">
                        <div className="gestionale-settings-legal-card__text">
                          <strong>Informativa privacy</strong>
                        </div>
                        <Link to="/privacy" className="gestionale-tool-btn" style={{ textDecoration: 'none' }}>
                          Apri
                        </Link>
                      </div>
                      <div className="gestionale-settings-legal-card">
                        <div className="gestionale-settings-legal-card__text">
                          <strong>Cookie policy</strong>
                        </div>
                        <Link to="/cookie" className="gestionale-tool-btn" style={{ textDecoration: 'none' }}>
                          Apri
                        </Link>
                      </div>
                      <div className="gestionale-settings-legal-card">
                        <div className="gestionale-settings-legal-card__text">
                          <strong>Preferenze cookie</strong>
                          {consent
                            ? `Salvate il ${new Date(consent.savedAt).toLocaleString('it-IT')}.`
                            : 'Non ancora impostate.'}
                        </div>
                        <ToolButton label="Gestisci" onClick={openCookieSettings} />
                      </div>
                    </div>
                  </details>
                </>
              }
            />
          )}
        </OpzioniApplicazioneShell>
        </div>
      </div>
      {showCapPopup ? (
        <CapLookupPopup
          initialCap={cap}
          initialCitta={city}
          initialProvincia={province}
          onClose={() => setShowCapPopup(false)}
          onApply={record => {
            setCap(record.cap)
            setCity(record.citta)
            setProvince(record.provincia)
            setShowCapPopup(false)
          }}
        />
      ) : null}

      {showDeleteModal ? (
        <div
          className="gestionale-dialog-overlay gestionale-theme"
          onClick={e => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div className="gestionale-dialog-card" role="dialog" onClick={e => e.stopPropagation()}>
            <header className="gestionale-dialog-card__header">
              <h2 className="gestionale-dialog-card__title">Elimina account</h2>
            </header>
            <div className="gestionale-dialog-card__body">
              {deleteStep === 1 && !deleting ? (
                <>
                  <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginTop: 0 }}>
                    Verranno eliminati permanentemente:
                    <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                      {[
                        'Tutti i dati del negozio',
                        'Clienti e anagrafica',
                        'Riparazioni e storico',
                        'Prodotti e magazzino',
                        'Documenti e fatture',
                        'Pagamenti',
                        'File e logo caricati',
                        'Il tuo account utente',
                      ].map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}

              {deleteStep === 2 && !deleting ? (
                <>
                  <p className="gestionale-settings-section__hint" style={{ marginTop: 0 }}>
                    Per confermare, inserisci la password e scrivi ELIMINA
                  </p>
                  {deleteError ? (
                    <div className="gestionale-settings-info-box gestionale-settings-info-box--danger">{deleteError}</div>
                  ) : null}
                  <div className="gestionale-dialog-form-stack">
                    <FormField label="Password" htmlFor="del-pw">
                      <input
                        id="del-pw"
                        type="password"
                        className="gestionale-form-field__input"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        autoFocus
                      />
                    </FormField>
                    <FormField label='Scrivi "ELIMINA"' htmlFor="del-confirm">
                      <input
                        id="del-confirm"
                        className="gestionale-form-field__input"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                        placeholder="ELIMINA"
                      />
                    </FormField>
                  </div>
                </>
              ) : null}

              {deleting ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>ðŸ—‘ï¸</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Eliminazione in corso…</div>
                  <div style={{ fontSize: 12, color: 'var(--gestionale-text-muted)' }}>{deleteProgress}</div>
                  <div style={{ fontSize: 11, color: 'var(--gestionale-text-muted)', marginTop: 10 }}>Non chiudere questa pagina</div>
                </div>
              ) : null}
            </div>
            <footer className="gestionale-dialog-card__footer">
              {deleteStep === 1 && !deleting ? (
                <>
                  <button type="button" className="gestionale-dialog-btn" onClick={closeDeleteModal}>
                    Annulla
                  </button>
                  <button type="button" className="gestionale-dialog-btn gestionale-dialog-btn--primary" onClick={() => setDeleteStep(2)}>
                    Procedi
                  </button>
                </>
              ) : null}
              {deleteStep === 2 && !deleting ? (
                <>
                  <button
                    type="button"
                    className="gestionale-dialog-btn"
                    onClick={() => {
                      setDeleteStep(1)
                      setDeleteError('')
                    }}
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    className="gestionale-dialog-btn gestionale-dialog-btn--primary"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'ELIMINA' || !deletePassword}
                  >
                    Elimina definitivamente
                  </button>
                </>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  )
}
