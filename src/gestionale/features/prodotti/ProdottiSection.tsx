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
  addStockMovement,
} from '../../../lib/firestore'
import { fetchProductsPage, fetchStockMovementsPage } from '../../../lib/firestorePagination'
import { loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import LoadMoreBar from '../../../components/ui/LoadMoreBar'
import PaginatedFilterHint from '../../../components/ui/PaginatedFilterHint'
import { db } from '../../../firebase'
import type { Product } from '../../../types'
import { callCommitStockMovement, isStockFunctionUnavailable } from '../../../lib/commitStockMovement'
import type { Category } from '../../../types'
import { exportProductsExcel } from '../../lib/exportProductsExcel'
import ProdottiActionBar from './ProdottiActionBar'
import ProdottiLista from './ProdottiLista'
import ProdottiScheda from './ProdottiScheda'
import ProdottiTopBar from './ProdottiTopBar'
import { DEFAULT_COLONNE, SAMPLE_CATEGORY_TREE } from './constants'
import {
  AllegatiProdottoDialog,
  CategorieProdottiDialog,
  ConfermaEliminaDialog,
  ImmagineProdottoDialog,
  ImpostazioniListinoDialog,
  MovimentoMagazzinoDialog,
  OpzioniApplicazioneDialog,
  StampaProdottoDialog,
} from './dialogs/ProdottiDialogs'
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
import '../../theme/prodotti-section.css'
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
    truncated: productsTruncated,
    error: productsError,
    loadMore: loadMoreProducts,
    showInitialSpinner: productsInitial,
  } = useStudioPagedLiveQuery(studioId, listenProducts, fetchProductsPage, liveEnabled)
  const {
    data: movements,
    syncing: movementsSyncing,
    loadingMore: movementsLoadingMore,
    hasMore: movementsHasMore,
    truncated: movementsTruncated,
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
    void loadRecentSuppliers(studioId, 100).then(rows => {
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

  const [criterioRaggruppamento, setCriterioRaggruppamento] = useState<RaggruppaCriterio>('Categoria')
  const [filtriColonna, setFiltriColonna] = useState<Partial<Record<ColonnaId, ColumnFilter>>>({})
  const [colonneVisibili, setColonneVisibili] = useState(DEFAULT_COLONNE)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtraAttivo, setFiltraAttivo] = useState(true)
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
  const [showAllegati, setShowAllegati] = useState(false)
  const [showStampa, setShowStampa] = useState<string | null>(null)
  const [movimentoTipo, setMovimentoTipo] = useState<'Carica' | 'Scarica' | 'Rettifica' | null>(null)

  const showInfo = useCallback((msg: string) => {
    setBannerError(msg)
    window.setTimeout(() => setBannerError(e => (e === msg ? null : e)), 4000)
  }, [])

  const reloadCategories = useCallback(async () => {
    /* categorie sincronizzate in tempo reale */
  }, [])

  const categorieLista = useMemo(() => {
    if (categories.length) return categories.filter(c => !c.parentId).map(c => c.name)
    return Object.keys(SAMPLE_CATEGORY_TREE)
  }, [categories])

  const sottocategorieMap = useMemo(() => {
    if (categories.length) {
      const map: Record<string, string[]> = {}
      for (const r of categories.filter(c => !c.parentId)) {
        map[r.name] = categories.filter(c => c.parentId === r.id).map(c => c.name)
      }
      return map
    }
    return SAMPLE_CATEGORY_TREE
  }, [categories])

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
    return applyCercaVeloce(list, cercaCampo, cercaModo, cercaQuery)
  }, [prodotti, editing, cercaCampo, cercaModo, cercaQuery])

  const listTruncated = productsTruncated || movementsTruncated
  const hasScopedFilters = useMemo(
    () =>
      listTruncated &&
      (Boolean(cercaQuery.trim()) || Object.keys(filtriColonna).length > 0 || filtraAttivo),
    [listTruncated, cercaQuery, filtriColonna, filtraAttivo],
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

  const handleMovimento = useCallback(
    async (tipo: 'Carica' | 'Scarica' | 'Rettifica', qta: number) => {
      const target = editing ?? selected
      if (!target?.magazzino || !studioId) return
      if (target.isDraft) {
        alert('Salva il prodotto prima di registrare movimenti di magazzino.')
        return
      }
      const typeMap = { Carica: 'load' as const, Scarica: 'unload' as const, Rettifica: 'adjust' as const }
      const today = new Date().toISOString().slice(0, 10)
      setSaving(true)
      setBannerError(null)
      try {
        await callCommitStockMovement({
          movement: {
            studioId,
            date: today,
            productId: target.id,
            productCode: target.codProdotto,
            productName: target.descrizione,
            type: typeMap[tipo],
            quantity: qta,
            adjustTo: tipo === 'Rettifica' ? qta : undefined,
            adjustMode: tipo === 'Rettifica' ? 'absolute' : undefined,
            cause: `Da scheda prodotto (${tipo})`,
            operatorId: user?.uid,
            operatorName: userProfile?.name,
          },
        })
      } catch (err) {
        if (isStockFunctionUnavailable(err)) {
          const base = {
            studioId,
            date: today,
            productId: target.id,
            productCode: target.codProdotto,
            productName: target.descrizione,
            type: typeMap[tipo],
            cause: `Da scheda prodotto (${tipo})`,
            operatorId: user?.uid,
            operatorName: userProfile?.name,
            stockUpdated: false,
          }
          if (tipo === 'Carica') await addStockMovement({ ...base, loaded: qta })
          else if (tipo === 'Scarica') await addStockMovement({ ...base, unloaded: qta })
          else await addStockMovement({ ...base, adjustTo: qta })
          const newStock =
            tipo === 'Carica'
              ? (target.magazzino?.giacenza ?? 0) + qta
              : tipo === 'Scarica'
                ? Math.max(0, (target.magazzino?.giacenza ?? 0) - qta)
                : qta
          await updateProduct(target.id, { stock: newStock })
        } else {
          setBannerError(err instanceof Error ? err.message : 'Movimento non registrato.')
          return
        }
      }
      const snap = await getDoc(doc(db, 'products', target.id))
      if (snap.exists()) {
        const fresh = { id: snap.id, ...snap.data() } as Product
        setEditing(structuredClone(productToProdotto(fresh, movements)))
      }
      setMovimentoTipo(null)
    },
    [editing, selected, studioId, user?.uid, userProfile?.name],
  )

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
            truncated={productsTruncated || movementsTruncated}
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
            filtraAttivo={filtraAttivo || Object.keys(filtriColonna).length > 0}
            onFiltra={() => setFiltraAttivo(v => !v)}
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
          categorie={categorieLista}
          sottocategorieMap={sottocategorieMap}
          fornitori={fornitori}
          produttori={produttori.length ? produttori : ['Apple', 'Samsung', 'Generico']}
          prezziEspansi={prezziEspansi}
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
          onAllegati={() => setShowAllegati(true)}
          onImmagine={() => setShowImmagine(true)}
          onCodiciAggiuntivi={() => showInfo('Codici aggiuntivi: usa il campo cod. barre in scheda.')}
          onComponenti={() => showInfo('Componenti: funzione disponibile in versione desktop completa.')}
          onCarica={() => setMovimentoTipo('Carica')}
          onScarica={() => setMovimentoTipo('Scarica')}
          onRettifica={() => setMovimentoTipo('Rettifica')}
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
        onUtilita={tipo => showInfo(tipo)}
      />

      {showElimina ? <ConfermaEliminaDialog onSi={() => void handleEliminaConfirm()} onNo={() => setShowElimina(false)} /> : null}

      {showCategorie && selected ? (
        <CategorieProdottiDialog
          studioId={studioId}
          categories={categories}
          selectedPath={selected.sottocategoria ? `${selected.categoria} » ${selected.sottocategoria}` : selected.categoria}
          onSelect={(cat, sub, catId, subId) => {
            const next = { ...(editing ?? selected), categoria: cat, sottocategoria: sub, categoryId: catId, subcategoryId: subId }
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

      {showAllegati && selected ? (
        <AllegatiProdottoDialog
          files={(editing ?? selected).allegati?.map(name => ({ name })) ?? []}
          onImport={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = () => {
              const names = Array.from(input.files || []).map(f => f.name)
              if (!names.length) return
              const target = editing ?? selected
              if (!target) return
              const allegati = [...(target.allegati ?? []), ...names]
              handleChange({ ...target, allegati })
            }
            input.click()
          }}
          onRename={() => {
            const target = editing ?? selected
            const list = target?.allegati ?? []
            if (!list.length) return
            const name = window.prompt('Nuovo nome allegato', list[list.length - 1])
            if (!name?.trim()) return
            const allegati = [...list.slice(0, -1), name.trim()]
            handleChange({ ...target!, allegati })
          }}
          onDelete={() => {
            const target = editing ?? selected
            const list = target?.allegati ?? []
            if (!list.length) return
            handleChange({ ...target!, allegati: list.slice(0, -1) })
          }}
          onExport={() => {
            const list = (editing ?? selected)?.allegati ?? []
            if (!list.length) return
            const blob = new Blob([list.join('\n')], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `allegati-${selected.codProdotto}.txt`
            a.click()
            URL.revokeObjectURL(url)
          }}
          onPrint={() => {
            const list = (editing ?? selected)?.allegati ?? []
            if (!list.length) return
            const html = `<html><body><h3>Allegati prodotto</h3><ul>${list.map(n => `<li>${n}</li>`).join('')}</ul></body></html>`
            const w = window.open('', '_blank')
            if (w) {
              w.document.write(html)
              w.document.close()
              w.print()
            }
          }}
          onClose={() => setShowAllegati(false)}
        />
      ) : null}

      {showStampa ? <StampaProdottoDialog modello={showStampa} prodotto={selected} onClose={() => setShowStampa(null)} /> : null}

      {movimentoTipo ? (
        <MovimentoMagazzinoDialog
          tipo={movimentoTipo}
          onOk={qta => handleMovimento(movimentoTipo, qta)}
          onClose={() => setMovimentoTipo(null)}
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
