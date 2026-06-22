import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useStudioLiveQuery } from '../../../hooks/useStudioLiveQuery'
import { useStudioPagedLiveQuery } from '../../../hooks/useStudioPagedLiveQuery'
import {
  addProduct,
  deleteProduct,
  listenCategories,
  getNextProductCode,
  listenProducts,
  listenStockMovements,
  updateProduct,
} from '../../../lib/firestore'
import { fetchProductsPage, fetchStockMovementsPage } from '../../../lib/firestorePagination'
import { loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import PaginatedFilterHint from '../../../components/ui/PaginatedFilterHint'
import type { Product } from '../../../types'
import { db } from '../../../firebase'
import type { Category } from '../../../types'
import { exportProductsExcel } from '../../lib/exportProductsExcel'
import { openEntitySpreadsheetImport } from '../../lib/openEntitySpreadsheetImport'
import ProdottiActionBar from './ProdottiActionBar'
import ProdottiLista from './ProdottiLista'
import ProdottiScheda from './ProdottiScheda'
import ProdottiTopBar from './ProdottiTopBar'
import { DEFAULT_COLONNE } from './constants'
import {
  CategorieProdottiDialog,
  ConfermaEliminaDialog,
  ImmagineProdottoDialog,
  ImpostazioniListinoDialog,
  OpzioniApplicazioneDialog,
  StampaProdottoDialog,
} from './dialogs/ProdottiDialogs'
import OperazioneMagazzinoModal, {
  createEmptyOperazioneMagazzino,
  createOperazioneMagazzinoWithProdotto,
  type OperazioneMagazzinoState,
} from '../magazzino/OperazioneMagazzinoModal'
import { commitOperazioneMagazzinoLine } from '../magazzino/commitOperazioneMagazzino'
import type { OperazioneMagazzinoMode } from '../magazzino/constants'
import { isStockFunctionUnavailable } from '../../../lib/commitStockMovement'
import {
  emptyProdotto,
  productToProdotto,
  prodottoToProductPayload,
  duplicateProdotto,
  tipologiaHaMagazzino,
  type ColonnaId,
  type ColumnFilter,
  type Prodotto,
  type RaggruppaCriterio,
  type SchedaTabId,
  type CercaVeloceCampo,
  type CercaVeloceModo,
} from './types'
import { applyCercaVeloce, ricalcolaListini, sortProdotti, aggiornaMagazzinoDisponibile } from './utils'
import { matchesProductCategoryTree } from '../../lib/categoryUtils'
import '../../theme/prodotti-section.css'
import '../../theme/danea-anagrafica.css'
import '../../theme/category-tree.css'
import '../../theme/gestionale-tokens.css'

export default function ProdottiSection() {
  const { user, userProfile } = useAuth()
  const { studioId, activeArchive } = useActiveStudio()

  const liveEnabled = Boolean(studioId)
  const {
    data: productRows,
    syncing: productsSyncing,
    loadingMore: productsLoadingMore,
    hasMore: productsHasMore,
    error: productsError,
    loadMore: loadMoreProducts,
    showInitialSpinner: productsInitial,
  } = useStudioPagedLiveQuery(studioId, listenProducts, fetchProductsPage, liveEnabled)
  const {
    data: movements,
    syncing: movementsSyncing,
    loadingMore: movementsLoadingMore,
    hasMore: movementsHasMore,
    loadMore: loadMoreMovements,
  } = useStudioPagedLiveQuery(studioId, listenStockMovements, fetchStockMovementsPage, liveEnabled)
  const { data: categories, loading: categoriesLoading } = useStudioLiveQuery(
    studioId,
    listenCategories,
    liveEnabled,
    500,
  )
  const [fornitori, setFornitori] = useState<string[]>([])
  useEffect(() => {
    if (!studioId) return
    void loadRecentSuppliers(studioId).then(rows => {
      setFornitori(rows.map(s => s.name).sort((a, b) => a.localeCompare(b, 'it')))
    })
  }, [studioId])
  const showInitialSpinner = productsInitial || categoriesLoading
  const syncing = productsSyncing || movementsSyncing
  const [bannerError, setBannerError] = useState<string | null>(null)
  const error = productsError || bannerError

  const prodotti = useMemo(
    () => sortProdotti(productRows.map(p => productToProdotto(p, movements))),
    [productRows, movements],
  )

  const [saving, setSaving] = useState(false)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Prodotto | null>(null)
  const [previousId, setPreviousId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SchedaTabId>('caratteristiche')

  const [criterioRaggruppamento, setCriterioRaggruppamento] = useState<RaggruppaCriterio>('Nessuno')
  const [filtriColonna, setFiltriColonna] = useState<Partial<Record<ColonnaId, ColumnFilter>>>({})
  const [colonneVisibili, setColonneVisibili] = useState(DEFAULT_COLONNE)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtraAttivo, setFiltraAttivo] = useState(false)
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null)
  const [mostraTotali, setMostraTotali] = useState(false)

  const [cercaCampo, setCercaCampo] = useState<CercaVeloceCampo>('codProdotto')
  const [cercaModo, setCercaModo] = useState<CercaVeloceModo>('contengono')
  const [cercaQuery, setCercaQuery] = useState('')
  const [prezziEspansi, setPrezziEspansi] = useState(false)

  const [showElimina, setShowElimina] = useState(false)
  const [showCategorie, setShowCategorie] = useState(false)
  const [showImpostazioniListino, setShowImpostazioniListino] = useState<string | null>(null)
  const [showOpzioniApp, setShowOpzioniApp] = useState(false)
  const [showImmagine, setShowImmagine] = useState(false)
  const [showStampa, setShowStampa] = useState<string | null>(null)
  const [operazioneMode, setOperazioneMode] = useState<OperazioneMagazzinoMode | null>(null)
  const [operazioneState, setOperazioneState] = useState<OperazioneMagazzinoState>(() =>
    createEmptyOperazioneMagazzino('load'),
  )
  const [operazioneSaving, setOperazioneSaving] = useState(false)
  const [operazioneSaveError, setOperazioneSaveError] = useState<string | null>(null)

  const showInfo = useCallback((msg: string) => {
    setBannerError(msg)
    window.setTimeout(() => setBannerError(e => (e === msg ? null : e)), 4000)
  }, [])

  const reloadCategories = useCallback(async () => {
    /* categorie sincronizzate in tempo reale */
  }, [])

  const produttori = useMemo(() => {
    const set = new Set<string>()
    for (const p of prodotti) {
      if (p.dettagli.produttore.trim()) set.add(p.dettagli.produttore)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'it'))
  }, [prodotti])

  const displayList = useMemo(() => {
    let list = prodotti
    if (editing?.isDraft && !list.some(p => p.id === editing.id)) {
      list = [editing, ...list]
    }
    list = applyCercaVeloce(list, cercaCampo, cercaModo, cercaQuery)
    if (categoryFilterId) {
      list = list.filter(p =>
        matchesProductCategoryTree(
          { categoryId: p.categoryId, subcategoryId: p.subcategoryId },
          categoryFilterId,
          categories,
        ),
      )
    }
    return list
  }, [prodotti, editing, cercaCampo, cercaModo, cercaQuery, categoryFilterId, categories])

  const hasScopedFilters = useMemo(
    () =>
      Boolean(cercaQuery.trim()) ||
      Object.keys(filtriColonna).length > 0 ||
      Boolean(categoryFilterId),
    [cercaQuery, filtriColonna, categoryFilterId],
  )

  const selected = useMemo(() => {
    if (editing && (editing.id === selectedId || editing.isDraft)) return editing
    return prodotti.find(p => p.id === selectedId) ?? null
  }, [prodotti, selectedId, editing])

  const isEditing = editing !== null

  const handleSelect = useCallback(
    (p: Prodotto) => {
      if (editing?.isDraft) return
      setSelectedId(p.id)
      setEditing(null)
      setActiveTab('caratteristiche')
    },
    [editing],
  )

  const handleNuovo = useCallback(async () => {
    if (!studioId) return
    const code = await getNextProductCode(studioId)
    const draft = emptyProdotto(studioId, code)
    setPreviousId(selectedId)
    setEditing(draft)
    setSelectedId(draft.id)
    setActiveTab('caratteristiche')
  }, [studioId, selectedId])

  const handleDuplica = useCallback(async () => {
    if (!selected || !studioId) return
    const code = await getNextProductCode(studioId)
    const dup = duplicateProdotto(selected, code)
    setPreviousId(selectedId)
    setEditing(dup)
    setSelectedId(dup.id)
    setActiveTab('caratteristiche')
  }, [selected, studioId, selectedId])

  const handleSalva = useCallback(async () => {
    if (!editing || !studioId) return
    if (!editing.descrizione.trim()) {
      alert('Inserire la descrizione del prodotto.')
      return
    }
    setSaving(true)
    try {
      const payload = prodottoToProductPayload(editing, categories)
      if (editing.isDraft) {
        const ref = await addProduct(payload)
        setSelectedId(ref.id)
      } else {
        await updateProduct(editing.id, payload)
      }
      setEditing(null)
      setBannerError(null)
    } catch {
      setBannerError('Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }, [editing, studioId, categories])

  const handleAnnulla = useCallback(() => {
    if (editing?.isDraft) {
      setSelectedId(previousId)
    }
    setEditing(null)
    if (previousId) {
      const prev = prodotti.find(p => p.id === previousId)
      if (prev) setSelectedId(prev.id)
    }
  }, [editing, previousId, prodotti])

  const handleEliminaConfirm = useCallback(async () => {
    const target = selected
    if (!target || target.isDraft) {
      setShowElimina(false)
      return
    }
    try {
      await deleteProduct(target.id)
      setSelectedId(null)
      setEditing(null)
      setShowElimina(false)
    } catch {
      setBannerError('Eliminazione non riuscita.')
    }
  }, [selected])

  const handleChange = useCallback((p: Prodotto) => {
    let next = { ...p }
    if (!tipologiaHaMagazzino(next.tipologia)) {
      next = { ...next, magazzino: undefined }
      if (activeTab === 'magazzino') setActiveTab('caratteristiche')
    } else if (!next.magazzino) {
      next = {
        ...next,
        magazzino: {
          giacenza: 0,
          impegnata: 0,
          ordinata: 0,
          disponibile: 0,
          scortaMinima: 0,
          ubicazione: next.dettagli.ubicazione,
          ordineMultiplo: 1,
          movimenti: [],
        },
      }
    } else {
      next = { ...next, magazzino: aggiornaMagazzinoDisponibile(next.magazzino) }
    }
    setEditing(next)
  }, [activeTab])

  const handleAggiornaListini = useCallback(() => {
    if (!editing && !selected) {
      alert('Seleziona un prodotto.')
      return
    }
    const target = editing ?? selected
    if (!target) return
    const updated = ricalcolaListini(target)
    handleChange(updated)
    showInfo('Listini ricalcolati.')
  }, [editing, selected, handleChange, showInfo])

  const openOperazioneFromScheda = useCallback(
    (mode: OperazioneMagazzinoMode) => {
      const target = editing ?? selected
      if (!target?.magazzino) {
        alert('Questo prodotto non gestisce il magazzino.')
        return
      }
      if (target.isDraft) {
        alert('Salva il prodotto prima di registrare movimenti di magazzino.')
        return
      }
      setOperazioneMode(mode)
      setOperazioneState(createOperazioneMagazzinoWithProdotto(mode, target))
      setOperazioneSaveError(null)
    },
    [editing, selected],
  )

  const handleSaveOperazione = useCallback(async () => {
    if (!studioId || !operazioneMode || operazioneState.lines.length === 0) return
    setOperazioneSaving(true)
    setOperazioneSaveError(null)
    setBannerError(null)
    try {
      for (const line of operazioneState.lines) {
        await commitOperazioneMagazzinoLine(operazioneMode, operazioneState, line, {
          studioId,
          operatorId: user?.uid,
          operatorName: userProfile?.name,
        })
      }
      const activeId = editing?.id ?? selectedId
      if (activeId && operazioneState.lines.some(l => l.productId === activeId)) {
        const snap = await getDoc(doc(db, 'products', activeId))
        if (snap.exists()) {
          const fresh = productToProdotto({ id: snap.id, ...snap.data() } as Product, movements)
          if (editing?.id === activeId) setEditing(structuredClone(fresh))
        }
      }
      setOperazioneMode(null)
      showInfo(
        operazioneMode === 'load'
          ? 'Carico magazzino registrato.'
          : operazioneMode === 'unload'
            ? 'Scarico magazzino registrato.'
            : 'Rettifica giacenza registrata.',
      )
    } catch (err) {
      if (isStockFunctionUnavailable(err)) {
        setBannerError('Alcune giacenze potrebbero non essere aggiornate (function non attiva).')
        setOperazioneMode(null)
      } else {
        setOperazioneSaveError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
      }
    } finally {
      setOperazioneSaving(false)
    }
  }, [
    studioId,
    operazioneMode,
    operazioneState,
    user?.uid,
    userProfile?.name,
    editing?.id,
    selectedId,
    movements,
    showInfo,
  ])

  const handleExcel = useCallback(() => {
    const rows = prodotti.map(p => ({
      id: p.id,
      studioId: p.studioId,
      code: p.codProdotto,
      name: p.descrizione,
      categoryName: p.categoria,
      brand: p.dettagli.produttore,
      model: '',
      price: p.prezzi.find(x => x.listinoId === 'privati')?.valore ?? 0,
      stock: p.magazzino?.giacenza ?? 0,
      typology: 'with_stock' as const,
      unitOfMeasure: p.um,
      categoryId: p.categoryId,
      prices: { privati: p.prezzi.find(x => x.listinoId === 'privati')?.valore ?? 0 },
      createdAt: new Date(),
    }))
    exportProductsExcel(rows, activeArchive?.name ?? studioId ?? 'prodotti')
  }, [prodotti, activeArchive?.name, studioId])

  if (!studioId) {
    return <div className="prodotti-empty-scheda">Caricamento profilo…</div>
  }

  return (
    <div className={`gestionale-page prodotti-section${selectedId && editing ? ' prodotti-section--scheda-open' : ''}`} data-tutorial="page-prodotti">
      {syncing && prodotti.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {showInitialSpinner ? <div className="gestionale-page-skeleton">Caricamento prodotti…</div> : null}
      {error ? <div className="prodotti-section__banner">{error}</div> : null}

      <div className="prodotti-section__body">
        <div className="prodotti-section__lista-col">
          <ProdottiLista
            prodotti={displayList}
            categories={categories}
            selectedId={selectedId}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            colonneVisibili={colonneVisibili}
            criterioRaggruppamento={criterioRaggruppamento}
            filtriColonna={filtriColonna}
            collapsedGroups={collapsedGroups}
            filtraAttivo={filtraAttivo}
            cercaCampo={cercaCampo}
            cercaModo={cercaModo}
            cercaQuery={cercaQuery}
            onCercaCampo={setCercaCampo}
            onCercaModo={setCercaModo}
            onCercaQuery={setCercaQuery}
            onSelect={p => {
              if (!isEditing || p.isDraft) handleSelect(p)
              else handleSelect(p)
            }}
            onToggleGroup={key => {
              setCollapsedGroups(prev => {
                const next = new Set(prev)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
            }}
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
            onOpenFilter={() => setFiltraAttivo(true)}
          />
          <PaginatedFilterHint
            visible={hasScopedFilters}
            loading={productsLoadingMore || movementsLoadingMore}
            onLoadMore={() => {
              if (productsHasMore) void loadMoreProducts()
              else if (movementsHasMore) void loadMoreMovements()
            }}
          />
          <LoadMoreBar
            hasMore={productsHasMore || movementsHasMore}
            loading={productsLoadingMore || movementsLoadingMore}
            onLoadMore={() => {
              if (productsHasMore) void loadMoreProducts()
              else if (movementsHasMore) void loadMoreMovements()
            }}
          />
        </div>

        <div className="prodotti-section__scheda-col">
          <ProdottiTopBar
            criterioRaggruppamento={criterioRaggruppamento}
            onRaggruppa={c => {
              setCriterioRaggruppamento(c)
              setCollapsedGroups(new Set())
            }}
            filtraAttivo={filtraAttivo || Object.keys(filtriColonna).length > 0 || Boolean(categoryFilterId)}
            onFiltra={() => {
              setFiltraAttivo(v => {
                if (v) setCategoryFilterId(null)
                return !v
              })
            }}
            selectionMode={selectionMode}
            onSelezione={() => {
              setSelectionMode(v => !v)
              if (selectionMode) setSelectedIds(new Set())
            }}
            colonneVisibili={colonneVisibili}
            onColonne={setColonneVisibili}
            mostraTotali={mostraTotali}
            onMostraTotali={setMostraTotali}
          />

          <ProdottiScheda
          prodotto={selected}
          activeTab={activeTab}
          categories={categories}
          fornitori={fornitori}
          produttori={produttori.length ? produttori : ['Apple', 'Samsung', 'Generico']}
          prezziEspansi={prezziEspansi}
          filtraAttivo={filtraAttivo}
          prodotti={prodotti}
          categoryFilterId={categoryFilterId}
          onCategoryFilter={setCategoryFilterId}
          onTabChange={setActiveTab}
          onChange={p => {
            setEditing(p)
            handleChange(p)
          }}
          onTogglePrezzi={() => setPrezziEspansi(v => !v)}
          onPrezziMenu={azione => {
            if (azione.includes('Opzioni')) setShowOpzioniApp(true)
            else setShowImpostazioniListino('privati')
          }}
          onCategorie={() => setShowCategorie(true)}
          onImmagine={() => setShowImmagine(true)}
          onCodiciAggiuntivi={() => showInfo('Codici aggiuntivi: usa il campo cod. barre in scheda.')}
          onComponenti={() => showInfo('Componenti: funzione disponibile in versione desktop completa.')}
          onCarica={() => openOperazioneFromScheda('load')}
          onScarica={() => openOperazioneFromScheda('unload')}
          onRettifica={() => openOperazioneFromScheda('adjust')}
        />
        </div>
      </div>

      <ProdottiActionBar
        hasSelection={!!selected}
        isEditing={isEditing}
        onNuovo={() => void handleNuovo()}
        onDuplica={() => void handleDuplica()}
        onElimina={() => setShowElimina(true)}
        onSalva={() => void handleSalva()}
        onAnnulla={handleAnnulla}
        onStampa={tipo => setShowStampa(tipo)}
        onEtichette={() => setShowStampa('Etichette')}
        onExcel={handleExcel}
        onAggiornaListini={handleAggiornaListini}
        onModificaSelez={() => {
          if (selectedIds.size === 0) showInfo('Seleziona almeno un prodotto.')
          else showInfo(`Modifica selezione: ${selectedIds.size} record (apri la scheda del primo).`)
        }}
        onUtilita={tipo => {
          if (tipo.startsWith('Esporta')) handleExcel()
          else {
            openEntitySpreadsheetImport({
              studioId,
              entity: 'products',
              onSuccess: showInfo,
              onError: showInfo,
              onProgress: showInfo,
            })
          }
        }}
      />

      {showElimina ? <ConfermaEliminaDialog onSi={() => void handleEliminaConfirm()} onNo={() => setShowElimina(false)} /> : null}

      {showCategorie && selected ? (
        <CategorieProdottiDialog
          studioId={studioId}
          categories={categories}
          selectedPath={selected.categoryPath || selected.categoria}
          onSelect={selection => {
            const next = {
              ...(editing ?? selected),
              categoria: selection.categoria,
              sottocategoria: selection.sottocategoria,
              categoryPath: selection.categoryPath,
              categoryId: selection.categoryId,
              subcategoryId: selection.subcategoryId,
            }
            setEditing(next)
            handleChange(next)
          }}
          onApplica={() => setShowCategorie(false)}
          onClose={() => setShowCategorie(false)}
          onRefresh={reloadCategories}
        />
      ) : null}

      {showImpostazioniListino ? (
        <ImpostazioniListinoDialog
          listinoId={showImpostazioniListino}
          prezzo={selected?.prezzi.find(p => p.listinoId === showImpostazioniListino)}
          onSave={pl => {
            if (!selected) return
            const prezzi = selected.prezzi.map(p => (p.listinoId === pl.listinoId ? pl : p))
            handleChange({ ...selected, prezzi })
          }}
          onClose={() => setShowImpostazioniListino(null)}
        />
      ) : null}

      {showOpzioniApp ? <OpzioniApplicazioneDialog onClose={() => setShowOpzioniApp(false)} /> : null}

      {showImmagine && selected ? (
        <ImmagineProdottoDialog
          imageUrl={selected.immagineUrl}
          onImport={url => handleChange({ ...selected, immagineUrl: url || undefined })}
          onClose={() => setShowImmagine(false)}
        />
      ) : null}

      {showStampa ? <StampaProdottoDialog modello={showStampa} prodotto={selected} onClose={() => setShowStampa(null)} /> : null}

      {operazioneMode ? (
        <OperazioneMagazzinoModal
          open
          mode={operazioneMode}
          state={operazioneState}
          studioId={studioId}
          saving={operazioneSaving}
          saveError={operazioneSaveError}
          onChange={setOperazioneState}
          onSave={() => void handleSaveOperazione()}
          onClose={() => {
            if (!operazioneSaving) setOperazioneMode(null)
          }}
        />
      ) : null}

      {saving ? (
        <div style={{ position: 'fixed', bottom: 48, right: 16, background: '#fff', border: '1px solid #ccc', padding: '4px 10px', fontSize: 11 }}>
          Salvataggio…
        </div>
      ) : null}
    </div>
  )
}
