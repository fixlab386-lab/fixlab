import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import {
  DEFAULT_DISCLAIMER,
  DEFAULT_WA_TEMPLATE,
  settingsFormToFirestorePatch,
  studioDocToSettingsForm,
} from '../lib/studioSettings'
import { uploadStudioLogoFile } from '../lib/studioLogo'
import { WhatsAppConnectionPanel } from '../WhatsAppSetup'
import type { StudioFeatures } from '../types'
import '../theme/gestionale-settings.css'
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

type SettingsTab = 'officina' | 'moduli' | 'documenti' | 'whatsapp' | 'dati' | 'legale'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'officina', label: 'La mia officina' },
  { key: 'moduli', label: 'Moduli / Funzionalità' },
  { key: 'documenti', label: 'Documenti e stampa' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'dati', label: 'Dati e backup' },
  { key: 'legale', label: 'Legale / Privacy' },
]

const SAVE_TABS: SettingsTab[] = ['officina', 'moduli', 'documenti', 'whatsapp']

const TAB_PANELS: Record<SettingsTab, { title: string; hint: string }> = {
  officina: {
    title: 'La mia officina',
    hint: 'Dati anagrafici e logo che compaiono su documenti, PDF e comunicazioni ai clienti.',
  },
  moduli: {
    title: 'Moduli e funzionalità',
    hint: 'Attiva o disattiva le sezioni del gestionale e configura agenti, magazzini e listini.',
  },
  documenti: {
    title: 'Documenti e stampa',
    hint: 'Testi legali, piè di pagina riparazioni e configurazione registratore telematico.',
  },
  whatsapp: {
    title: 'WhatsApp',
    hint: 'Template messaggi e collegamento Evolution API per avvisare i clienti.',
  },
  dati: {
    title: 'Dati e backup',
    hint: 'Account, export dati, app desktop e checklist di verifica del laboratorio.',
  },
  legale: {
    title: 'Legale e privacy',
    hint: 'Documentazione privacy, cookie e preferenze di consenso.',
  },
}

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
    subtitle: 'Flusso ticket e tracciabilità dispositivi.',
    items: [
      'Riparazioni: filtri e ricerca; apertura scheda; stati e priorità salvano correttamente.',
      'Nuova riparazione: cliente, dispositivo, problema e totali; salvataggio e riapertura senza perdita dati.',
      'Dispositivi: ricerca IMEI/seriale/barcode; lettore USB con cursore nel campo giusto o pagina senza altri input attivi.',
      'Collegamento riparazione ↔ dispositivo (se lo usate): dati allineati.',
    ],
  },
  {
    title: 'Magazzino / acquisti',
    subtitle: 'Catalogo, codici e movimenti.',
    items: [
      'Categorie e prodotti: creazione, modifica, prezzi listino e giacenza.',
      'Barcode prodotto: campo ricerca Magazzino + lettore USB (codice lungo + Invio) oppure «Scansiona» con fotocamera.',
      'Movimenti magazzino: carico/scarico registrato e riflesso sullo stock.',
      'Fornitori: anagrafica aggiornata se usata in documenti.',
    ],
  },
  {
    title: 'Cassa / amministrazione banco',
    subtitle: 'Vendite e documenti commerciali.',
    items: [
      'Cassa: aggiunta prodotti al carrello, totale, sconto, cliente; vendita di prova e controllo magazzino dopo scarico.',
      'Scontrino fiscale: se usi la macchina classica, verifica che corrisponda all’importo in cassa; invio da app solo se avete configurato rete/bridge.',
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
      '`/dispositivi` Ricerca seriale/IMEI; nessun loop di caricamento.',
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
  const snap = await getDocs(q)
  if (snap.empty) return 0
  let count = 0
  const batchSize = 400
  let batch = writeBatch(db)
  let batchCount = 0
  for (const docSnap of snap.docs) {
    batch.delete(docSnap.ref)
    batchCount++
    count++
    if (batchCount >= batchSize) {
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
    }
  }
  if (batchCount > 0) await batch.commit()
  return count
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

async function loadExportPayload(studioId: string, userId: string) {
  const [userSnap, studioSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDoc(doc(db, 'studios', studioId)),
  ])
  const collections: Record<string, Array<{ id: string } & Record<string, unknown>>> = {}
  for (const name of TENANT_ROOT_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('studioId', '==', studioId)))
    collections[name] = snap.docs.map(d => ({
      id: d.id,
      ...(serializeForExport(d.data()) as Record<string, unknown>),
    }))
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

export default function Impostazioni() {
  const { userProfile } = useAuth()
  const { studioId, legacyStudioId, loading: studioLoading } = useActiveStudio()
  const { reopenOnboarding } = useOnboardingContext()
  const { consent, openSettings: openCookieSettings } = useCookieConsent()
  const [searchParams] = useSearchParams()

  const tabFromUrl = searchParams.get('tab')
  const initialTab: SettingsTab =
    tabFromUrl === 'moduli' ||
    tabFromUrl === 'documenti' ||
    tabFromUrl === 'whatsapp' ||
    tabFromUrl === 'dati' ||
    tabFromUrl === 'legale'
      ? tabFromUrl
      : 'officina'

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [showCapPopup, setShowCapPopup] = useState(false)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (
      tab === 'moduli' ||
      tab === 'documenti' ||
      tab === 'whatsapp' ||
      tab === 'dati' ||
      tab === 'legale' ||
      tab === 'officina'
    ) {
      setActiveTab(tab)
    }
  }, [searchParams])

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
          const loaded = studioDocToSettingsForm(snap.data(), userProfile.email || '')
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
      await updateDoc(
        doc(db, 'studios', studioId),
        settingsFormToFirestorePatch({
          shopName,
          subtitle,
          address,
          city,
          province,
          cap,
          phone,
          cellPhone,
          email,
          website,
          vatNumber,
          fiscalCode,
          logoUrl,
          features,
          rtModel,
          rtIp,
          warrantyText,
          footerText,
          disclaimer,
          waTemplate,
        }),
      )
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
      const { payload } = await loadExportPayload(studioId, userProfile.id)
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

  const handleExportZip = async () => {
    if (!studioId || !userProfile?.id) return
    setExporting(true)
    setExportMode('zip')
    setExportError('')
    setExportProgress('')
    try {
      setExportProgress('Lettura dati…')
      const { payload, storageFilePaths } = await loadExportPayload(studioId, userProfile.id)
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
    const snap = await getDocs(colRef)
    if (snap.empty) return 0

    let count = 0
    const batchSize = 400
    let batch = writeBatch(db)
    let batchCount = 0

    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref)
      batchCount++
      count++
      if (batchCount >= batchSize) {
        await batch.commit()
        batch = writeBatch(db)
        batchCount = 0
      }
    }
    if (batchCount > 0) await batch.commit()
    return count
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

  const showSaveFooter =
    SAVE_TABS.includes(activeTab) || (activeTab === 'dati' && userName !== (userProfile?.name || ''))

  const saveButtonLabel =
    activeTab === 'dati' && !SAVE_TABS.includes(activeTab)
      ? saving
        ? 'Salvataggio…'
        : saved
          ? '✓ Nome salvato'
          : 'Salva nome utente'
      : saving
        ? 'Salvataggio…'
        : saved
          ? '✓ Salvato'
          : 'Salva impostazioni'

  if (loading || studioLoading) {
    return (
      <div className="gestionale-page gestionale-settings-page">
        <div className="gestionale-detail-panel__empty-msg">Caricamento impostazioni…</div>
      </div>
    )
  }

  const panel = TAB_PANELS[activeTab]

  return (
    <>
      <div className="gestionale-page gestionale-settings-page" data-tutorial="page-impostazioni">
        <div className="gestionale-settings-layout">
          <aside className="gestionale-settings-nav">
            <div className="gestionale-settings-nav__head">
              <h1 className="gestionale-settings-nav__title">Impostazioni</h1>
              <p className="gestionale-settings-nav__subtitle">Configurazione FixLab</p>
            </div>
            <nav className="gestionale-settings-nav__list" role="tablist" aria-label="Sezioni impostazioni" data-tutorial="impostazioni-sidebar">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  className={`gestionale-settings-nav__btn${activeTab === tab.key ? ' gestionale-settings-nav__btn--active' : ''}`}
                  data-tutorial={tab.key === 'dati' ? 'impostazioni-tab-verifica' : undefined}
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="gestionale-settings-main">
            <div className="gestionale-settings-body" data-tutorial="impostazioni-content" role="tabpanel">
              <div className="gestionale-settings-panel-head">
                <h2 className="gestionale-settings-panel-head__title">{panel.title}</h2>
                <p className="gestionale-settings-panel-head__hint">{panel.hint}</p>
                {loadError ? (
                  <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginTop: 10 }}>
                    {loadError}
                  </div>
                ) : null}
              </div>
          {activeTab === 'officina' && (
            <div className="gestionale-settings-stack gestionale-settings-stack--wide">
              <div className="gestionale-settings-card">
                <div className="gestionale-settings-fields">
                <FormField label="Logo" htmlFor="set-logo">
                  <div className="gestionale-settings-logo-row">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo officina" className="gestionale-settings-logo-preview" />
                    ) : (
                      <div className="gestionale-settings-logo-placeholder" aria-hidden>🏪</div>
                    )}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gestionale-text-muted)', marginBottom: 6 }}>PNG o JPG, max 2 MB</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <label className="gestionale-tool-btn" style={{ cursor: uploadingLogo ? 'wait' : 'pointer' }}>
                          {uploadingLogo ? 'Caricamento…' : logoUrl ? 'Cambia logo' : 'Carica logo'}
                          <input
                            id="set-logo"
                            type="file"
                            accept="image/png,image/jpeg,image/*"
                            hidden
                            disabled={uploadingLogo}
                            onChange={handleLogoUpload}
                          />
                        </label>
                        {logoUrl ? (
                          <ToolButton label="Rimuovi" variant="danger" onClick={() => setLogoUrl('')} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </FormField>

                <div className="gestionale-settings-row-2">
                  <FormField label="Cod. Fiscale" htmlFor="set-cf">
                    <input
                      id="set-cf"
                      className="gestionale-form-field__input"
                      value={fiscalCode}
                      onChange={e => setFiscalCode(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Part. IVA" htmlFor="set-piva">
                    <input
                      id="set-piva"
                      className="gestionale-form-field__input"
                      value={vatNumber}
                      onChange={e => setVatNumber(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Denominazione" htmlFor="set-name" required>
                  <input
                    id="set-name"
                    className="gestionale-form-field__input"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    placeholder="Nome officina"
                  />
                </FormField>

                <FormField label="Sottotitolo" htmlFor="set-subtitle">
                  <input
                    id="set-subtitle"
                    className="gestionale-form-field__input"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    placeholder="Es. Riparazione smartphone e PC"
                  />
                </FormField>

                <FormField label="Indirizzo" htmlFor="set-address">
                  <input
                    id="set-address"
                    className="gestionale-form-field__input"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </FormField>

                <FormField label="CAP" htmlFor="set-cap">
                  <div className="gestionale-field-with-action gestionale-settings-cap-field">
                    <input
                      id="set-cap"
                      className="gestionale-form-field__input gestionale-field-with-action__input"
                      value={cap}
                      onChange={e => setCap(e.target.value)}
                    />
                    <button
                      type="button"
                      className="gestionale-field-action-btn"
                      title="Ricerca CAP / Città / Provincia"
                      onClick={() => setShowCapPopup(true)}
                    >
                      🔍
                    </button>
                  </div>
                </FormField>

                <div className="gestionale-settings-row-2 gestionale-settings-row-2--city">
                  <FormField label="Città" htmlFor="set-city">
                    <input
                      id="set-city"
                      className="gestionale-form-field__input"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Prov." htmlFor="set-prov" labelWidth={52}>
                    <input
                      id="set-prov"
                      className="gestionale-form-field__input"
                      value={province}
                      onChange={e => setProvince(e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                  </FormField>
                </div>

                <div className="gestionale-settings-row-2">
                  <FormField label="Tel." htmlFor="set-phone">
                    <input
                      id="set-phone"
                      className="gestionale-form-field__input"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Cell./WhatsApp" htmlFor="set-cell">
                    <input
                      id="set-cell"
                      className="gestionale-form-field__input"
                      type="tel"
                      value={cellPhone}
                      onChange={e => setCellPhone(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="E-mail" htmlFor="set-email">
                  <input
                    id="set-email"
                    className="gestionale-form-field__input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </FormField>

                <FormField label="Sito web" htmlFor="set-website">
                  <input
                    id="set-website"
                    className="gestionale-form-field__input"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                  />
                </FormField>
                </div>
              </div>

              <div className="gestionale-settings-card">
                <ToolButton label="Riapri configurazione guidata" onClick={reopenOnboarding} />
                <p className="gestionale-settings-section__hint" style={{ marginTop: 8, marginBottom: 0 }}>
                  Rilancia il wizard di primo avvio per rivedere moduli e tipi di riparazione.
                </p>
              </div>
            </div>
          )}

            {activeTab === 'moduli' && (
              <div className="gestionale-settings-stack gestionale-settings-stack--wide">
                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Moduli attivi</h3>
                  <p className="gestionale-settings-section__hint">
                    Attiva o disattiva le funzionalità del gestionale. Le scelte vengono salvate su Firestore come nell&apos;onboarding.
                  </p>
                </div>
                <div className="gestionale-onboarding-check-list">
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
                </div>
                <EnterpriseConfigSection />
              </div>
            )}

            {activeTab === 'documenti' && (
              <div className="gestionale-settings-stack gestionale-settings-stack--wide">
                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Disclaimer legale</h3>
                  <p className="gestionale-settings-section__hint">
                    Testo in fondo a conferme d&apos;ordine, preventivi, fatture e ricevute PDF.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                    <ToolButton label="↺ Ripristina default" onClick={() => setDisclaimer(DEFAULT_DISCLAIMER)} />
                  </div>
                  <textarea
                    className="gestionale-form-field__input gestionale-form-field__input--textarea gestionale-form-field__input--tall"
                    value={disclaimer}
                    onChange={e => setDisclaimer(e.target.value)}
                    rows={6}
                  />
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Numerazione documenti</h3>
                  <p className="gestionale-settings-section__hint">
                    La numerazione progressiva e l&apos;eventuale serie (es. A, B) si impostano per ogni documento in{' '}
                    <strong>Documenti → Nuovo</strong>. Il formato completo è <code>numero/serie</code> o{' '}
                    <code>numero/anno</code> se non è indicata una serie. L&apos;anno segue la data del documento.
                  </p>
                  <div className="gestionale-settings-info-box">
                    Per le riparazioni, numero e anno si gestiscono nella scheda ticket (campo progressivo/anno).
                  </div>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Testi scheda riparazione</h3>
                  <FormField label="Testo garanzia" htmlFor="set-warranty">
                    <input
                      id="set-warranty"
                      className="gestionale-form-field__input"
                      value={warrantyText}
                      onChange={e => setWarrantyText(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Piè di pagina" htmlFor="set-footer">
                    <input
                      id="set-footer"
                      className="gestionale-form-field__input"
                      value={footerText}
                      onChange={e => setFooterText(e.target.value)}
                    />
                  </FormField>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Anteprima piè di pagina</h3>
                  <div className="gestionale-settings-preview">
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Firma per accettazione: ____________________</div>
                      <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>{disclaimer.substring(0, 250)}…</div>
                    </div>
                  </div>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Registratore telematico (RT)</h3>
                  <div className="gestionale-settings-info-box">
                    <strong>Cosa funziona davvero.</strong> Epson / Custom (prefissi <code>epson_</code>, <code>custom_</code>): comandi XML
                    tipo ePOS su <code>fpmate.cgi</code>. Altri modelli in elenco: invio <strong>JSON generico</strong> allo stesso URL — il
                    dispositivo reale potrebbe richiedere un protocollo diverso (non garantito). Da <strong>sito HTTPS</strong> il browser spesso{' '}
                    <strong>blocca</strong> le chiamate verso <code>http://IP-locale</code>: serve un bridge sul PC in laboratorio o uso senza mixed
                    content.
                  </div>
                  <FormField label="Modello RT" htmlFor="set-rt-model">
                    <select
                      id="set-rt-model"
                      className="gestionale-form-field__input"
                      value={rtModel}
                      onChange={e => setRtModel(e.target.value)}
                    >
                      {RT_MODELS.map(m => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {rtModel && rtModel !== 'none' ? (
                    <FormField label="Indirizzo IP" htmlFor="set-rt-ip">
                      <input
                        id="set-rt-ip"
                        className="gestionale-form-field__input"
                        value={rtIp}
                        onChange={e => setRtIp(e.target.value)}
                        placeholder="192.168.1.100"
                      />
                      <p className="gestionale-settings-section__hint" style={{ marginTop: 4 }}>
                        Stessa rete del PC o del bridge che espone fpmate.
                      </p>
                    </FormField>
                  ) : (
                    <p className="gestionale-settings-section__hint">Seleziona un modello per configurare l&apos;indirizzo IP.</p>
                  )}
                </div>
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="gestionale-settings-stack gestionale-settings-stack--wide">
                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Template messaggio</h3>
                  <p className="gestionale-settings-section__hint">
                    Messaggio inviato quando la riparazione è pronta (variabili sostituite automaticamente).
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
                    className="gestionale-form-field__input gestionale-form-field__input--textarea gestionale-form-field__input--tall"
                    value={waTemplate}
                    onChange={e => setWaTemplate(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <ToolButton
                    label="↺ Ripristina default"
                    onClick={() => setWaTemplate(DEFAULT_WA_TEMPLATE)}
                    style={{ marginTop: 6 }}
                  />
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Anteprima</h3>
                  <div className="gestionale-settings-preview gestionale-settings-preview--wa">{previewMessage}</div>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Collegamento Evolution API</h3>
                  <p className="gestionale-settings-section__hint">
                    Genera il QR e collega WhatsApp sul telefono del laboratorio. Pagina dedicata:{' '}
                    <Link to="/impostazioni/whatsapp" className="gestionale-datatable__link">
                      /impostazioni/whatsapp
                    </Link>
                  </p>
                  <WhatsAppConnectionPanel compact />
                </div>
                </div>
              </div>
            )}

            {activeTab === 'dati' && (
              <div className="gestionale-settings-stack gestionale-settings-stack--wide">
                <div className="gestionale-settings-card">
                <DesktopAppInfoSection />
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Il tuo account</h3>
                  <div className="gestionale-settings-stack gestionale-settings-stack--wide">
                    <FormField label="Il tuo nome" htmlFor="set-username">
                      <input
                        id="set-username"
                        className="gestionale-form-field__input"
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                      />
                    </FormField>
                    <FormField label="E-mail" htmlFor="set-user-email">
                      <input
                        id="set-user-email"
                        className="gestionale-form-field__input"
                        value={userProfile?.email || ''}
                        disabled
                      />
                    </FormField>
                    <FormField label="Ruolo" htmlFor="set-user-role">
                      <input id="set-user-role" className="gestionale-form-field__input" value={roleLabel} disabled />
                    </FormField>
                    <p className="gestionale-settings-section__hint">
                      Il nome utente viene salvato insieme alle altre impostazioni con il pulsante in fondo.
                    </p>
                  </div>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Export dati</h3>
                  <p className="gestionale-settings-section__hint">
                    <strong>JSON</strong>: dati Firestore + elenco percorsi Storage (veloce). <strong>ZIP</strong>: stesso contenuto in{' '}
                    <code>dati.json</code>, più cartella <code>storage/</code> con i file scaricati da Firebase (può richiedere tempo). Limite
                    indicativo ~350 MB totali e ~48 MB per singolo file.
                  </p>
                  {exportProgress ? (
                    <p className="gestionale-settings-section__hint">{exportProgress}</p>
                  ) : null}
                  {exportError ? (
                    <div className="gestionale-settings-info-box gestionale-settings-info-box--danger">{exportError}</div>
                  ) : null}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Import dati</h3>
                  <div className="gestionale-settings-import-placeholder">
                    <input type="file" accept=".json,.zip" disabled aria-disabled="true" />
                    <span className="gestionale-settings-import-placeholder__note">
                      Funzione in preparazione — non modificare i dati esistenti finché non sarà disponibile.
                    </span>
                  </div>
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Zona pericolosa</h3>
                  <div className="gestionale-settings-info-box gestionale-settings-info-box--danger">
                    Eliminando il tuo account verranno cancellati permanentemente tutti i dati: officina, clienti, riparazioni, prodotti,
                    documenti, pagamenti e file. Azione irreversibile.
                  </div>
                  <ToolButton label="Elimina account e tutti i dati" variant="danger" onClick={openDeleteModal} />
                </div>
                </div>

                <div className="gestionale-settings-card">
                <div className="gestionale-settings-section" data-tutorial="impostazioni-verifica">
                  <h3 className="gestionale-settings-section__title">Checklist di verifica</h3>
                  <p className="gestionale-settings-section__hint">
                    Elenco pratico per collaudare FixLab in laboratorio, per ruolo. Usa{' '}
                    <kbd style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--gestionale-border)' }}>Ctrl</kbd>+
                    <kbd style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--gestionale-border)' }}>P</kbd> per stampare o
                    salvare in PDF.
                  </p>
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
                </div>
              </div>
            )}

            {activeTab === 'legale' && (
              <div className="gestionale-settings-stack gestionale-settings-stack--wide">
              <div className="gestionale-settings-card">
              <div className="gestionale-settings-legal-links">
                <div className="gestionale-settings-section">
                  <h3 className="gestionale-settings-section__title">Documentazione legale</h3>
                  <p className="gestionale-settings-section__hint">
                    Testi informativi su trattamento dati e cookie. I link sono disponibili anche dal footer dell&apos;app.
                  </p>
                </div>

                <div className="gestionale-settings-legal-card">
                  <div className="gestionale-settings-legal-card__text">
                    <strong>Informativa privacy</strong>
                    Ruoli titolare/responsabile, diritti degli interessati, export ed eliminazione dati self-service.
                  </div>
                  <Link to="/privacy" className="gestionale-tool-btn" style={{ textDecoration: 'none' }}>
                    Apri
                  </Link>
                </div>

                <div className="gestionale-settings-legal-card">
                  <div className="gestionale-settings-legal-card__text">
                    <strong>Cookie policy</strong>
                    Tipologie di cookie, base giuridica e gestione delle preferenze di consenso.
                  </div>
                  <Link to="/cookie" className="gestionale-tool-btn" style={{ textDecoration: 'none' }}>
                    Apri
                  </Link>
                </div>

                <div className="gestionale-settings-legal-card">
                  <div className="gestionale-settings-legal-card__text">
                    <strong>Preferenze cookie</strong>
                    {consent
                      ? `Salvate il ${new Date(consent.savedAt).toLocaleString('it-IT')} — funzionali: ${consent.functional ? 'sì' : 'no'}, analytics: ${consent.analytics ? 'sì' : 'no'}.`
                      : 'Non ancora impostate in questa sessione.'}
                  </div>
                  <ToolButton label="Gestisci" onClick={openCookieSettings} />
                </div>
              </div>
              </div>
              </div>
            )}
            </div>

            {showSaveFooter ? (
              <footer className="gestionale-settings-footer">
                <div
                  className={`gestionale-settings-footer__status${
                    saveError ? ' gestionale-settings-footer__status--error' : saved ? ' gestionale-settings-footer__status--ok' : ''
                  }`}
                >
                  {saveError || (saved ? 'Modifiche salvate correttamente.' : 'Le modifiche non sono ancora salvate.')}
                </div>
                <div className="gestionale-settings-footer__actions">
                  <button
                    type="button"
                    className="gestionale-dialog-btn gestionale-dialog-btn--primary"
                    onClick={() => void handleSave()}
                    disabled={saving || Boolean(loadError)}
                  >
                    {saveButtonLabel}
                  </button>
                </div>
              </footer>
            ) : null}
          </div>
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
                  <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
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
    </>
  )
}
