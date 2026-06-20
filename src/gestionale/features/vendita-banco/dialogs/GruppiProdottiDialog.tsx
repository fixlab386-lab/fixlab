import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, Product } from '../../../../types'
import { exportRowsToXlsx, buildExportFilename } from '../../../../lib/exportExcel'
import RicercaProdottiDialog from './RicercaProdottiDialog'
import {
  buildRigheFromGruppo,
  createEmptyGruppo,
  createGruppoItemFromProduct,
  loadProductGroups,
  saveProductGroups,
  type GruppoProdotto,
  type GruppoProdottoItem,
} from '../productGroups'
import type { RigaDocumento } from '../types'
import { WinButton, WinIconBtn, WinInput } from '../WinControls'

type Props = {
  studioId: string
  products: Product[]
  categories: Category[]
  listino: string
  onInsert: (righe: RigaDocumento[]) => void
  onClose: () => void
}

type ItemColId = 'cod' | 'prodotto' | 'qta'

const DEFAULT_ITEM_COLS: Record<ItemColId, boolean> = {
  cod: true,
  prodotto: true,
  qta: true,
}

export default function GruppiProdottiDialog({
  studioId,
  products,
  categories,
  listino,
  onInsert,
  onClose,
}: Props) {
  const [groups, setGroups] = useState<GruppoProdotto[]>(() => loadProductGroups(studioId))
  const [selectedId, setSelectedId] = useState<string | null>(groups[0]?.id ?? null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [colonneOpen, setColonneOpen] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Record<ItemColId, boolean>>({ ...DEFAULT_ITEM_COLS })
  const [toast, setToast] = useState<string | null>(null)

  const selected = useMemo(() => groups.find(g => g.id === selectedId) ?? null, [groups, selectedId])

  useEffect(() => {
    saveProductGroups(studioId, groups)
  }, [studioId, groups])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const patchGroups = useCallback((updater: (prev: GruppoProdotto[]) => GruppoProdotto[]) => {
    setGroups(prev => updater(prev))
  }, [])

  const patchSelected = useCallback(
    (patch: Partial<GruppoProdotto>) => {
      if (!selectedId) return
      patchGroups(prev => prev.map(g => (g.id === selectedId ? { ...g, ...patch } : g)))
    },
    [selectedId, patchGroups],
  )

  const handleNuovo = () => {
    const g = createEmptyGruppo()
    patchGroups(prev => [...prev, g])
    setSelectedId(g.id)
    setSelectedItemId(null)
    setToast('Nuovo gruppo creato.')
  }

  const handleDuplica = () => {
    if (!selected) return
    const copy: GruppoProdotto = {
      ...selected,
      id: crypto.randomUUID(),
      nome: `${selected.nome} (copia)`,
      items: selected.items.map(item => ({ ...item, id: crypto.randomUUID() })),
    }
    patchGroups(prev => [...prev, copy])
    setSelectedId(copy.id)
    setToast('Gruppo duplicato.')
  }

  const handleElimina = () => {
    if (!selected) {
      alert('Seleziona un gruppo da eliminare.')
      return
    }
    if (!confirm(`Eliminare il gruppo "${selected.nome}"?`)) return
    patchGroups(prev => prev.filter(g => g.id !== selected.id))
    setSelectedId(prev => {
      const remaining = groups.filter(g => g.id !== selected.id)
      return remaining[0]?.id ?? null
    })
    setSelectedItemId(null)
    setToast('Gruppo eliminato.')
  }

  const handleAddProduct = (p: Product) => {
    if (!selected) {
      alert('Seleziona o crea un gruppo prima di aggiungere prodotti.')
      return
    }
    const item = createGruppoItemFromProduct(p)
    patchSelected({ items: [...selected.items, item] })
    setSelectedItemId(item.id)
    setShowProductSearch(false)
    setToast(`Aggiunto: ${p.name}`)
  }

  const handleRemoveItem = () => {
    if (!selected || !selectedItemId) {
      alert('Seleziona una voce da rimuovere.')
      return
    }
    patchSelected({ items: selected.items.filter(i => i.id !== selectedItemId) })
    setSelectedItemId(null)
  }

  const moveItem = (direction: -1 | 1) => {
    if (!selected || !selectedItemId) return
    const idx = selected.items.findIndex(i => i.id === selectedItemId)
    const target = idx + direction
    if (idx < 0 || target < 0 || target >= selected.items.length) return
    const next = [...selected.items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    patchSelected({ items: next })
  }

  const patchItem = (itemId: string, patch: Partial<GruppoProdottoItem>) => {
    if (!selected) return
    patchSelected({
      items: selected.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)),
    })
  }

  const exportGroupsExcel = () => {
    exportRowsToXlsx({
      rows: groups,
      columns: [
        { header: 'Nome gruppo', value: g => g.nome },
        { header: 'Solo prezzo complessivo', value: g => (g.soloPrezzoComplessivo ? 'Sì' : 'No') },
        { header: 'N. voci', value: g => g.items.length },
      ],
      filename: buildExportFilename('gruppi_prodotti', 'elenco'),
      sheetName: 'Gruppi',
    })
  }

  const exportItemsExcel = () => {
    if (!selected) {
      alert('Seleziona un gruppo.')
      return
    }
    exportRowsToXlsx({
      rows: selected.items,
      columns: [
        { header: 'Cod.', value: i => i.cod },
        { header: 'Prodotto', value: i => i.descrizione },
        { header: 'Q.tà', value: i => i.qta },
      ],
      filename: buildExportFilename('gruppo', selected.nome),
      sheetName: 'Voci',
    })
  }

  const insertGroup = (group: GruppoProdotto) => {
    const righe = buildRigheFromGruppo(group, products, listino)
    onInsert(righe)
    onClose()
  }

  const emptyLabel = '(Non vi sono dati da visualizzare)'

  return (
    <div className="vb-dialog-overlay vb-gruppi-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--gruppi-prodotti">
        <div className="vb-dialog__titlebar vb-gruppi-titlebar">
          <div className="vb-gruppi-titlebar__text">
            <span>Gruppi di prodotti</span>
            <span className="vb-gruppi-titlebar__sub">Modifica elenco voci</span>
          </div>
          <span className="vb-gruppi-titlebar__icon" aria-hidden="true">
            📦
          </span>
        </div>

        <div className="vb-gruppi-body">
          <div className="vb-gruppi-split">
            <div className="vb-gruppi-list">
              <table className="vb-gruppi-grid">
                <thead>
                  <tr>
                    <th>Nome gruppo</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td className="vb-gruppi-grid__empty">{emptyLabel}</td>
                    </tr>
                  ) : (
                    groups.map(g => (
                      <tr
                        key={g.id}
                        className={selectedId === g.id ? 'vb-gruppi-grid__row--selected' : undefined}
                        onClick={() => {
                          setSelectedId(g.id)
                          setSelectedItemId(null)
                        }}
                        onDoubleClick={() => insertGroup(g)}
                        title="Doppio clic per inserire nel documento"
                      >
                        <td>{g.nome || '(Senza nome)'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="vb-gruppi-detail">
              <div className="vb-gruppi-detail__head">
                <label className="vb-gruppi-detail__name">
                  <span>Nome gruppo</span>
                  <WinInput
                    value={selected?.nome ?? ''}
                    disabled={!selected}
                    onChange={e => patchSelected({ nome: e.target.value })}
                  />
                </label>
                <label className="vb-gruppi-detail__check">
                  <input
                    type="checkbox"
                    checked={selected?.soloPrezzoComplessivo ?? false}
                    disabled={!selected}
                    onChange={e => patchSelected({ soloPrezzoComplessivo: e.target.checked })}
                  />
                  Riporta solo il prezzo complessivo del gruppo
                </label>
              </div>

              <div className="vb-gruppi-items-wrap">
                <table className="vb-gruppi-grid vb-gruppi-grid--items">
                  <thead>
                    <tr>
                      {visibleCols.cod ? <th>Cod.</th> : null}
                      {visibleCols.prodotto ? <th>Prodotto</th> : null}
                      {visibleCols.qta ? <th>Q.tà</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {!selected || selected.items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="vb-gruppi-grid__empty">
                          {emptyLabel}
                        </td>
                      </tr>
                    ) : (
                      selected.items.map(item => (
                        <tr
                          key={item.id}
                          className={selectedItemId === item.id ? 'vb-gruppi-grid__row--selected' : undefined}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          {visibleCols.cod ? (
                            <td>
                              <WinInput
                                className="vb-input--flat"
                                value={item.cod}
                                onChange={e => patchItem(item.id, { cod: e.target.value })}
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                          ) : null}
                          {visibleCols.prodotto ? (
                            <td>
                              <WinInput
                                className="vb-input--flat"
                                value={item.descrizione}
                                onChange={e => patchItem(item.id, { descrizione: e.target.value })}
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                          ) : null}
                          {visibleCols.qta ? (
                            <td className="vb-gruppi-grid__qta">
                              <WinInput
                                type="number"
                                min={0}
                                step={0.01}
                                className="vb-input--flat vb-input--right"
                                value={item.qta}
                                onChange={e =>
                                  patchItem(item.id, { qta: parseFloat(e.target.value) || 0 })
                                }
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                          ) : null}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="vb-gruppi-items-toolbar">
                <div className="vb-gruppi-items-toolbar__nav">
                  <WinIconBtn title="Sposta su" disabled={!selectedItemId} onClick={() => moveItem(-1)}>
                    ▲
                  </WinIconBtn>
                  <WinIconBtn title="Sposta giù" disabled={!selectedItemId} onClick={() => moveItem(1)}>
                    ▼
                  </WinIconBtn>
                </div>
                <WinButton disabled={!selected} onClick={() => setShowProductSearch(true)}>
                  Aggiungi
                </WinButton>
                <WinButton disabled={!selectedItemId} onClick={handleRemoveItem}>
                  Rimuovi
                </WinButton>
                <WinButton disabled={!selected} onClick={exportItemsExcel}>
                  Excel
                </WinButton>
                <div className="vb-gruppi-items-toolbar__spacer" />
                <div className="vb-gruppi-colonne">
                  <button type="button" className="vb-gruppi-colonne__link" onClick={() => setColonneOpen(v => !v)}>
                    Colonne…
                  </button>
                  {colonneOpen ? (
                    <div className="vb-gruppi-colonne__menu">
                      {(Object.keys(DEFAULT_ITEM_COLS) as ItemColId[]).map(id => (
                        <label key={id}>
                          <input
                            type="checkbox"
                            checked={visibleCols[id]}
                            onChange={e => setVisibleCols(prev => ({ ...prev, [id]: e.target.checked }))}
                          />
                          {id === 'cod' ? 'Cod.' : id === 'prodotto' ? 'Prodotto' : 'Q.tà'}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="vb-gruppi-footer">
          <WinButton onClick={handleNuovo}>Nuovo</WinButton>
          <WinButton disabled={!selected} onClick={handleDuplica}>
            Duplica
          </WinButton>
          <WinButton disabled={!selected} onClick={handleElimina}>
            Elimina
          </WinButton>
          <WinButton onClick={exportGroupsExcel}>Excel</WinButton>
          <WinIconBtn title="Aiuto" onClick={() => setShowHelp(true)}>
            ?
          </WinIconBtn>
          <div className="vb-gruppi-footer__spacer" />
          {selected ? (
            <WinButton className="vb-gruppi-btn-inserisci" onClick={() => insertGroup(selected)}>
              Inserisci nel documento
            </WinButton>
          ) : null}
          <WinButton onClick={onClose}>Chiudi</WinButton>
        </div>

        {toast ? <div className="vb-gruppi-toast">{toast}</div> : null}
      </div>

      {showProductSearch ? (
        <RicercaProdottiDialog
          studioId={studioId}
          products={products}
          categories={categories}
          listino={listino}
          onSelect={handleAddProduct}
          onClose={() => setShowProductSearch(false)}
        />
      ) : null}

      {showHelp ? (
        <div className="vb-dialog-overlay vb-gruppi-help-overlay" onClick={e => e.target === e.currentTarget && setShowHelp(false)}>
          <div className="vb-dialog vb-dialog--md">
            <div className="vb-dialog__titlebar">
              <span>Gruppi di prodotti — Aiuto</span>
            </div>
            <div className="vb-dialog__body" style={{ fontSize: 12, lineHeight: 1.5 }}>
              <p>
                <strong>Nuovo / Duplica / Elimina:</strong> gestisci l&apos;elenco dei gruppi a sinistra.
              </p>
              <p>
                <strong>Aggiungi / Rimuovi:</strong> componi le voci del gruppo selezionato con i prodotti del
                catalogo.
              </p>
              <p>
                <strong>Riporta solo il prezzo complessivo:</strong> inserisce una sola riga con il totale del
                gruppo invece delle singole voci.
              </p>
              <p>
                <strong>Doppio clic</strong> su un gruppo o <strong>Inserisci nel documento</strong> per aggiungere
                le righe alla vendita al banco.
              </p>
            </div>
            <div className="vb-dialog__footer">
              <WinButton onClick={() => setShowHelp(false)}>Chiudi</WinButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
