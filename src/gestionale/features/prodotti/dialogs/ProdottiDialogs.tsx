import { useMemo, useState } from 'react'
import type { Category } from '../../../../types'
import { addCategory, deleteCategory, updateCategory } from '../../../../lib/firestore'
import { printHtmlInIframe } from '../../../../lib/printDocument'
import {
  buildCategoryPath,
  collectDescendantIds,
  computeCategoryLevel,
  getChildCategories,
  getRootCategories,
  rebuildCategorySubtreePaths,
  resolveCategorySelection,
  type CategorySelection,
} from '../../../lib/categoryUtils'
import { buildProductPrintHtml } from '../../../lib/productPrint'
import { LISTINI_GLOBALI, SAMPLE_CATEGORY_TREE } from '../constants'
import type { PrezzoListino, Prodotto } from '../types'
import { listinoLabel } from '../utils'
import '../../../theme/category-tree.css'

export function ConfermaEliminaDialog({ onSi, onNo }: { onSi: () => void; onNo: () => void }) {
  return (
    <div className="prodotti-dialog-overlay" onClick={onNo}>
      <div className="prodotti-dialog" onClick={e => e.stopPropagation()}>
        <div className="prodotti-dialog__titlebar">Conferma</div>
        <div className="prodotti-dialog__body">Sei sicuro di voler eliminare questa voce?</div>
        <div className="prodotti-dialog__footer">
          <button type="button" className="prodotti-dialog__btn" onClick={onSi}>
            Sì
          </button>
          <button type="button" className="prodotti-dialog__btn" onClick={onNo}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}

function CategorieTreeNode({
  category,
  categories,
  selectedId,
  depth = 0,
  onSelect,
}: {
  category: Category
  categories: Category[]
  selectedId: string | null
  depth?: number
  onSelect: (id: string) => void
}) {
  const children = getChildCategories(categories, category.id)
  const [expanded, setExpanded] = useState(depth < 1)
  return (
    <li>
      <div
        className={`prodotti-cat-tree__item${selectedId === category.id ? ' prodotti-cat-tree__item--selected' : ''}`}
        style={{ paddingLeft: `${depth * 14}px` }}
        onClick={() => onSelect(category.id)}
      >
        {children.length > 0 ? (
          <button
            type="button"
            className="category-tree__toggle"
            onClick={e => {
              e.stopPropagation()
              setExpanded(v => !v)
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ display: 'inline-block', width: 14 }} />
        )}
        {category.name}
      </div>
      {expanded && children.length > 0 ? (
        <ul>
          {children.map(child => (
            <CategorieTreeNode
              key={child.id}
              category={child}
              categories={categories}
              selectedId={selectedId}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function SampleCategoryTree({
  selectedPath,
  onPickSample,
}: {
  selectedPath: string
  onPickSample: (cat: string, sub: string) => void
}) {
  return (
    <ul className="prodotti-cat-tree">
      {Object.entries(SAMPLE_CATEGORY_TREE).map(([cat, subs]) => (
        <li key={cat}>
          <div
            className={`prodotti-cat-tree__item${selectedPath === cat ? ' prodotti-cat-tree__item--selected' : ''}`}
            onClick={() => onPickSample(cat, '')}
          >
            {cat}
          </div>
          <ul>
            {subs.map(sub => (
              <li key={sub}>
                <div
                  className={`prodotti-cat-tree__item${selectedPath === `${cat} » ${sub}` ? ' prodotti-cat-tree__item--selected' : ''}`}
                  onClick={() => onPickSample(cat, sub)}
                >
                  {sub}
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

export function CategorieProdottiDialog({
  studioId,
  categories,
  selectedPath,
  onSelect,
  onClose,
  onApplica,
  onRefresh,
}: {
  studioId: string
  categories: Category[]
  selectedPath: string
  onSelect: (selection: CategorySelection) => void
  onClose: () => void
  onApplica: () => void
  onRefresh: () => void | Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNuovaSub, setShowNuovaSub] = useState(false)
  const [nuovaSubNome, setNuovaSubNome] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const roots = useMemo(() => getRootCategories(categories), [categories])
  const selectedCategory = selectedId ? categories.find(c => c.id === selectedId) : null
  const selectedPathLive = selectedCategory
    ? buildCategoryPath(selectedCategory.id, categories)
    : selectedPath

  const pick = (id: string) => {
    setSelectedId(id)
    const resolved = resolveCategorySelection(id, categories)
    if (resolved) onSelect(resolved)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      await onRefresh()
    } catch {
      setMsg('Operazione non riuscita.')
    } finally {
      setBusy(false)
    }
  }

  const handleNuova = () => {
    const name = window.prompt('Nome nuova categoria principale')
    if (!name?.trim()) return
    void run(async () => {
      const maxOrder = roots.reduce((m, c) => Math.max(m, c.order ?? 0), 0)
      const ref = await addCategory({
        studioId,
        name: name.trim(),
        emoji: '',
        level: 0,
        path: name.trim(),
        order: maxOrder + 1,
      })
      pick(ref.id)
    })
  }

  const handleModifica = () => {
    if (!selectedCategory) {
      setMsg('Seleziona una categoria.')
      return
    }
    const name = window.prompt('Nuovo nome categoria', selectedCategory.name)
    if (!name?.trim() || name.trim() === selectedCategory.name) return
    void run(async () => {
      await updateCategory(selectedCategory.id, { name: name.trim() })
      const nextCategories = categories.map(c =>
        c.id === selectedCategory.id ? { ...c, name: name.trim() } : c,
      )
      await rebuildCategorySubtreePaths(selectedCategory.id, nextCategories, updateCategory)
      pick(selectedCategory.id)
    })
  }

  const handleElimina = () => {
    if (!selectedCategory) {
      setMsg('Seleziona una categoria.')
      return
    }
    const descendants = collectDescendantIds(selectedCategory.id, categories)
    const childCount = descendants.length - 1
    const msgConfirm =
      childCount > 0
        ? `La categoria «${selectedCategory.name}» ha ${childCount} sottocategorie. Eliminarle tutte?`
        : `Eliminare la categoria «${selectedCategory.name}»?`
    if (!window.confirm(msgConfirm)) return
    void run(async () => {
      const toDelete = [...descendants].reverse()
      for (const id of toDelete) await deleteCategory(id)
      setSelectedId(null)
    })
  }

  const handleNuovaSubOk = () => {
    if (!selectedCategory || !nuovaSubNome.trim()) {
      setMsg('Seleziona una categoria e inserisci un nome.')
      return
    }
    void run(async () => {
      const siblings = getChildCategories(categories, selectedCategory.id)
      const maxOrder = siblings.reduce((m, c) => Math.max(m, c.order ?? 0), 0)
      const parentPath = buildCategoryPath(selectedCategory.id, categories)
      const ref = await addCategory({
        studioId,
        name: nuovaSubNome.trim(),
        emoji: '',
        parentId: selectedCategory.id,
        level: computeCategoryLevel(selectedCategory.id, categories) + 1,
        path: `${parentPath} » ${nuovaSubNome.trim()}`,
        order: maxOrder + 1,
      })
      pick(ref.id)
      setNuovaSubNome('')
      setShowNuovaSub(false)
    })
  }

  const handleExcel = () => {
    const lines = ['Nome;Percorso;Livello']
    for (const c of [...categories].sort((a, b) => a.path.localeCompare(b.path, 'it'))) {
      lines.push(`${c.name};${c.path};${c.level}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'categorie-prodotti.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePickSample = (cat: string, sub: string) => {
    onSelect({
      leafId: '',
      categoryPath: sub ? `${cat} » ${sub}` : cat,
      categoryId: '',
      subcategoryId: '',
      categoria: cat,
      sottocategoria: sub,
    })
  }

  return (
    <div className="prodotti-dialog-overlay">
      <div className="prodotti-dialog prodotti-dialog--lg">
        <div className="prodotti-dialog__titlebar">
          Categorie prodotti
          <button type="button" className="prodotti-dialog__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="prodotti-dialog__body">
          {categories.length ? (
            <ul className="prodotti-cat-tree">
              {roots.map(root => (
                <CategorieTreeNode
                  key={root.id}
                  category={root}
                  categories={categories}
                  selectedId={selectedId}
                  onSelect={pick}
                />
              ))}
            </ul>
          ) : (
            <SampleCategoryTree selectedPath={selectedPath} onPickSample={handlePickSample} />
          )}
          {selectedPathLive ? (
            <div style={{ marginTop: 8, fontSize: 11 }}>Selezionato: {selectedPathLive}</div>
          ) : null}
          {msg ? <div style={{ marginTop: 8, fontSize: 11, color: '#c00' }}>{msg}</div> : null}
        </div>
        <div className="prodotti-dialog__footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button type="button" className="prodotti-dialog__btn" onClick={onApplica} disabled={busy}>
              Applica
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={handleNuova} disabled={busy}>
              Nuova
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={handleModifica} disabled={busy}>
              Modifica
            </button>
            <button
              type="button"
              className="prodotti-dialog__btn"
              onClick={() => setShowNuovaSub(true)}
              disabled={busy || !selectedCategory}
            >
              Nuova sottocategoria
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={handleElimina} disabled={busy || !selectedCategory}>
              Elimina
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={handleExcel} disabled={busy}>
              Excel
            </button>
          </div>
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>

      {showNuovaSub ? (
        <div className="prodotti-dialog" style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%)' }}>
          <div className="prodotti-dialog__titlebar">
            Nuova sottocategoria di «{selectedCategory?.name}»
          </div>
          <div className="prodotti-dialog__body">
            <input className="prodotti-input" value={nuovaSubNome} onChange={e => setNuovaSubNome(e.target.value)} autoFocus />
          </div>
          <div className="prodotti-dialog__footer">
            <button type="button" className="prodotti-dialog__btn" onClick={handleNuovaSubOk} disabled={busy}>
              OK
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={() => setShowNuovaSub(false)}>
              Annulla
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ImpostazioniListinoDialog({
  listinoId,
  prezzo,
  onSave,
  onClose,
}: {
  listinoId: string
  prezzo?: PrezzoListino
  onSave: (p: PrezzoListino) => void
  onClose: () => void
}) {
  const [copia, setCopia] = useState(false)
  const [ricarico, setRicarico] = useState(false)
  const [diminuzioneAttiva, setDiminuzioneAttiva] = useState(true)
  const [dimVal, setDimVal] = useState(prezzo?.regola?.diminuzione ?? 0)
  const [importoFisso, setImportoFisso] = useState(false)
  const [arrotonda, setArrotonda] = useState(false)

  const nome = listinoLabel(listinoId)

  return (
    <div className="prodotti-dialog-overlay" onClick={onClose}>
      <div className="prodotti-dialog prodotti-dialog--lg" onClick={e => e.stopPropagation()}>
        <div className="prodotti-dialog__titlebar">{`Impostazioni listino '${nome}'`}</div>
        <div className="prodotti-dialog__body">
          <label className="prodotti-check">
            <input type="checkbox" checked={copia} onChange={e => setCopia(e.target.checked)} />
            Copiando i prezzi dal listino [Privati]
          </label>
          <label className="prodotti-check" style={{ display: 'block' }}>
            <input type="checkbox" checked={ricarico} onChange={e => setRicarico(e.target.checked)} />
            Ricalcolando sul prezzo di costo con un ricarico del{' '}
            <input className="prodotti-input prodotti-input--short" type="number" defaultValue={0} /> %
          </label>
          <label className="prodotti-check" style={{ display: 'block' }}>
            <input type="checkbox" checked={diminuzioneAttiva} onChange={e => setDiminuzioneAttiva(e.target.checked)} />
            Diminuendo del <input className="prodotti-input prodotti-input--short" type="number" value={dimVal} onChange={e => setDimVal(parseFloat(e.target.value) || 0)} /> %
          </label>
          <label className="prodotti-check" style={{ display: 'block' }}>
            <input type="checkbox" checked={importoFisso} onChange={e => setImportoFisso(e.target.checked)} />
            Aggiungendo l&apos;importo fisso € <input className="prodotti-input prodotti-input--short" type="number" defaultValue={0} />
          </label>
          <label className="prodotti-check" style={{ display: 'block' }}>
            <input type="checkbox" checked={arrotonda} onChange={e => setArrotonda(e.target.checked)} />
            Arrotondando [Al centesimo]
          </label>
        </div>
        <div className="prodotti-dialog__footer">
          <button
            type="button"
            className="prodotti-dialog__btn"
            onClick={() => {
              const next: PrezzoListino = {
                listinoId,
                modalita: 'calcolato',
                valore: prezzo?.valore ?? 0,
                ivato: prezzo?.ivato ?? false,
                regola: {
                  diminuzione: diminuzioneAttiva ? dimVal : undefined,
                  ricaricoSuCosto: ricarico ? 0 : undefined,
                  arrotondamento: arrotonda ? 'Al centesimo' : undefined,
                },
              }
              onSave(next)
              onClose()
            }}
          >
            OK
          </button>
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export function OpzioniApplicazioneDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="prodotti-dialog-overlay">
      <div className="prodotti-dialog prodotti-dialog--xl">
        <div className="prodotti-dialog__titlebar">
          Opzioni applicazione
          <button type="button" className="prodotti-dialog__close prodotti-dialog__close--red" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="prodotti-dialog__body">
          <table className="prodotti-movimenti-table">
            <thead>
              <tr>
                <th />
                <th>Denominazione</th>
                <th>Predef.</th>
                <th>Prezzi ivati</th>
                <th>Prodf. Cto.</th>
              </tr>
            </thead>
            <tbody>
              {LISTINI_GLOBALI.map(l => (
                <tr key={l.id}>
                  <td>
                    <input type="checkbox" defaultChecked={l.attivo} />
                  </td>
                  <td>{l.label}</td>
                  <td>
                    <input type="checkbox" defaultChecked={l.id === 'privati'} />
                  </td>
                  <td>
                    <input type="checkbox" defaultChecked={l.ivatoDefault} />
                  </td>
                  <td>
                    <input type="checkbox" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="prodotti-dialog__footer">
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export function ImmagineProdottoDialog({
  imageUrl,
  onImport,
  onClose,
}: {
  imageUrl?: string
  onImport: (url: string) => void
  onClose: () => void
}) {
  return (
    <div className="prodotti-dialog-overlay">
      <div className="prodotti-dialog prodotti-dialog--lg">
        <div className="prodotti-dialog__titlebar">
          Immagine
          <button type="button" className="prodotti-dialog__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="prodotti-dialog__body">
          {imageUrl ? (
            <img src={imageUrl} alt="Prodotto" className="prodotti-img-preview" />
          ) : (
            <div
              className="prodotti-img-drop"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) onImport(URL.createObjectURL(f))
              }}
            >
              Per impostare la foto del prodotto, trascinala qui o premi &apos;Importa&apos;
            </div>
          )}
        </div>
        <div className="prodotti-dialog__footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="prodotti-dialog__btn" onClick={() => alert('Nessuno scanner rilevato. Usa Importa.')}>
              Scansiona
            </button>
            <button
              type="button"
              className="prodotti-dialog__btn"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = () => {
                  const f = input.files?.[0]
                  if (f) onImport(URL.createObjectURL(f))
                }
                input.click()
              }}
            >
              Importa
            </button>
            <button
              type="button"
              className="prodotti-dialog__btn"
              onClick={() => {
                if (!imageUrl) return
                const a = document.createElement('a')
                a.href = imageUrl
                a.download = 'immagine-prodotto'
                a.click()
              }}
              disabled={!imageUrl}
            >
              Esporta
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={() => onImport('')}>
              Elimina
            </button>
            <button
              type="button"
              className="prodotti-dialog__btn"
              onClick={() => {
                if (imageUrl) window.open(imageUrl, '_blank')
              }}
              disabled={!imageUrl}
            >
              Stampa
            </button>
          </div>
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export function AllegatiProdottoDialog({
  files,
  onImport,
  onRename,
  onDelete,
  onExport,
  onPrint,
  onClose,
}: {
  files: { name: string }[]
  onImport: () => void
  onRename: () => void
  onDelete: () => void
  onExport: () => void
  onPrint: () => void
  onClose: () => void
}) {
  return (
    <div className="prodotti-dialog-overlay">
      <div className="prodotti-dialog prodotti-dialog--lg">
        <div className="prodotti-dialog__titlebar">
          Allegati
          <button type="button" className="prodotti-dialog__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="prodotti-dialog__body">
          <div className="prodotti-img-drop">
            {files.length ? (
              <ul style={{ textAlign: 'left', margin: 0, paddingLeft: 20 }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>{f.name}</li>
                ))}
              </ul>
            ) : (
              'Trascina qui i file allegati o usa Importa'
            )}
          </div>
        </div>
        <div className="prodotti-dialog__footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button type="button" className="prodotti-dialog__btn" onClick={() => alert('Invia allegati via e-mail dal client di posta.')}>
              Da smartphone/e-mail
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={() => alert('Nessuno scanner rilevato. Usa Importa.')}>
              Scansiona
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={onImport}>
              Importa
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={onExport} disabled={!files.length}>
              Esporta
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={onRename} disabled={!files.length}>
              Rinomina
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={onDelete} disabled={!files.length}>
              Elimina
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={onPrint} disabled={!files.length}>
              Stampa
            </button>
          </div>
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

export function StampaProdottoDialog({
  modello,
  prodotto,
  onClose,
}: {
  modello: string
  prodotto?: Prodotto | null
  onClose: () => void
}) {
  const handleStampa = () => {
    if (prodotto) {
      printHtmlInIframe(buildProductPrintHtml(prodotto, modello), `Prodotto ${prodotto.descrizione}`)
    } else {
      window.print()
    }
    onClose()
  }

  return (
    <div className="prodotti-dialog-overlay" onClick={onClose}>
      <div className="prodotti-dialog" onClick={e => e.stopPropagation()}>
        <div className="prodotti-dialog__titlebar">Stampa — {modello}</div>
        <div className="prodotti-dialog__body">
          {prodotto ? (
            <p>Anteprima scheda «{modello}» per {prodotto.descrizione} (cod. {prodotto.codProdotto}).</p>
          ) : (
            <p>Anteprima modello stampa «{modello}».</p>
          )}
        </div>
        <div className="prodotti-dialog__footer">
          <button type="button" className="prodotti-dialog__btn" onClick={handleStampa}>
            Stampa
          </button>
          <button type="button" className="prodotti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
