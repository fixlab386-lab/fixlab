import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import { addClient, deleteClient, getNextClientCode, listenClients, updateClient } from '../../../lib/firestore'
import { fetchClientsPage } from '../../../lib/firestorePagination'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import PaginatedFilterHint from '../../../components/ui/PaginatedFilterHint'
import { buildClientiPrintHtml } from '../../../lib/clientiPrint'
import { printHtmlInIframe } from '../../../lib/printDocument'
import type { Client } from '../../../types'
import { exportClientsExcel } from '../../../components/clients/exportClientsExcel'
import { SectionHeader } from '../../../components/ui'
import { importClientsFromCsv } from '../../lib/importAnagraficaCsv'
import ClientiActionBar from './ClientiActionBar'
import ClientiColonneMenu from './ClientiColonneMenu'
import ClientiLista from './ClientiLista'
import ClientiScheda from './ClientiScheda'
import ClientiTopBar from './ClientiTopBar'
import { DEFAULT_COLONNE, COLONNE_DEF } from './constants'
import ClientiAnteprimaStampaDialog from './dialogs/ClientiAnteprimaStampaDialog'
import ClientiStampaDialog from './dialogs/ClientiStampaDialog'
import {
  ConfermaEliminaDialog,
  ImpegniDialog,
  InviaPagamentoDialog,
  ModificaSelezioneDialog,
  ValidazioneDenominazioneDialog,
} from './dialogs/ClientiDialogs'
import RicercaSoggettiNazionaleDialog from '../shared/RicercaSoggettiNazionaleDialog'
import SubjectDocumentsDialog from '../shared/SubjectDocumentsDialog'
import { useSubjectDocumentActions } from '../../lib/useSubjectDocumentActions'
import { applySoggettoRicerca } from '../shared/applySoggettoRicerca'
import type { SoggettoRicercaRecord } from '../../lib/ricercaSoggetto'
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
import '../../theme/danea-anagrafica.css'
import '../../theme/gestionale-tokens.css'

export default function ClientiSection() {
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const { openNuovoDocFromLabel, openSubjectDocuments, closeSubjectDocuments, documentsDialog } =
    useSubjectDocumentActions()

  const {
    data: liveClients,
    syncing,
    loadingMore,
    hasMore,
    truncated,
    error: loadError,
    loadMore,
    showInitialSpinner,
  } = useStudioPagedLiveQuery(studioId, listenClients, fetchClientsPage, Boolean(studioId))
  const [draftClienti, setDraftClienti] = useState<Cliente[]>([])
  const [patchedClienti, setPatchedClienti] = useState<Record<string, Cliente>>({})
  const clienti = useMemo(() => {
    const live = liveClients.map(clientToCliente)
    const liveIds = new Set(live.map(c => c.id))
    const drafts = draftClienti.filter(d => d.isDraft || !liveIds.has(d.id))
    const draftIds = new Set(drafts.map(d => d.id))
    return [...drafts, ...live.filter(c => !draftIds.has(c.id))].map(c => patchedClienti[c.id] ?? c)
  }, [liveClients, draftClienti, patchedClienti])
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
  const [showImpegni, setShowImpegni] = useState(false)
  const [showRicercaNaz, setShowRicercaNaz] = useState(false)
  const [showModificaSelez, setShowModificaSelez] = useState(false)
  const [stampaModello, setStampaModello] = useState<string | null>(null)
  const [anteprimaHtml, setAnteprimaHtml] = useState<{ html: string; title: string; filename: string } | null>(null)
  const [showSedeLegale, setShowSedeLegale] = useState(false)
  const [showSediAmmin, setShowSediAmmin] = useState(false)
  const [showSediExtra, setShowSediExtra] = useState(false)
  const [showContattiExtra, setShowContattiExtra] = useState(false)
  const [showProprieta, setShowProprieta] = useState(false)
  const [filtroPersCol, setFiltroPersCol] = useState<ColonnaId | null>(null)

  const previousIdRef = useRef<string | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedId) {
      setEditing(null)
      setSnapshot(null)
      lastLoadedIdRef.current = null
      return
    }
    const record = clienti.find(c => c.id === selectedId)
    if (!record) return
    if (lastLoadedIdRef.current !== selectedId) {
      lastLoadedIdRef.current = selectedId
      setEditing(structuredClone(record))
      setSnapshot(structuredClone(record))
    }
  }, [selectedId, clienti])

  const selected = useMemo(() => clienti.find(c => c.id === selectedId) || null, [clienti, selectedId])

  const studioSoggettiRecords = useMemo<SoggettoRicercaRecord[]>(
    () =>
      clienti
        .filter(c => !c.isDraft)
        .map(c => ({
          denominazione: c.sedeOperativa.denominazione,
          indirizzo: c.sedeOperativa.indirizzo,
          cap: c.sedeOperativa.cap,
          citta: c.sedeOperativa.citta,
          prov: c.sedeOperativa.prov,
          cf: c.codFiscale,
          piva: c.partitaIva,
        })),
    [clienti],
  )

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

  const hasScopedFilters = useMemo(
    () => truncated && (Boolean(searchPiva.trim()) || Object.keys(filtriColonna).length > 0 || filtraAttivo),
    [truncated, searchPiva, filtriColonna, filtraAttivo],
  )

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
    setDraftClienti(prev => [draft, ...prev])
    setSelectedId(draft.id)
    setEditing(structuredClone(draft))
    setSnapshot(null)
    setActiveTab('anagrafica')
  }, [studioId, selectedId])

  const handleAnnulla = useCallback(() => {
    if (editing?.isDraft) {
      setDraftClienti(prev => prev.filter(c => c.id !== editing.id))
      setSelectedId(previousIdRef.current)
      return
    }
    if (snapshot) setEditing(structuredClone(snapshot))
  }, [editing, snapshot])

  const handleCloseScheda = useCallback(() => {
    if (isDirty && !window.confirm('Modifiche non salvate. Chiudere la scheda?')) return
    if (editing?.isDraft) {
      setDraftClienti(prev => prev.filter(c => c.id !== editing.id))
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
        setDraftClienti(prev => prev.filter(c => c.id !== editing.id))
        lastLoadedIdRef.current = ref.id
        setSelectedId(ref.id)
      } else {
        await updateClient(editing.id, payload)
        const saved = { ...editing, isDraft: false }
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
    setDraftClienti(prev => [dup, ...prev])
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
      setDraftClienti(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(previousIdRef.current)
      setShowElimina(false)
      return
    }
    try {
      await deleteClient(selected.id)
      setDraftClienti(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(null)
      setShowElimina(false)
    } catch {
      setError('Eliminazione non riuscita.')
    }
  }, [selected])

  const handleNuovoDoc = useCallback(
    (tipo: string) => {
      const active = editing ?? selected
      const clientId =
        active?.id && !active.isDraft && !active.id.startsWith('draft-') ? active.id : undefined
      if (!clientId) {
        setError('Salva il cliente prima di creare un documento collegato.')
        return
      }
      setError(null)
      const ok = openNuovoDocFromLabel(tipo, { clientId })
      if (!ok) setError(`Tipo documento «${tipo}» non ancora disponibile.`)
    },
    [editing, selected, openNuovoDocFromLabel],
  )

  const handleDocumenti = useCallback(() => {
    if (!editing?.id || editing.isDraft || editing.id.startsWith('draft-')) {
      setError('Salva il cliente prima di aprire i documenti collegati.')
      return
    }
    setError(null)
    openSubjectDocuments({
      subjectId: editing.id,
      subjectName: editing.sedeOperativa.denominazione,
      subjectType: 'client',
    })
  }, [editing, openSubjectDocuments])

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
      setPatchedClienti(prev => {
        const next = { ...prev }
        for (const id of selectedIds) {
          const base = clienti.find(c => c.id === id)
          if (!base) continue
          const item = structuredClone(prev[id] ?? base)
          if (campo === 'Pagamento') item.rapportiCommerciali.pagamento = valore
          else if (campo === 'Agente') item.rapportiCommerciali.agente = valore
          else if (campo === 'Listino') item.rapportiCommerciali.listino = valore
          else if (campo === 'Sconto') item.rapportiCommerciali.sconto = valore
          else if (campo === 'Nazione') item.sedeOperativa.nazione = valore
          next[id] = item
          if (id === selectedId) setEditing(item)
        }
        return next
      })
    },
    [selectedIds, selectedId, clienti],
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

  return (
    <div className={`gestionale-page clienti-section danea-section${editing ? ' clienti-section--scheda-open' : ''}`} data-tutorial="page-clienti">
      {syncing && clienti.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinner ? <div className="gestionale-page-skeleton">Caricamento clienti…</div> : null}
      {error || loadError ? <div className="clienti-section__banner">{error || loadError}</div> : null}

      <SectionHeader
        title="Clienti"
        searchValue={searchPiva}
        onSearchChange={setSearchPiva}
        searchPlaceholder="Cerca denominazione"
        actions={
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
        }
      />

      <div className="clienti-section__body">
        <div className="danea-section__lista-col">
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
          <PaginatedFilterHint visible={hasScopedFilters} loading={loadingMore} onLoadMore={loadMore} />
          <LoadMoreBar hasMore={hasMore} loading={loadingMore} truncated={truncated} onLoadMore={loadMore} />

          <ClientiActionBar
            hasSelection={Boolean(selected)}
            hasMultiSelection={selectedIds.size > 1}
            onNuovo={() => void handleNuovo()}
            onDuplica={() => void handleDuplica()}
            onElimina={() => setShowElimina(true)}
            onStampa={tipo => openStampaFlow(tipo)}
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
                    }
                  } catch {
                    setError('Importazione non riuscita.')
                  }
                }
                input.click()
              }
            }}
          />
        </div>

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
          onProprietaComplete={() => setShowProprieta(true)}
          onSedeLegale={() => setShowSedeLegale(true)}
          onSediAmmin={() => setShowSediAmmin(true)}
          onSediExtra={() => setShowSediExtra(true)}
          onAggiungiIndirizzo={() => setShowSediExtra(true)}
          onContattiExtra={() => setShowContattiExtra(true)}
          onAggiungiContatto={() => setShowContattiExtra(true)}
          onNuovoDoc={handleNuovoDoc}
          onDocumenti={handleDocumenti}
          onPagamenti={() => navigate(editing?.id ? `/pagamenti?clientId=${editing.id}` : '/pagamenti')}
          onImpegni={() => setShowImpegni(true)}
        />
      </div>

      {showElimina && selected ? (
        <ConfermaEliminaDialog nome={selected.sedeOperativa.denominazione} onYes={() => void handleEliminaConfirm()} onNo={() => setShowElimina(false)} />
      ) : null}
      {showValidazione ? <ValidazioneDenominazioneDialog onClose={() => setShowValidazione(false)} /> : null}
      {showInvia ? <InviaPagamentoDialog onClose={() => setShowInvia(false)} /> : null}
      {showImpegni && editing ? <ImpegniDialog nomeCliente={editing.sedeOperativa.denominazione} onClose={() => setShowImpegni(false)} /> : null}
      {showRicercaNaz && editing ? (
        <RicercaSoggettiNazionaleDialog
          initialQuery={editing.codFiscale || editing.partitaIva || editing.sedeOperativa.denominazione}
          studioRecords={studioSoggettiRecords}
          onClose={() => setShowRicercaNaz(false)}
          onSelect={result => setEditing(applySoggettoRicerca(editing, result))}
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
      {documentsDialog ? (
        <SubjectDocumentsDialog target={documentsDialog} onClose={closeSubjectDocuments} />
      ) : null}
    </div>
  )
}
