import { useState } from 'react'
import type { Category } from '../../../../types'
import { addCategory, deleteCategory, updateCategory } from '../../../../lib/firestore'
import { printHtmlInIframe } from '../../../../lib/printDocument'
import { buildProductPrintHtml } from '../../../lib/productPrint'
import { LISTINI_GLOBALI, SAMPLE_CATEGORY_TREE } from '../constants'
import type { PrezzoListino, Prodotto } from '../types'
import { listinoLabel } from '../utils'

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
  onSelect: (cat: string, sub: string, categoryId: string, subcategoryId: string) => void
  onClose: () => void
  onApplica: () => void
  onRefresh: () => void | Promise<void>
}) {
  const [selCat, setSelCat] = useState('')
  const [selSub, setSelSub] = useState('')
  const [showNuovaSub, setShowNuovaSub] = useState(false)
  const [nuovaSubNome, setNuovaSubNome] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const tree = categories.length
    ? buildTreeFromCategories(categories)
    : SAMPLE_CATEGORY_TREE

  const pick = (cat: string, sub: string) => {
    setSelCat(cat)
    setSelSub(sub)
    const root = categories.find(c => !c.parentId && c.name === cat)
    const subCat = categories.find(c => c.parentId === root?.id && c.name === sub)
    onSelect(cat, sub, root?.id || '', subCat?.id || '')
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
    const name = window.prompt('Nome nuova categoria')
    if (!name?.trim()) return
    void run(async () => {
      const roots = categories.filter(c => !c.parentId)
      const maxOrder = roots.reduce((m, c) => Math.max(m, c.order ?? 0), 0)
      await addCategory({
        studioId,
        name: name.trim(),
        emoji: '',
        level: 0,
        path: name.trim(),
        order: maxOrder + 1,
      })
      pick(name.trim(), '')
    })
  }

  const handleModifica = () => {
    if (!selCat) {
      setMsg('Seleziona una categoria.')
      return
    }
    const root = categories.find(c => !c.parentId && c.name === selCat)
    if (selSub && root) {
      const sub = categories.find(c => c.parentId === root.id && c.name === selSub)
      if (!sub) return
      const name = window.prompt('Nuovo nome sottocategoria', selSub)
      if (!name?.trim() || name.trim() === selSub) return
      void run(async () => {
        await updateCategory(sub.id, { name: name.trim(), path: `${selCat} » ${name.trim()}` })
        pick(selCat, name.trim())
      })
      return
    }
    if (!root) return
    const name = window.prompt('Nuovo nome categoria', selCat)
    if (!name?.trim() || name.trim() === selCat) return
    void run(async () => {
      await updateCategory(root.id, { name: name.trim(), path: name.trim() })
      const subs = categories.filter(c => c.parentId === root.id)
      for (const s of subs) {
        await updateCategory(s.id, { path: `${name.trim()} » ${s.name}` })
      }
      pick(name.trim(), selSub)
    })
  }

  const handleElimina = () => {
    if (!selCat) {
      setMsg('Seleziona una categoria.')
      return
    }
    const root = categories.find(c => !c.parentId && c.name === selCat)
    if (selSub && root) {
      const sub = categories.find(c => c.parentId === root.id && c.name === selSub)
      if (!sub) return
      if (!window.confirm(`Eliminare la sottocategoria «${selSub}»?`)) return
      void run(async () => {
        await deleteCategory(sub.id)
        pick(selCat, '')
      })
      return
    }
    if (!root) return
    const subs = categories.filter(c => c.parentId === root.id)
    if (subs.length > 0 && !window.confirm(`La categoria «${selCat}» ha ${subs.length} sottocategorie. Eliminarle tutte?`)) return
    if (!window.confirm(`Eliminare la categoria «${selCat}»?`)) return
    void run(async () => {
      for (const s of subs) await deleteCategory(s.id)
      await deleteCategory(root.id)
      setSelCat('')
      setSelSub('')
    })
  }

  const handleNuovaSubOk = () => {
    if (!selCat || !nuovaSubNome.trim()) {
      setMsg('Seleziona una categoria e inserisci un nome.')
      return
    }
    const root = categories.find(c => !c.parentId && c.name === selCat)
    if (!root) return
    void run(async () => {
      const subs = categories.filter(c => c.parentId === root.id)
      const maxOrder = subs.reduce((m, c) => Math.max(m, c.order ?? 0), 0)
      await addCategory({
        studioId,
        name: nuovaSubNome.trim(),
        emoji: '',
        parentId: root.id,
        level: 1,
        path: `${selCat} » ${nuovaSubNome.trim()}`,
        order: maxOrder + 1,
      })
      pick(selCat, nuovaSubNome.trim())
      setNuovaSubNome('')
      setShowNuovaSub(false)
    })
  }

  const handleExcel = () => {
    const lines = ['Categoria;Sottocategoria;Percorso']
    for (const c of categories.filter(x => !x.parentId)) {
      lines.push(`${c.name};;${c.path}`)
      for (const s of categories.filter(x => x.parentId === c.id)) {
        lines.push(`${c.name};${s.name};${s.path}`)
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'categorie-prodotti.csv'
    a.click()
    URL.revokeObjectURL(url)
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
          <ul className="prodotti-cat-tree">
            {Object.entries(tree).map(([cat, subs]) => (
              <li key={cat}>
                <div
                  className={`prodotti-cat-tree__item${selCat === cat && !selSub ? ' prodotti-cat-tree__item--selected' : ''}`}
                  onClick={() => pick(cat, '')}
                >
                  {cat}
                </div>
                <ul>
                  {subs.map((sub: string) => (
                    <li key={sub}>
                      <div
                        className={`prodotti-cat-tree__item${selCat === cat && selSub === sub ? ' prodotti-cat-tree__item--selected' : ''}`}
                        onClick={() => pick(cat, sub)}
                      >
                        {sub}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {selectedPath ? <div style={{ marginTop: 8, fontSize: 11 }}>Selezionato: {selectedPath}</div> : null}
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
            <button type="button" className="prodotti-dialog__btn" onClick={() => setShowNuovaSub(true)} disabled={busy || !selCat}>
              Nuova sottocategoria
            </button>
            <button type="button" className="prodotti-dialog__btn" onClick={handleElimina} disabled={busy || !selCat}>
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
          <div className="prodotti-dialog__titlebar">Nome nuova sottocategoria</div>
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

function buildTreeFromCategories(categories: Category[]): Record<string, string[]> {
  const roots = categories.filter(c => !c.parentId)
  const tree: Record<string, string[]> = {}
  for (const r of roots) {
    tree[r.name] = categories.filter(c => c.parentId === r.id).map(c => c.name)
  }
  return tree
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

export function MovimentoMagazzinoDialog({
  tipo,
  onOk,
  onClose,
}: {
  tipo: 'Carica' | 'Scarica' | 'Rettifica'
  onOk: (qta: number) => void
  onClose: () => void
}) {
  const [qta, setQta] = useState(1)
  return (
    <div className="prodotti-dialog-overlay" onClick={onClose}>
      <div className="prodotti-dialog" onClick={e => e.stopPropagation()}>
        <div className="prodotti-dialog__titlebar">{tipo} magazzino</div>
        <div className="prodotti-dialog__body">
          <label className="prodotti-field__label">Quantità</label>
          <input className="prodotti-input prodotti-input--short" type="number" value={qta} onChange={e => setQta(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="prodotti-dialog__footer">
          <button type="button" className="prodotti-dialog__btn" onClick={() => { onOk(qta); onClose() }}>
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
