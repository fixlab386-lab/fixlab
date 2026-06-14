import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import {
  getProducts,
  addRepair,
  updateRepair,
  findDeviceByCode,
  addRepairToDevice,
} from '../lib/firestore'
import type { Product, Repair, RepairPhoto, RepairProduct } from '../types'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import TabCliente from '../components/repair/TabCliente'
import TabDispositivo from '../components/repair/TabDispositivo'
import TabRiparazione from '../components/repair/TabRiparazione'
import RepairSection from '../components/repair/RepairSection'
import RepairLineItemsSection from '../components/repair/RepairLineItemsSection'
import RepairTotalsSection from '../components/repair/RepairTotalsSection'
import { normalizeRepairLine, sumLineTotals } from '../components/repair/repairLineUtils'
import { generateRepairPDF, buildRepairConfermaOrdineHtml } from '../lib/generatePDF'
import { buildConfermaOrdineViewModel, confermaOrdineFilename } from '../lib/confermaOrdineTemplate'
import { getDocumentTypePrintOptions } from '../lib/printTemplates'
import ConfermaOrdineAnteprimaDialog from '../components/repair/ConfermaOrdineAnteprimaDialog'
import { ActionBar, ToolButton, type ActionBarAction } from '../components/ui'
import '../theme/gestionale-dialog.css'

const emptyForm = {
  clientId: '' as string | undefined,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  clientCity: '',
  clientProvince: '',
  clientCap: '',
  deviceId: '' as string | undefined,
  deviceType: 'Smartphone',
  deviceBrand: 'Apple',
  deviceModel: '',
  deviceColor: '',
  imei: '',
  devicePin: '',
  deviceLockCode: '',
  deviceAccount: '',
  devicePassword: '',
  deviceCondition: '',
  problem: '',
  diagnosis: '',
  status: 'waiting' as Repair['status'],
  priority: 'normal' as Repair['priority'],
  estimatedTime: '1 ora',
  deadline: '',
  warrantyDays: 90,
  laborCost: 30,
  deposit: 0,
  assignedTo: '',
  notes: '',
  acceptanceDate: new Date().toISOString().slice(0, 10),
  repairSequence: undefined as number | undefined,
  repairYear: new Date().getFullYear(),
}

const STATUS_OPTIONS = [
  { value: 'waiting', label: 'In attesa' },
  { value: 'accepted', label: 'Accettata' },
  { value: 'in_progress', label: 'In lavorazione' },
  { value: 'ready', label: 'Pronta' },
  { value: 'completed', label: 'Consegnata' },
  { value: 'on_hold', label: 'In sospeso' },
]

type StudioDoc = Record<string, unknown> & {
  name?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  cellPhone?: string
  email?: string
  logoUrl?: string
  disclaimer?: string
  waTemplate?: string
  appOptions?: { azienda?: { nation?: string } }
}

export default function NuovaRiparazione() {
  const { userProfile, loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<RepairProduct[]>([])
  const [photos, setPhotos] = useState<RepairPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [studioData, setStudioData] = useState<StudioDoc | null>(null)
  const [savedRepairId, setSavedRepairId] = useState<string | undefined>(id)
  const [anteprimaHtml, setAnteprimaHtml] = useState<string | null>(null)
  const [anteprimaMeta, setAnteprimaMeta] = useState<{ title: string; filename: string; repairId: string } | null>(null)

  const isEdit = !!id

  useEffect(() => {
    setSavedRepairId(id)
  }, [id])

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        const prods = await getProducts(studioId)
        if (cancelled) return
        setProducts(prods)
        const studioSnap = await getDoc(doc(db, 'studios', studioId))
        if (cancelled) return
        setStudioData(studioSnap.exists() ? (studioSnap.data() as StudioDoc) : null)

        if (id) {
          const snap = await getDoc(doc(db, 'repairs', id))
          if (cancelled) return
          if (!snap.exists()) {
            setLoadError('Riparazione non trovata o non accessibile.')
            setForm({ ...emptyForm })
            setLines([])
            setPhotos([])
          } else {
            const data = snap.data() as Record<string, unknown>
            setForm({
              clientId: (data.clientId as string) || '',
              clientName: (data.clientName as string) || '',
              clientPhone: (data.clientPhone as string) || '',
              clientEmail: (data.clientEmail as string) || '',
              clientAddress: (data.clientAddress as string) || '',
              clientCity: (data.clientCity as string) || '',
              clientProvince: (data.clientProvince as string) || '',
              clientCap: (data.clientCap as string) || '',
              deviceId: (data.deviceId as string) || '',
              deviceType: (data.deviceType as string) || 'Smartphone',
              deviceBrand: (data.deviceBrand as string) || 'Apple',
              deviceModel: (data.deviceModel as string) || '',
              deviceColor: (data.deviceColor as string) || '',
              imei: (data.imei as string) || '',
              devicePin: (data.devicePin as string) || '',
              deviceLockCode: (data.deviceLockCode as string) || '',
              deviceAccount: (data.deviceAccount as string) || '',
              devicePassword: (data.devicePassword as string) || '',
              deviceCondition: (data.deviceCondition as string) || '',
              problem: (data.problem as string) || '',
              diagnosis: (data.diagnosis as string) || '',
              status: (data.status as Repair['status']) || 'waiting',
              priority: (data.priority as Repair['priority']) || 'normal',
              estimatedTime: (data.estimatedTime as string) || '1 ora',
              deadline: (data.deadline as string) || '',
              warrantyDays: (data.warrantyDays as number) ?? 90,
              laborCost: (data.laborCost as number) || 0,
              deposit: (data.deposit as number) || 0,
              assignedTo: (data.assignedTo as string) || '',
              notes: (data.notes as string) || '',
              acceptanceDate: (() => {
                if (data.acceptanceDate) return data.acceptanceDate as string
                const created = data.createdAt as { toDate?: () => Date } | undefined
                if (created?.toDate) return created.toDate().toISOString().slice(0, 10)
                return emptyForm.acceptanceDate
              })(),
              repairSequence: data.repairSequence as number | undefined,
              repairYear: (data.repairYear as number) || new Date().getFullYear(),
            })
            setLines(((data.products as RepairProduct[]) || []).map(normalizeRepairLine))
            setPhotos((data.photos as RepairPhoto[]) || [])
          }
        } else {
          setForm({ ...emptyForm })
          setLines([])
          setPhotos([])
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Errore di caricamento.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId, id])

  const s = useCallback((field: string, val: unknown) => setForm(f => ({ ...f, [field]: val })), [])

  const linesTotal = useMemo(() => sumLineTotals(lines), [lines])
  const documentTotal = useMemo(() => linesTotal + (form.laborCost || 0), [linesTotal, form.laborCost])
  const balanceDue = useMemo(() => Math.max(0, documentTotal - (form.deposit || 0)), [documentTotal, form.deposit])

  const ticketNumber = useMemo(() => {
    if (form.repairSequence && form.repairYear) return `${form.repairSequence}/${form.repairYear}`
    if (id) return `FIX-${id.slice(-6).toUpperCase()}`
    return undefined
  }, [form.repairSequence, form.repairYear, id])

  const currentStatus = useMemo(
    () => STATUS_OPTIONS.find(o => o.value === form.status) || STATUS_OPTIONS[0],
    [form.status],
  )

  const buildRepairPayload = useCallback(
    (ticket?: string) => {
      const normalizedLines = lines.map(normalizeRepairLine)
      const raw: Record<string, unknown> = {
        ...form,
        products: normalizedLines,
        totalCost: documentTotal,
        studioId,
        checklistPre: [],
        checklistPost: [],
        photos: photos.map(p => ({ url: p.url, path: p.path, name: p.name, type: p.type, timestamp: p.timestamp })),
        ...(ticket ? { ticketNumber: ticket } : {}),
      }
      return Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined))
    },
    [form, lines, documentTotal, studioId, photos],
  )

  const buildRepairForPdf = useCallback(
    (repairId: string, ticket?: string): Repair => ({
      id: repairId,
      studioId,
      ticketNumber: ticket || ticketNumber,
      clientId: form.clientId,
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      clientAddress: form.clientAddress,
      clientCity: form.clientCity,
      clientProvince: form.clientProvince,
      clientCap: form.clientCap,
      deviceId: form.deviceId,
      deviceType: form.deviceType,
      deviceBrand: form.deviceBrand,
      deviceModel: form.deviceModel,
      deviceColor: form.deviceColor,
      imei: form.imei,
      devicePin: form.devicePin,
      deviceLockCode: form.deviceLockCode,
      deviceAccount: form.deviceAccount,
      devicePassword: form.devicePassword,
      deviceCondition: form.deviceCondition,
      problem: form.problem,
      diagnosis: form.diagnosis,
      status: form.status,
      priority: form.priority,
      estimatedTime: form.estimatedTime,
      deadline: form.deadline,
      warrantyDays: form.warrantyDays,
      laborCost: form.laborCost,
      products: lines.map(normalizeRepairLine),
      totalCost: documentTotal,
      deposit: form.deposit,
      assignedTo: form.assignedTo,
      notes: form.notes,
      acceptanceDate: form.acceptanceDate,
      repairSequence: form.repairSequence,
      repairYear: form.repairYear,
      photos,
      checklistPre: [],
      checklistPost: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    [form, lines, documentTotal, photos, studioId, ticketNumber],
  )

  const linkRepairToDevice = useCallback(
    async (repairId: string, ticket?: string) => {
      let deviceId = form.deviceId
      if (!deviceId && form.imei?.trim()) {
        const device = await findDeviceByCode(studioId, form.imei.trim())
        deviceId = device?.id
      }
      if (!deviceId) return
      await addRepairToDevice(deviceId, {
        repairId,
        ticketNumber: ticket || ticketNumber,
        date: form.acceptanceDate || new Date().toISOString().slice(0, 10),
        problem: form.problem,
        status: form.status,
        totalCost: documentTotal,
      })
    },
    [form, studioId, documentTotal, ticketNumber],
  )

  const persistRepair = useCallback(async (): Promise<string> => {
    const newTicket = savedRepairId ? undefined : `FIX-${Date.now().toString().slice(-6)}`
    const data = buildRepairPayload(newTicket)
    if (savedRepairId) {
      await updateRepair(savedRepairId, data)
      await linkRepairToDevice(savedRepairId, (data.ticketNumber as string) || ticketNumber)
      return savedRepairId
    }
    const ref = await addRepair(data as Omit<Repair, 'id' | 'createdAt' | 'updatedAt'>)
    setSavedRepairId(ref.id)
    await linkRepairToDevice(ref.id, newTicket)
    return ref.id
  }, [savedRepairId, buildRepairPayload, linkRepairToDevice, ticketNumber])

  const studioForPrint = useMemo(
    () =>
      studioData
        ? {
            name: studioData.name || 'FIXLab',
            address: studioData.address,
            city: studioData.city,
            province: studioData.province,
            cap: studioData.cap,
            nation: studioData.appOptions?.azienda?.nation || 'Italy',
            vatNumber: studioData.vatNumber,
            phone: studioData.phone,
            cellPhone: studioData.cellPhone,
            email: studioData.email,
            logoUrl: studioData.logoUrl,
            disclaimer: studioData.disclaimer,
          }
        : undefined,
    [studioData],
  )

  const confermaPrintOptions = useMemo(() => {
    if (!studioData) return undefined
    const opts = getDocumentTypePrintOptions(studioData as Record<string, unknown>, 'conferma_ordine')
    return {
      titoloStampa: opts.titoloStampa,
      noteFine: opts.noteFine,
      template: opts.template,
    }
  }, [studioData])

  const openConfermaOrdineAnteprima = useCallback(
    (repairId: string, ticket?: string) => {
      const repair = buildRepairForPdf(repairId, ticket)
      const model = buildConfermaOrdineViewModel(repair, studioForPrint, confermaPrintOptions)
      setAnteprimaHtml(buildRepairConfermaOrdineHtml(repair, studioForPrint, confermaPrintOptions))
      setAnteprimaMeta({
        title: `Conferma d'ordine ${model.orderNumber}`,
        filename: confermaOrdineFilename(repair),
        repairId,
      })
    },
    [buildRepairForPdf, studioForPrint, confermaPrintOptions],
  )

  const handlePrintPDF = useCallback(
    (repairId: string) => {
      void generateRepairPDF(buildRepairForPdf(repairId), studioForPrint, confermaPrintOptions)
    },
    [buildRepairForPdf, studioForPrint, confermaPrintOptions],
  )

  const handlePrintLabel = useCallback(
    (repairId: string) => {
      const ticket = ticketNumber || `FIX-${repairId.slice(-6).toUpperCase()}`
      const trackingUrl = `${window.location.origin}/tracking/${repairId}`
      const win = window.open('', '_blank')
      if (!win) {
        alert('Popup bloccato')
        return
      }
      win.document.write(`<!DOCTYPE html><html><head><title>Etichetta ${ticket}</title>
<style>@page{margin:5mm;size:62mm 40mm}body{font-family:Arial,sans-serif;margin:0;padding:4mm;width:54mm}
.t{font-size:14px;font-weight:800;letter-spacing:1px;margin-bottom:2mm}.i{font-size:9px;color:#333;margin-bottom:1mm}
.q{text-align:center;margin:2mm 0}.f{font-size:7px;color:#999;text-align:center}</style></head><body>
<div class="t">${ticket}</div><div class="i">${form.clientName || 'Cliente'}</div>
<div class="i">${form.deviceBrand || ''} ${form.deviceModel || ''}</div>
<div class="i">${(form.problem || '').substring(0, 40)}</div>
<div class="q"><img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}" width="100" height="100"/></div>
<div class="f">${studioData?.name || 'FIXLab'} · ${new Date().toLocaleDateString('it-IT')}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`)
      win.document.close()
    },
    [form.clientName, form.deviceBrand, form.deviceModel, form.problem, studioData, ticketNumber],
  )

  const handleWhatsApp = useCallback(async () => {
    if (!form.clientPhone) {
      alert('Inserisci il numero di telefono del cliente')
      return
    }
    const stSnap = studioData || (await getDoc(doc(db, 'studios', studioId))).data()
    const template =
      stSnap?.waTemplate ||
      `Ciao {{nome}}! 👋\n\nIl tuo *{{dispositivo}}* è pronto per il ritiro! 🎉\n\nPuoi passare a ritirarlo durante i nostri orari di apertura.\n\nPer info: {{telefono_negozio}}\n\n_{{nome_negozio}}_`
    const msg = template
      .replace('{{nome}}', form.clientName || '')
      .replace('{{dispositivo}}', `${form.deviceBrand || ''} ${form.deviceModel || ''}`.trim())
      .replace('{{telefono_negozio}}', stSnap?.phone || '')
      .replace('{{nome_negozio}}', stSnap?.name || 'FIXLab')
    const number = form.clientPhone.replace(/\D/g, '')
    window.open(`https://wa.me/${number.startsWith('39') ? number : `39${number}`}?text=${encodeURIComponent(msg)}`, '_blank')
  }, [form.clientName, form.clientPhone, form.deviceBrand, form.deviceModel, studioData, studioId])

  const handleSave = useCallback(
    async (options?: { print?: boolean; goToCash?: boolean; stay?: boolean }) => {
      if (!studioId) return
      if (!form.clientName?.trim() || !form.deviceModel?.trim()) {
        alert('Inserisci almeno nome cliente e modello dispositivo')
        return
      }
      setSaveError(null)
      setSaving(true)
      try {
        const repairId = await persistRepair()
        if (options?.print) openConfermaOrdineAnteprima(repairId, ticketNumber)
        if (options?.goToCash) {
          navigate(`/cassa?repairId=${repairId}`)
          return
        }
        if (!options?.stay) navigate('/riparazioni')
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
      } finally {
        setSaving(false)
      }
    },
    [studioId, form.clientName, form.deviceModel, persistRepair, openConfermaOrdineAnteprima, navigate, ticketNumber],
  )

  const goBack = useCallback(() => navigate('/riparazioni'), [navigate])

  const footerActions: ActionBarAction[] = useMemo(
    () => [
      {
        id: 'save',
        label: saving ? 'Salvataggio…' : 'Salva',
        icon: '✓',
        onClick: () => void handleSave(),
        disabled: saving,
      },
      {
        id: 'save-print',
        label: 'Salva e stampa',
        icon: '🖨',
        onClick: () => void handleSave({ print: true, stay: true }),
        disabled: saving,
      },
      {
        id: 'whatsapp',
        label: 'Invia WhatsApp',
        icon: '💬',
        onClick: () => void handleWhatsApp(),
        disabled: !form.clientPhone,
      },
      {
        id: 'cassa',
        label: 'Invia in cassa',
        icon: '💰',
        onClick: () => void handleSave({ goToCash: true }),
        disabled: saving,
      },
    ],
    [saving, handleSave, handleWhatsApp, form.clientPhone],
  )

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento scheda…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  if (loadError) {
    return (
      <div className="gestionale-page gestionale-datatable__empty">
        <p>{loadError}</p>
        <ToolButton label="Torna alle riparazioni" icon="←" onClick={goBack} />
      </div>
    )
  }

  return (
    <div className="gestionale-page gestionale-repair-sheet" data-tutorial="page-riparazione-form">
      <header className="gestionale-repair-sheet__header">
        <div>
          <h1 className="gestionale-repair-sheet__title">{isEdit ? 'Modifica scheda riparazione' : 'Nuova scheda riparazione'}</h1>
          <div className="gestionale-repair-sheet__meta">
            {ticketNumber ? <span className="gestionale-repair-sheet__badge">{ticketNumber}</span> : null}
            <span>{currentStatus.label}</span>
            <span>{form.clientName || 'Cliente da selezionare'}</span>
            <span>
              {form.deviceBrand} {form.deviceModel || '—'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <ToolButton label="QR" icon="🏷" onClick={() => savedRepairId && handlePrintLabel(savedRepairId)} disabled={!savedRepairId} />
          <ToolButton
            label="Stampa"
            icon="🖨"
            onClick={() => savedRepairId && openConfermaOrdineAnteprima(savedRepairId)}
            disabled={!savedRepairId}
          />
          <ToolButton label="PDF" icon="📄" onClick={() => savedRepairId && handlePrintPDF(savedRepairId)} disabled={!savedRepairId} />
          <ToolButton label="Chiudi" icon="←" onClick={goBack} />
        </div>
      </header>

      {saveError ? <div className="gestionale-page__banner gestionale-page__banner--error">{saveError}</div> : null}

      <div className="gestionale-repair-sheet__scroll">
        <RepairSection title="Cliente" id="sezione-cliente">
          <TabCliente form={form} s={s} />
        </RepairSection>

        <RepairSection title="Informazioni dispositivo" id="sezione-dispositivo">
          <TabDispositivo
            form={form}
            studioId={studioId}
            s={s}
            onDeviceLinked={device => s('deviceId', device?.id || '')}
          />
        </RepairSection>

        <RepairSection title="Difetto e lavorazione" id="sezione-lavorazione">
          <TabRiparazione form={form} s={s} />
        </RepairSection>

        <RepairSection title="Righe servizio / ricambi" id="sezione-righe">
          <RepairLineItemsSection products={products} lines={lines} onChange={setLines} />
        </RepairSection>

        <RepairSection title="Totali e accettazione" id="sezione-totali">
          <RepairTotalsSection
            form={form}
            linesTotal={linesTotal}
            documentTotal={documentTotal}
            balanceDue={balanceDue}
            studioId={studioId}
            repairId={savedRepairId || 'new'}
            photos={photos}
            onPhotosChange={setPhotos}
            onField={s}
          />
        </RepairSection>
      </div>

      <ActionBar actions={footerActions} left={saveError ? <span style={{ color: '#b3261e', fontSize: 12 }}>{saveError}</span> : null} />

      {anteprimaHtml && anteprimaMeta ? (
        <ConfermaOrdineAnteprimaDialog
          innerHtml={anteprimaHtml}
          meta={{
            title: anteprimaMeta.title,
            filename: anteprimaMeta.filename,
            onPdf: () => handlePrintPDF(anteprimaMeta.repairId),
          }}
          onClose={() => {
            setAnteprimaHtml(null)
            setAnteprimaMeta(null)
          }}
        />
      ) : null}
    </div>
  )
}
