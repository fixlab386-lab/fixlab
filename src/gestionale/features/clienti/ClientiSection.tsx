import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { addClient, deleteClient, getClients, getNextClientCode, updateClient } from '../../../lib/firestore'
import { buildClientiPrintHtml } from '../../../lib/clientiPrint'
import { printHtmlInIframe } from '../../../lib/printDocument'
import type { Client } from '../../../types'
import { exportClientsExcel } from '../../../components/clients/exportClientsExcel'
import { importClientsFromCsv } from '../../lib/importAnagraficaCsv'
import ClientiActionBar from './ClientiActionBar'
import ClientiColonneMenu from './ClientiColonneMenu'
import ClientiLista from './ClientiLista'
import ClientiScheda from './ClientiScheda'
import ClientiTopBar from './ClientiTopBar'
import { DEFAULT_COLONNE, ETICHETTE_MODELLO, COLONNE_DEF } from './constants'
import ClientiAnteprimaStampaDialog from './dialogs/ClientiAnteprimaStampaDialog'
import ClientiStampaDialog from './dialogs/ClientiStampaDialog'
import {
  AllegatiClientiDialog,
  ConfermaEliminaDialog,
  EtichetteIndirizzoDialog,
  EtichetteQualeIndirizzoDialog,
  ImpegniDialog,
  InviaPagamentoDialog,
  MancaCellulareDialog,
  ModificaSelezioneDialog,
  RicercaCapCittaDialog,
  RicercaSoggettiNazionaleDialog,
  ValidazioneDenominazioneDialog,
  WhatsAppNumeriDialog,
} from './dialogs/ClientiDialogs'
import {
  ContattiExtraDialog,
  FiltroPersonalizzatoDialog,
  ProprietaCompleteDialog,
  SedeLegaleDialog,
  SediListaDialog,
} from './dialogs/ClientiAnagraficaDialogs'
import {
  clientToCliente,
  clienteToClientPayload,
  emptyCliente,
  type Cliente,
  type ColonnaId,
  type ColumnFilter,
  type RaggruppaCriterio,
  type SchedaTabId,
} from './types'
import { applyColumnFilters, duplicateCliente } from './utils'
import '../../theme/clienti-section.css'
import '../../theme/gestionale-tokens.css'

export default function ClientiSection() {
  const { studioId, activeArchive } = useActiveStudio()
  const { openVenditaBanco } = useAppWindows()
  const navigate = useNavigate()

  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [snapshot, setSnapshot] = useState<Cliente | null>(null)
  const [activeTab, setActiveTab] = useState<SchedaTabId>('anagrafica')

  const [criterioRaggruppamento, setCriterioRaggruppamento] = useState<RaggruppaCriterio>('Pagamento')
  const [filtriColonna, setFiltriColonna] = useState<Partial<Record<ColonnaId, ColumnFilter>>>({})
  const [colonneVisibili, setColonneVisibili] = useState(DEFAULT_COLONNE)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtraAttivo, setFiltraAttivo] = useState(true)
  const [searchPiva, setSearchPiva] = useState('')
  const [sortColumn, setSortColumn] = useState<ColonnaId | null>('cod')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [showElimina, setShowElimina] = useState(false)
  const [showValidazione, setShowValidazione] = useState(false)
  const [showInvia, setShowInvia] = useState(false)
  const [showAllegati, setShowAllegati] = useState(false)
  const [showImpegni, setShowImpegni] = useState(false)
  const [showRicercaNaz, setShowRicercaNaz] = useState(false)
  const [showRicercaCap, setShowRicercaCap] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showMancaCell, setShowMancaCell] = useState(false)
  const [showEtichetteAddr, setShowEtichetteAddr] = useState(false)
  const [showEtichetteQuale, setShowEtichetteQuale] = useState(false)
  const [showModificaSelez, setShowModificaSelez] = useState(false)
  const [stampaModello, setStampaModello] = useState<string | null>(null)
  const [anteprimaHtml, setAnteprimaHtml] = useState<{ html: string; title: string; filename: string } | null>(null)
  const [showSedeLegale, setShowSedeLegale] = useState(false)
  const [showSediAmmin, setShowSediAmmin] = useState(false)
  const [showSediExtra, setShowSediExtra] = useState(false)
  const [showContattiExtra, setShowContattiExtra] = useState(false)
  const [showProprieta, setShowProprieta] = useState(false)
  const [filtroPersCol, setFiltroPersCol] = useState<ColonnaId | null>(null)
  const [allegatiFiles, setAllegatiFiles] = useState<{ name: string; url?: string }[]>([])

  const previousIdRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!studioId) return
    try {
      const data = await getClients(studioId)
      setClienti(data.map(clientToCliente))
      setError(null)
    } catch {
      setError('Impossibile caricare i clienti.')
    }
  }, [studioId])

  useEffect(() => {
    if (!studioId) return
    setLoading(true)
    void refresh().finally(() => setLoading(false))
  }, [studioId, refresh])

  const selected = useMemo(() => clienti.find(c => c.id === selectedId) || null, [clienti, selectedId])

  useEffect(() => {
    if (selected) {
      setEditing(structuredClone(selected))
      setSnapshot(structuredClone(selected))
    } else {
      setEditing(null)
      setSnapshot(null)
    }
  }, [selected])

  const isDirty = useMemo(() => {
    if (!editing || !snapshot) return editing?.isDraft ?? false
    return JSON.stringify(editing) !== JSON.stringify(snapshot)
  }, [editing, snapshot])

  const displayClienti = useMemo(() => {
    let list = clienti
    const q = searchPiva.trim().toLowerCase()
    if (q) {
      list = list.filter(
        c =>
          c.partitaIva.toLowerCase().includes(q) ||
          c.codFiscale.toLowerCase().includes(q) ||
          c.sedeOperativa.denominazione.toLowerCase().includes(q),
      )
    }
    return list
  }, [clienti, searchPiva])

  const visibleColIds = useMemo(
    () => (Object.entries(colonneVisibili).filter(([, v]) => v).map(([k]) => k) as ColonnaId[]),
    [colonneVisibili],
  )

  const printCtx = useMemo(
    () => ({
      archiveName: activeArchive?.name ?? studioId ?? 'archivio',
      studioName: activeArchive?.name,
      cliente: editing,
      clienti: applyColumnFilters(displayClienti, filtriColonna),
      visibleCols: visibleColIds,
    }),
    [activeArchive?.name, studioId, editing, displayClienti, filtriColonna, visibleColIds],
  )

  const handleSelect = useCallback((c: Cliente) => {
    setSelectedId(c.id)
    setActiveTab('anagrafica')
  }, [])

  const handleNuovo = useCallback(async () => {
    if (!studioId) return
    previousIdRef.current = selectedId
    const code = await getNextClientCode(studioId)
    const draft = emptyCliente(code)
    setClienti(prev => [draft, ...prev])
    setSelectedId(draft.id)
    setEditing(structuredClone(draft))
    setSnapshot(null)
    setActiveTab('anagrafica')
  }, [studioId, selectedId])

  const handleAnnulla = useCallback(() => {
    if (editing?.isDraft) {
      setClienti(prev => prev.filter(c => c.id !== editing.id))
      setSelectedId(previousIdRef.current)
      return
    }
    if (snapshot) setEditing(structuredClone(snapshot))
  }, [editing, snapshot])

  const handleCloseScheda = useCallback(() => {
    if (isDirty && !window.confirm('Modifiche non salvate. Chiudere la scheda?')) return
    if (editing?.isDraft) {
      setClienti(prev => prev.filter(c => c.id !== editing.id))
    }
    setSelectedId(null)
    setEditing(null)
    setSnapshot(null)
  }, [isDirty, editing])

  const handleSave = useCallback(async () => {
    if (!studioId || !editing) return
    if (!editing.sedeOperativa.denominazione.trim()) {
      setShowValidazione(true)
      return
    }
    setSaving(true)
    try {
      const payload = clienteToClientPayload(editing, studioId)
      if (editing.isDraft) {
        const ref = await addClient(payload)
        const saved: Cliente = { ...editing, id: ref.id, isDraft: false }
        setClienti(prev => prev.map(c => (c.id === editing.id ? saved : c)))
        setSelectedId(saved.id)
        setEditing(structuredClone(saved))
        setSnapshot(structuredClone(saved))
      } else {
        await updateClient(editing.id, payload)
        const saved = { ...editing, isDraft: false }
        setClienti(prev => prev.map(c => (c.id === editing.id ? saved : c)))
        setEditing(structuredClone(saved))
        setSnapshot(structuredClone(saved))
      }
      setError(null)
    } catch {
      setError('Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [studioId, editing])

  const handleDuplica = useCallback(async () => {
    if (!selected || !studioId) return
    const code = await getNextClientCode(studioId)
    const dup = duplicateCliente(selected, code)
    previousIdRef.current = selectedId
    setClienti(prev => [dup, ...prev])
    setSelectedId(dup.id)
    setEditing(structuredClone(dup))
    setSnapshot(null)
    setActiveTab('anagrafica')
  }, [selected, studioId, selectedId])

  const handleEliminaConfirm = useCallback(async () => {
    if (!selected) {
      setShowElimina(false)
      return
    }
    if (selected.isDraft) {
      setClienti(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(previousIdRef.current)
      setShowElimina(false)
      return
    }
    try {
      await deleteClient(selected.id)
      setClienti(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(null)
      setShowElimina(false)
    } catch {
      setError('Eliminazione non riuscita.')
    }
  }, [selected])

  const handleNuovoDoc = useCallback(
    (tipo: string) => {
      if (tipo === 'Vendita al banco') {
        openVenditaBanco()
        return
      }
      const routes: Record<string, string> = {
        Preventivo: '/nuovo-documento?type=preventivo',
        'Ordine cliente': '/nuovo-documento?type=ordine_cliente',
        Fattura: '/nuovo-documento?type=fattura',
        Ddt: '/nuovo-documento?type=ddt',
      }
      const clientParam = editing?.id ? `&clientId=${editing.id}` : ''
      navigate((routes[tipo] || '/documenti') + clientParam)
    },
    [navigate, openVenditaBanco, editing?.id],
  )

  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId ?? 'archivio'
    const rows = clienti
      .filter(c => !c.isDraft)
      .map(c => {
        const p = clienteToClientPayload(c, studioId!)
        return { id: c.id, createdAt: new Date(), ...p } as Client
      })
    exportClientsExcel(rows, archiveName)
  }, [clienti, studioId, activeArchive?.name])

  const openStampaFlow = useCallback((modello: string) => {
    setStampaModello(modello)
  }, [])

  const handleAnteprima = useCallback(
    (modello: string, _copie: number) => {
      const { innerHtml, title, filename } = buildClientiPrintHtml(modello, printCtx)
      setStampaModello(null)
      setAnteprimaHtml({ html: innerHtml, title, filename })
    },
    [printCtx],
  )

  const handleStampaDiretta = useCallback(
    (modello: string, copie: number) => {
      const { innerHtml, title } = buildClientiPrintHtml(modello, printCtx)
      for (let i = 0; i < copie; i++) printHtmlInIframe(innerHtml, title)
      setStampaModello(null)
    },
    [printCtx],
  )

  const handleSort = useCallback((col: ColonnaId) => {
    setSortColumn(prev => {
      if (prev === col) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
        return col
      }
      setSortDirection('asc')
      return col
    })
  }, [])

  const handleModificaSelez = useCallback(
    (campo: string, valore: string) => {
      setClienti(prev =>
        prev.map(c => {
          if (!selectedIds.has(c.id)) return c
          const next = structuredClone(c)
          if (campo === 'Pagamento') next.rapportiCommerciali.pagamento = valore
          else if (campo === 'Agente') next.rapportiCommerciali.agente = valore
          else if (campo === 'Listino') next.rapportiCommerciali.listino = valore
          else if (campo === 'Sconto') next.rapportiCommerciali.sconto = valore
          else if (campo === 'Nazione') next.sedeOperativa.nazione = valore
          if (c.id === selectedId) setEditing(next)
          return next
        }),
      )
    },
    [selectedIds, selectedId],
  )

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  if (!studioId) return <div className="clienti-empty">Caricamento archivio…</div>
  if (loading) return <div className="clienti-empty">Caricamento clienti…</div>

  return (
    <div className={`clienti-section${editing ? ' clienti-section--scheda-open' : ''}`} data-tutorial="page-clienti">
      {error ? <div className="clienti-section__banner">{error}</div> : null}

      <div className="clienti-section-header">
        <span className="clienti-section-header__title">Clienti</span>
        <div className="clienti-section-header__search">
          <span className="clienti-section-header__search-icon">🔍</span>
          <input
            className="clienti-section-header__search-input"
            placeholder="Cerca partita iva"
            value={searchPiva}
            onChange={e => setSearchPiva(e.target.value)}
          />
          <button type="button" className="clienti-section-header__search-caret" title="Opzioni ricerca">
            ▼
          </button>
        </div>
        <ClientiTopBar
          raggruppa={criterioRaggruppamento}
          filtraAttivo={filtraAttivo || Object.keys(filtriColonna).length > 0}
          selectionMode={selectionMode}
          colonneMenu={<ClientiColonneMenu visible={colonneVisibili} onChange={setColonneVisibili} />}
          onRaggruppaChange={c => {
            setCriterioRaggruppamento(c)
            setCollapsedGroups(new Set())
          }}
          onToggleFiltra={() => setFiltraAttivo(v => !v)}
          onToggleSelezione={() => {
            setSelectionMode(v => !v)
            if (selectionMode) setSelectedIds(new Set())
          }}
        />
      </div>

      <div className="clienti-section__body">
        <ClientiLista
          clienti={displayClienti}
          selectedId={selectedId}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          colonneVisibili={colonneVisibili}
          criterioRaggruppamento={criterioRaggruppamento}
          filtriColonna={filtriColonna}
          collapsedGroups={collapsedGroups}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          filtraAttivo={filtraAttivo}
          onSelect={handleSelect}
          onToggleGroup={toggleGroup}
          onToggleSelect={id => {
            setSelectedIds(prev => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }}
          onFilterChange={(col, f) => {
            setFiltriColonna(prev => {
              const next = { ...prev }
              if (f) next[col] = f
              else delete next[col]
              return next
            })
          }}
          onSort={handleSort}
          onOpenFilter={() => setFiltraAttivo(true)}
          onFilterPersonalizzato={col => setFiltroPersCol(col)}
        />

        <ClientiScheda
          cliente={editing}
          activeTab={activeTab}
          saving={saving}
          isDirty={isDirty}
          onTabChange={setActiveTab}
          onChange={setEditing}
          onSave={() => void handleSave()}
          onAnnulla={handleAnnulla}
          onCloseScheda={handleCloseScheda}
          onRicercaNazionale={() => setShowRicercaNaz(true)}
          onRicercaCap={() => setShowRicercaCap(true)}
          onProprietaComplete={() => setShowProprieta(true)}
          onSedeLegale={() => setShowSedeLegale(true)}
          onSediAmmin={() => setShowSediAmmin(true)}
          onSediExtra={() => setShowSediExtra(true)}
          onAggiungiIndirizzo={() => setShowSediExtra(true)}
          onContattiExtra={() => setShowContattiExtra(true)}
          onAggiungiContatto={() => setShowContattiExtra(true)}
          onAllegati={() => setShowAllegati(true)}
          onNuovoDoc={handleNuovoDoc}
          onDocumenti={() => navigate(editing?.id ? `/documenti?clientId=${editing.id}` : '/documenti')}
          onPagamenti={() => navigate(editing?.id ? `/pagamenti?clientId=${editing.id}` : '/pagamenti')}
          onImpegni={() => setShowImpegni(true)}
        />
      </div>

      <ClientiActionBar
        hasSelection={Boolean(selected)}
        hasMultiSelection={selectedIds.size > 1}
        onNuovo={() => void handleNuovo()}
        onDuplica={() => void handleDuplica()}
        onElimina={() => setShowElimina(true)}
        onComunicazione={tipo => {
          if (tipo.includes('WhatsApp')) {
            if (!editing?.contatti.cellulare?.trim()) setShowMancaCell(true)
            else setShowWhatsApp(true)
            return
          }
          if (tipo.includes('coordinate bancarie') && editing) {
            const body = encodeURIComponent(`Coordinate bancarie per ${editing.sedeOperativa.denominazione}`)
            const mail = editing.contatti.email || ''
            window.location.href = `mailto:${mail}?subject=Coordinate%20bancarie&body=${body}`
            return
          }
          if (tipo.includes('informativa dati personali') && editing) {
            const body = encodeURIComponent(
              `Gentile ${editing.sedeOperativa.denominazione},\n\nIn allegato l'informativa sul trattamento dei dati personali.\n\nCordiali saluti.`,
            )
            window.location.href = `mailto:${editing.contatti.email || ''}?subject=Informativa%20dati%20personali&body=${body}`
            return
          }
          if (tipo.includes('ricevuta fattura') && editing) {
            const body = encodeURIComponent(
              `Gentile ${editing.sedeOperativa.denominazione},\n\nLa preghiamo di inviarci i dati per la ricevuta/fattura elettronica.\n\nCordiali saluti.`,
            )
            window.location.href = `mailto:${editing.contatti.email || ''}?subject=Richiesta%20dati%20fattura%20elettronica&body=${body}`
            return
          }
          if (editing?.contatti.email) {
            const body = encodeURIComponent(`Comunicazione: ${tipo}\n\nGentile ${editing.sedeOperativa.denominazione},`)
            window.location.href = `mailto:${editing.contatti.email}?subject=${encodeURIComponent(tipo)}&body=${body}`
            return
          }
          alert(`Compila l'e-mail del cliente per inviare: ${tipo}`)
        }}
        onStampa={tipo => openStampaFlow(tipo)}
        onEtichette={() => {
          if (!editing?.sedeOperativa.indirizzo?.trim()) setShowEtichetteAddr(true)
          else openStampaFlow(ETICHETTE_MODELLO)
        }}
        onExcel={handleExcel}
        onModificaSelez={() => setShowModificaSelez(true)}
        onUtilita={tipo => {
          if (tipo.startsWith('Esporta')) handleExcel()
          else {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.xlsx,.xls,.csv'
            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file || !studioId) return
              try {
                const text = await file.text()
                const result = await importClientsFromCsv(text, studioId, () => getNextClientCode(studioId))
                if (result.error) setError(result.error)
                else {
                  setError(`Importati ${result.imported} clienti${result.skipped ? ` (${result.skipped} righe saltate)` : ''}.`)
                  await refresh()
                }
              } catch {
                setError('Importazione non riuscita.')
              }
            }
            input.click()
          }
        }}
      />

      {showElimina && selected ? (
        <ConfermaEliminaDialog nome={selected.sedeOperativa.denominazione} onYes={() => void handleEliminaConfirm()} onNo={() => setShowElimina(false)} />
      ) : null}
      {showValidazione ? <ValidazioneDenominazioneDialog onClose={() => setShowValidazione(false)} /> : null}
      {showInvia ? <InviaPagamentoDialog onClose={() => setShowInvia(false)} /> : null}
      {showAllegati ? (
        <AllegatiClientiDialog
          files={allegatiFiles}
          onSmartphone={() => {
            if (!editing) return
            const subject = encodeURIComponent(`Allegati — ${editing.sedeOperativa.denominazione}`)
            const body = encodeURIComponent('Invia una risposta con gli allegati da associare al cliente.')
            window.location.href = `mailto:${editing.contatti.email || ''}?subject=${subject}&body=${body}`
          }}
          onScan={() => alert('Nessuno scanner rilevato. Usa Importa.')}
          onImport={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = () => {
              const names = Array.from(input.files || []).map(f => f.name)
              if (names.length) setAllegatiFiles(prev => [...prev, ...names.map(name => ({ name }))])
            }
            input.click()
          }}
          onExport={() => {
            if (allegatiFiles.length === 0) {
              alert('Nessun allegato da esportare.')
              return
            }
            const blob = new Blob([allegatiFiles.map(f => f.name).join('\n')], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `allegati-${editing?.codice || 'cliente'}.txt`
            a.click()
            URL.revokeObjectURL(url)
          }}
          onRename={() => {
            if (!allegatiFiles.length) return
            const name = window.prompt('Nuovo nome allegato', allegatiFiles[allegatiFiles.length - 1].name)
            if (!name?.trim()) return
            setAllegatiFiles(prev => [...prev.slice(0, -1), { ...prev[prev.length - 1], name: name.trim() }])
          }}
          onDelete={() => setAllegatiFiles(prev => prev.slice(0, -1))}
          onPrint={() => {
            if (!allegatiFiles.length) return
            const html = `<html><body><h3>Allegati cliente</h3><ul>${allegatiFiles.map(f => `<li>${f.name}</li>`).join('')}</ul></body></html>`
            printHtmlInIframe(html, 'Allegati cliente')
          }}
          onClose={() => setShowAllegati(false)}
        />
      ) : null}
      {showImpegni && editing ? <ImpegniDialog nomeCliente={editing.sedeOperativa.denominazione} onClose={() => setShowImpegni(false)} /> : null}
      {showRicercaNaz ? (
        <RicercaSoggettiNazionaleDialog codFiscale={editing?.codFiscale || ''} onClose={() => setShowRicercaNaz(false)} onOk={() => setShowRicercaNaz(false)} />
      ) : null}
      {showRicercaCap ? (
        <RicercaCapCittaDialog
          onSelect={(cap, citta, prov) => {
            if (editing) setEditing({ ...editing, sedeOperativa: { ...editing.sedeOperativa, cap, citta, prov } })
            setShowRicercaCap(false)
          }}
          onClose={() => setShowRicercaCap(false)}
        />
      ) : null}
      {showWhatsApp && editing ? (
        <WhatsAppNumeriDialog
          cliente={editing}
          onVoceCorrente={() => {
            const text = encodeURIComponent(`Comunicazione per ${editing.sedeOperativa.denominazione}`)
            window.open(`https://wa.me/${editing.contatti.cellulare.replace(/\D/g, '')}?text=${text}`, '_blank')
            setShowWhatsApp(false)
          }}
          onVediAssociati={() => {
            const nums = [editing.contatti.telefono, editing.contatti.cellulare].filter(Boolean)
            setError(nums.length ? `Numeri associati: ${nums.join(', ')}` : 'Nessun numero associato.')
            setShowWhatsApp(false)
          }}
          onClose={() => setShowWhatsApp(false)}
        />
      ) : null}
      {showMancaCell ? <MancaCellulareDialog onClose={() => setShowMancaCell(false)} /> : null}
      {showEtichetteAddr ? (
        <EtichetteIndirizzoDialog
          onSi={() => {
            setShowEtichetteAddr(false)
            setShowEtichetteQuale(true)
          }}
          onNo={() => {
            setShowEtichetteAddr(false)
            openStampaFlow(ETICHETTE_MODELLO)
          }}
        />
      ) : null}
      {showEtichetteQuale ? (
        <EtichetteQualeIndirizzoDialog
          onOk={() => {
            setShowEtichetteQuale(false)
            openStampaFlow(ETICHETTE_MODELLO)
          }}
          onCancel={() => setShowEtichetteQuale(false)}
        />
      ) : null}
      {showModificaSelez ? (
        <ModificaSelezioneDialog count={selectedIds.size} onApplica={handleModificaSelez} onClose={() => setShowModificaSelez(false)} />
      ) : null}
      {stampaModello ? (
        <ClientiStampaDialog
          modelli={[stampaModello]}
          modelloDefault={stampaModello}
          onClose={() => setStampaModello(null)}
          onAnteprima={handleAnteprima}
          onStampa={handleStampaDiretta}
        />
      ) : null}
      {anteprimaHtml ? (
        <ClientiAnteprimaStampaDialog
          innerHtml={anteprimaHtml.html}
          meta={{ title: anteprimaHtml.title, filename: anteprimaHtml.filename }}
          onClose={() => setAnteprimaHtml(null)}
        />
      ) : null}

      {showSedeLegale && editing ? (
        <SedeLegaleDialog
          sede={editing.sedeLegale}
          onSave={s => {
            setEditing({ ...editing, sedeLegale: s })
            setShowSedeLegale(false)
          }}
          onClose={() => setShowSedeLegale(false)}
        />
      ) : null}
      {showSediAmmin && editing ? (
        <SediListaDialog
          title="Sedi amministrative"
          sedi={editing.sediAmmin}
          onSave={s => setEditing({ ...editing, sediAmmin: s })}
          onClose={() => setShowSediAmmin(false)}
        />
      ) : null}
      {showSediExtra && editing ? (
        <SediListaDialog
          title="Altri indirizzi"
          sedi={editing.sediExtra}
          onSave={s => setEditing({ ...editing, sediExtra: s })}
          onClose={() => setShowSediExtra(false)}
        />
      ) : null}
      {showContattiExtra && editing ? (
        <ContattiExtraDialog
          contatti={editing.contattiExtra}
          onSave={c => setEditing({ ...editing, contattiExtra: c })}
          onClose={() => setShowContattiExtra(false)}
        />
      ) : null}
      {showProprieta && editing ? <ProprietaCompleteDialog cliente={editing} onClose={() => setShowProprieta(false)} /> : null}
      {filtroPersCol ? (
        <FiltroPersonalizzatoDialog
          colonna={COLONNE_DEF.find(c => c.id === filtroPersCol)?.label || filtroPersCol}
          onApply={expr => {
            if (!expr.trim()) {
              setFiltriColonna(prev => {
                const next = { ...prev }
                delete next[filtroPersCol]
                return next
              })
            } else {
              setFiltriColonna(prev => ({
                ...prev,
                [filtroPersCol]: { kind: 'text', selected: new Set(), showEmpty: true, showAll: false, search: expr.trim() },
              }))
            }
          }}
          onClose={() => setFiltroPersCol(null)}
        />
      ) : null}
    </div>
  )
}
