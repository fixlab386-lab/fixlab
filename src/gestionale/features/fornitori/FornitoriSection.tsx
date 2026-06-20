import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import { useSubjectDocumentActions } from '../../lib/useSubjectDocumentActions'
import {
  addSupplier,
  deleteSupplier,
  getNextSupplierCode,
  listenSuppliers,
  updateSupplier,
} from '../../../lib/firestore'
import { fetchSuppliersPage } from '../../../lib/firestorePagination'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import PaginatedFilterHint from '../../../components/ui/PaginatedFilterHint'
import { buildFornitoriPrintHtml } from '../../../lib/fornitoriPrint'
import { printHtmlInIframe } from '../../../lib/printDocument'
import type { Supplier } from '../../../types'
import { exportSuppliersExcel } from '../../lib/exportSuppliersExcel'
import { SectionHeader } from '../../../components/ui'
import { importSuppliersFromCsv } from '../../lib/importAnagraficaCsv'
import FornitoriActionBar from './FornitoriActionBar'
import FornitoriColonneMenu from './FornitoriColonneMenu'
import FornitoriLista from './FornitoriLista'
import FornitoriScheda from './FornitoriScheda'
import FornitoriTopBar from './FornitoriTopBar'
import { DEFAULT_COLONNE, ETICHETTE_MODELLO, COLONNE_DEF } from './constants'
import FornitoriAnteprimaStampaDialog from './dialogs/FornitoriAnteprimaStampaDialog'
import FornitoriStampaDialog from './dialogs/FornitoriStampaDialog'
import {
  ConfermaEliminaDialog,
  EtichetteIndirizzoDialog,
  EtichetteQualeIndirizzoDialog,
  ImpegniDialog,
  InviaPagamentoDialog,
  ModificaSelezioneDialog,
  ValidazioneDenominazioneDialog,
} from './dialogs/FornitoriDialogs'
import RicercaSoggettiNazionaleDialog from '../shared/RicercaSoggettiNazionaleDialog'
import SubjectDocumentsDialog from '../shared/SubjectDocumentsDialog'
import { applySoggettoRicerca } from '../shared/applySoggettoRicerca'
import type { SoggettoRicercaRecord } from '../../lib/ricercaSoggetto'
import {
  ContattiExtraDialog,
  FiltroPersonalizzatoDialog,
  ProprietaCompleteDialog,
  SedeLegaleDialog,
  SediListaDialog,
} from './dialogs/FornitoriAnagraficaDialogs'
import {
  supplierToFornitore,
  fornitoreToSupplierPayload,
  emptyFornitore,
  type Fornitore,
  type ColonnaId,
  type ColumnFilter,
  type RaggruppaCriterio,
  type SchedaTabId,
} from './types'
import { applyColumnFilters, duplicateFornitore } from './utils'
import '../../theme/clienti-section.css'
import '../../theme/danea-anagrafica.css'
import '../../theme/fornitori-section.css'
import '../../theme/gestionale-tokens.css'

export default function FornitoriSection({ onRegisterNuovo }: { onRegisterNuovo?: (fn: () => void) => void } = {}) {
  const { studioId, activeArchive } = useActiveStudio()
  const navigate = useNavigate()
  const { openNuovoDocFromLabel, openSubjectDocuments, closeSubjectDocuments, documentsDialog } =
    useSubjectDocumentActions()

  const {
    data: liveSuppliers,
    syncing,
    loadingMore,
    hasMore,
    truncated,
    error: loadError,
    loadMore,
    showInitialSpinner,
  } = useStudioPagedLiveQuery(studioId, listenSuppliers, fetchSuppliersPage, Boolean(studioId))
  const [draftFornitori, setDraftFornitori] = useState<Fornitore[]>([])
  const [patchedFornitori, setPatchedFornitori] = useState<Record<string, Fornitore>>({})
  const fornitori = useMemo(() => {
    const live = liveSuppliers.map(supplierToFornitore)
    const liveIds = new Set(live.map(f => f.id))
    const drafts = draftFornitori.filter(d => d.isDraft || !liveIds.has(d.id))
    const draftIds = new Set(drafts.map(d => d.id))
    return [...drafts, ...live.filter(f => !draftIds.has(f.id))].map(f => patchedFornitori[f.id] ?? f)
  }, [liveSuppliers, draftFornitori, patchedFornitori])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Fornitore | null>(null)
  const [snapshot, setSnapshot] = useState<Fornitore | null>(null)
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

  const previousIdRef = useRef<string | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)

  const selected = useMemo(() => fornitori.find(c => c.id === selectedId) || null, [fornitori, selectedId])

  const studioSoggettiRecords = useMemo<SoggettoRicercaRecord[]>(
    () =>
      fornitori
        .filter(f => !f.isDraft)
        .map(f => ({
          denominazione: f.sedeOperativa.denominazione,
          indirizzo: f.sedeOperativa.indirizzo,
          cap: f.sedeOperativa.cap,
          citta: f.sedeOperativa.citta,
          prov: f.sedeOperativa.prov,
          cf: f.codFiscale,
          piva: f.partitaIva,
        })),
    [fornitori],
  )

  useEffect(() => {
    if (!selectedId) {
      setEditing(null)
      setSnapshot(null)
      lastLoadedIdRef.current = null
      return
    }
    const record = fornitori.find(c => c.id === selectedId)
    if (!record) return
    if (lastLoadedIdRef.current !== selectedId) {
      lastLoadedIdRef.current = selectedId
      setEditing(structuredClone(record))
      setSnapshot(structuredClone(record))
    }
  }, [selectedId, fornitori])

  const isDirty = useMemo(() => {
    if (!editing || !snapshot) return editing?.isDraft ?? false
    return JSON.stringify(editing) !== JSON.stringify(snapshot)
  }, [editing, snapshot])

  const displayFornitori = useMemo(() => {
    let list = fornitori
    const q = searchPiva.trim().toLowerCase()
    if (q) {
      list = list.filter(
        c =>
          c.sedeOperativa.denominazione.toLowerCase().includes(q) ||
          c.codice.toLowerCase().includes(q) ||
          c.sedeOperativa.citta.toLowerCase().includes(q) ||
          c.partitaIva.toLowerCase().includes(q) ||
          c.codFiscale.toLowerCase().includes(q),
      )
    }
    return list
  }, [fornitori, searchPiva])

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
      fornitore: editing,
      fornitori: applyColumnFilters(displayFornitori, filtriColonna),
      visibleCols: visibleColIds,
    }),
    [activeArchive?.name, studioId, editing, displayFornitori, filtriColonna, visibleColIds],
  )

  const handleSelect = useCallback((c: Fornitore) => {
    setSelectedId(c.id)
    setActiveTab('anagrafica')
  }, [])

  const handleNuovo = useCallback(async () => {
    if (!studioId) return
    previousIdRef.current = selectedId
    const code = await getNextSupplierCode(studioId)
    const draft = emptyFornitore(code)
    setDraftFornitori(prev => [draft, ...prev])
    setSelectedId(draft.id)
    setEditing(structuredClone(draft))
    setSnapshot(null)
    setActiveTab('anagrafica')
  }, [studioId, selectedId])

  useEffect(() => {
    onRegisterNuovo?.(() => void handleNuovo())
  }, [onRegisterNuovo, handleNuovo])

  const handleAnnulla = useCallback(() => {
    if (editing?.isDraft) {
      setDraftFornitori(prev => prev.filter(c => c.id !== editing.id))
      setSelectedId(previousIdRef.current)
      return
    }
    if (snapshot) setEditing(structuredClone(snapshot))
  }, [editing, snapshot])

  const handleCloseScheda = useCallback(() => {
    if (isDirty && !window.confirm('Modifiche non salvate. Chiudere la scheda?')) return
    if (editing?.isDraft) {
      setDraftFornitori(prev => prev.filter(c => c.id !== editing.id))
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
      const payload = fornitoreToSupplierPayload(editing, studioId)
      if (editing.isDraft) {
        const ref = await addSupplier(payload)
        setDraftFornitori(prev => prev.filter(c => c.id !== editing.id))
        lastLoadedIdRef.current = ref.id
        setSelectedId(ref.id)
      } else {
        await updateSupplier(editing.id, payload)
        const saved = { ...editing, isDraft: false }
        setEditing(structuredClone(saved))
        setSnapshot(structuredClone(saved))
      }
      setError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Salvataggio non riuscito.'
      setError(msg.includes('undefined') ? 'Salvataggio non riuscito: dati non validi.' : `Salvataggio non riuscito. ${msg}`)
    } finally {
      setSaving(false)
    }
  }, [studioId, editing])

  const handleDuplica = useCallback(async () => {
    if (!selected || !studioId) return
    const code = await getNextSupplierCode(studioId)
    const dup = duplicateFornitore(selected, code)
    previousIdRef.current = selectedId
    setDraftFornitori(prev => [dup, ...prev])
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
      setDraftFornitori(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(previousIdRef.current)
      setShowElimina(false)
      return
    }
    try {
      await deleteSupplier(selected.id)
      setDraftFornitori(prev => prev.filter(c => c.id !== selected.id))
      setSelectedId(null)
      setShowElimina(false)
    } catch {
      setError('Eliminazione non riuscita.')
    }
  }, [selected])

  const handleNuovoDoc = useCallback(
    (tipo: string) => {
      const supplierId =
        editing?.id && !editing.isDraft && !editing.id.startsWith('draft-') ? editing.id : undefined
      const ok = openNuovoDocFromLabel(tipo, supplierId ? { supplierId } : undefined)
      if (!ok) setError(`Tipo documento «${tipo}» non ancora disponibile.`)
    },
    [editing?.id, editing?.isDraft, openNuovoDocFromLabel],
  )

  const handleDocumenti = useCallback(() => {
    if (!editing?.id || editing.isDraft || editing.id.startsWith('draft-')) {
      setError('Salva il fornitore prima di aprire i documenti collegati.')
      return
    }
    setError(null)
    openSubjectDocuments({
      subjectId: editing.id,
      subjectName: editing.sedeOperativa.denominazione,
      subjectType: 'supplier',
    })
  }, [editing, openSubjectDocuments])

  const handleExcel = useCallback(() => {
    const archiveName = activeArchive?.name ?? studioId ?? 'archivio'
    const rows = fornitori
      .filter(c => !c.isDraft)
      .map(c => {
        const p = fornitoreToSupplierPayload(c, studioId!)
        return { id: c.id, createdAt: new Date(), ...p } as Supplier
      })
    exportSuppliersExcel(rows, archiveName)
  }, [fornitori, studioId, activeArchive?.name])

  const openStampaFlow = useCallback((modello: string) => {
    setStampaModello(modello)
  }, [])

  const handleAnteprima = useCallback(
    (modello: string, _copie: number) => {
      const { innerHtml, title, filename } = buildFornitoriPrintHtml(modello, printCtx)
      setStampaModello(null)
      setAnteprimaHtml({ html: innerHtml, title, filename })
    },
    [printCtx],
  )

  const handleStampaDiretta = useCallback(
    (modello: string, copie: number) => {
      const { innerHtml, title } = buildFornitoriPrintHtml(modello, printCtx)
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
      setPatchedFornitori(prev => {
        const next = { ...prev }
        for (const id of selectedIds) {
          const base = fornitori.find(c => c.id === id)
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
    [selectedIds, selectedId, fornitori],
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
    <div className={`gestionale-page clienti-section fornitori-section danea-section${editing ? ' clienti-section--scheda-open' : ''}`} data-tutorial="page-fornitori">
      {syncing && fornitori.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinner ? <div className="gestionale-page-skeleton">Caricamento fornitori…</div> : null}
      {error || loadError ? <div className="clienti-section__banner">{error || loadError}</div> : null}

      <SectionHeader
        title="Fornitori"
        searchValue={searchPiva}
        onSearchChange={setSearchPiva}
        searchPlaceholder="Cerca denominazione"
        actions={
          <FornitoriTopBar
            raggruppa={criterioRaggruppamento}
            filtraAttivo={filtraAttivo || Object.keys(filtriColonna).length > 0}
            selectionMode={selectionMode}
            colonneMenu={<FornitoriColonneMenu visible={colonneVisibili} onChange={setColonneVisibili} />}
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
          <FornitoriLista
            fornitori={displayFornitori}
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

          <FornitoriActionBar
            hasSelection={Boolean(selected)}
            hasMultiSelection={selectedIds.size > 1}
            onNuovo={() => void handleNuovo()}
            onDuplica={() => void handleDuplica()}
            onElimina={() => setShowElimina(true)}
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
                    const result = await importSuppliersFromCsv(text, studioId, () => getNextSupplierCode(studioId))
                    if (result.error) setError(result.error)
                    else {
                      setError(`Importati ${result.imported} fornitori${result.skipped ? ` (${result.skipped} righe saltate)` : ''}.`)
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

        <FornitoriScheda
          fornitore={editing}
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
          onPagamenti={() => navigate(editing?.id ? `/pagamenti?supplierId=${editing.id}` : '/pagamenti')}
          onImpegni={() => setShowImpegni(true)}
        />
      </div>

      {showElimina && selected ? (
        <ConfermaEliminaDialog nome={selected.sedeOperativa.denominazione} onYes={() => void handleEliminaConfirm()} onNo={() => setShowElimina(false)} />
      ) : null}
      {showValidazione ? <ValidazioneDenominazioneDialog onClose={() => setShowValidazione(false)} /> : null}
      {showInvia ? <InviaPagamentoDialog onClose={() => setShowInvia(false)} /> : null}
      {showImpegni && editing ? <ImpegniDialog nomeFornitore={editing.sedeOperativa.denominazione} onClose={() => setShowImpegni(false)} /> : null}
      {showRicercaNaz && editing ? (
        <RicercaSoggettiNazionaleDialog
          initialQuery={editing.codFiscale || editing.partitaIva || editing.sedeOperativa.denominazione}
          studioRecords={studioSoggettiRecords}
          onClose={() => setShowRicercaNaz(false)}
          onSelect={result => setEditing(applySoggettoRicerca(editing, result))}
        />
      ) : null}
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
        <FornitoriStampaDialog
          modelli={[stampaModello]}
          modelloDefault={stampaModello}
          onClose={() => setStampaModello(null)}
          onAnteprima={handleAnteprima}
          onStampa={handleStampaDiretta}
        />
      ) : null}
      {anteprimaHtml ? (
        <FornitoriAnteprimaStampaDialog
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
      {showProprieta && editing ? <ProprietaCompleteDialog fornitore={editing} onClose={() => setShowProprieta(false)} /> : null}
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
