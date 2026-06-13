import { useRef, useState, type ReactNode } from 'react'
import type { Product } from '../../../../types'
import type { Category } from '../../../../types'
import { addCustomCampoFE, addCustomGruppo, addCustomNotaTemplate, getCustomCampiFE, getCustomGruppi, getCustomNotaTemplates } from '../../../../lib/userPrefs'
import ColonneDialog from '../dialogs/ColonneDialog'
import RicercaProdottiDialog from '../dialogs/RicercaProdottiDialog'
import SelezioneProdottiDialog from '../dialogs/SelezioneProdottiDialog'
import WinDropdownMenu from '../WinDropdownMenu'
import { WinButton, WinIconBtn, WinInput } from '../WinControls'
import {
  CAMPI_FE_ITEMS,
  GRUPPI_MENU_ITEMS,
  NOTA_MENU_ITEMS,
  UTILITA_MENU_ITEMS,
} from '../constants'
import {
  addPercentualeRiga,
  addSubtotaleRiga,
  confrontaPrezziCatalogo,
  exportRigheExcel,
  importRigheFromExcel,
  moveRiga,
  ruotaTotaleIva,
  scorporaTotaleRighe,
  sortRighe,
} from '../righeUtilita'
import {
  COLONNE_RIGHE_DEFAULT,
  type ColonnaRigheId,
  type DocumentoVenditaBanco,
  type RigaDocumento,
  type SortableColonnaRigheId,
} from '../types'
import { calcRiga, emptyRiga, evalCalcolata, formatEuro, productListGrossPrice } from '../utils'

type Props = {
  doc: DocumentoVenditaBanco
  products: Product[]
  categories: Category[]
  studioId?: string
  protetto: boolean
  onChange: (patch: Partial<DocumentoVenditaBanco>) => void
  onProductsChange?: () => void
  onToast?: (msg: string) => void
  onIncludiDoc?: () => void
}

export default function TabRigheDocumento({
  doc,
  products,
  categories,
  studioId,
  protetto,
  onChange,
  onProductsChange,
  onToast,
  onIncludiDoc,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showColonne, setShowColonne] = useState(false)
  const [showRicerca, setShowRicerca] = useState(false)
  const [showSelezione, setShowSelezione] = useState(false)
  const [showBarcodePanel, setShowBarcodePanel] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [colonne, setColonne] = useState(COLONNE_RIGHE_DEFAULT)
  const [sortCol, setSortCol] = useState<SortableColonnaRigheId | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [prefsVersion, setPrefsVersion] = useState(0)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const notaItems = [...NOTA_MENU_ITEMS.slice(0, -1), ...getCustomNotaTemplates(), 'Personalizza…']
  const gruppiItems = [...GRUPPI_MENU_ITEMS.slice(0, -1), ...getCustomGruppi(), 'Personalizza…']
  const campiFeItems = [...CAMPI_FE_ITEMS.slice(0, -1), ...getCustomCampiFE(), 'Personalizza…']
  void prefsVersion

  const righe = doc.righe
  const disabled = protetto
  const vociCount = righe.filter(r => r.descrizione.trim()).length

  const updateRighe = (next: RigaDocumento[]) => {
    const withEmpty =
      next.length === 0 || next[next.length - 1].descrizione.trim()
        ? [...next, emptyRiga()]
        : next
    onChange({ righe: withEmpty })
    setSortCol(null)
  }

  const updateRow = (index: number, patch: Partial<RigaDocumento>) => {
    const next = righe.map((r, i) => (i === index ? calcRiga({ ...r, ...patch }) : r))
    updateRighe(next)
  }

  const applyProduct = (p: Product, rowIndex: number | null) => {
    const gross = productListGrossPrice(p, doc.listino)
    const row = calcRiga({
      ...emptyRiga(),
      productId: p.id,
      cod: p.code || '',
      descrizione: p.name,
      um: p.unitOfMeasure || 'pz',
      prezzoIvato: gross,
      qta: 1,
      iva: 22,
      scaricaMagazzino: p.typology === 'with_stock',
    })
    if (rowIndex !== null && rowIndex >= 0 && rowIndex < righe.length) {
      const next = righe.map((r, i) => (i === rowIndex ? { ...row, id: r.id } : r))
      updateRighe(next)
    } else {
      updateRighe([...righe.filter(r => r.descrizione.trim()), row])
    }
    setShowRicerca(false)
  }

  const addRigaFromSelezione = (row: RigaDocumento) => {
    updateRighe([...righe.filter(r => r.descrizione.trim()), row])
    onToast?.('1 voce inserita nel documento.')
  }

  const toggleSort = (column: SortableColonnaRigheId) => {
    if (sortCol === column) {
      if (sortDir === 'asc') {
        setSortDir('desc')
        updateRighe(sortRighe(righe, column, 'desc'))
      } else {
        setSortCol(null)
        onChange({ righe: doc.righe })
      }
      return
    }
    setSortCol(column)
    setSortDir('asc')
    updateRighe(sortRighe(righe, column, 'asc'))
  }

  const sortHeader = (id: SortableColonnaRigheId, label: string) => {
    if (!colonne[id]) return null
    const active = sortCol === id
    return (
      <th key={id}>
        <button
          type="button"
          className={`vb-righe__sort-header${active ? ' vb-righe__sort-header--active' : ''}`}
          onClick={() => toggleSort(id)}
        >
          {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </button>
      </th>
    )
  }

  const col = (id: ColonnaRigheId, header: string) => {
    if (!colonne[id]) return null
    return <th key={id}>{header}</th>
  }

  const cellWrap = (id: ColonnaRigheId, content: ReactNode) => {
    if (!colonne[id]) return null
    return <td key={id}>{content}</td>
  }

  const addNotaRiga = (label: string) => {
    if (label === 'Subtotale') {
      updateRighe(addSubtotaleRiga(righe))
      return
    }
    if (label === 'Calcola INPS 4%') {
      updateRighe(addPercentualeRiga(righe, 'Contributo INPS 4%', 4))
      return
    }
    if (label === 'Contributo integrativo 4%') {
      updateRighe(addPercentualeRiga(righe, 'Contributo integrativo 4%', 4))
      return
    }
    if (label === 'Spese di trasporto') {
      onChange({ speseTipo: 'Spese di trasporto', speseImporto: doc.speseImporto || 0 })
      onToast?.('Imposta l\'importo spese nel riquadro in basso.')
      return
    }
    if (label === 'Pagamento in contrassegno 2%') {
      updateRighe(addPercentualeRiga(righe, 'Contrassegno 2%', 2))
      return
    }
    const row = calcRiga({ ...emptyRiga(), descrizione: label, tipoRiga: 'nota', qta: 0, prezzoIvato: 0 })
    updateRighe([...righe.filter(r => r.descrizione.trim()), row])
  }

  const addGruppoRiga = (label: string) => {
    const row = calcRiga({ ...emptyRiga(), descrizione: `— ${label} —`, tipoRiga: 'nota', qta: 0, prezzoIvato: 0 })
    updateRighe([...righe.filter(r => r.descrizione.trim()), row])
  }

  const personalizzaNota = () => {
    const label = window.prompt('Inserisci il testo della nota personalizzata:')
    if (!label?.trim()) return
    addCustomNotaTemplate(label)
    setPrefsVersion(v => v + 1)
    addNotaRiga(label.trim())
  }

  const personalizzaGruppo = () => {
    const label = window.prompt('Inserisci il nome del gruppo:')
    if (!label?.trim()) return
    addCustomGruppo(label)
    setPrefsVersion(v => v + 1)
    addGruppoRiga(label.trim())
  }

  const personalizzaCampoFe = () => {
    const code = window.prompt('Inserisci il codice campo fattura elettronica:')
    if (!code?.trim()) return
    addCustomCampoFE(code)
    setPrefsVersion(v => v + 1)
    onToast?.(`Campo FE ${code.trim()} aggiunto ai preferiti.`)
  }

  const applyCampoFe = (code: string) => {
    if (selectedIndex === null) {
      alert('Seleziona una riga a cui applicare il campo FE.')
      return
    }
    updateRow(selectedIndex, { campoFE: code })
    onToast?.(`Campo FE ${code} applicato alla riga selezionata.`)
  }

  const handleUtilita = (label: string) => {
    switch (label) {
      case 'Scorpora totale':
        alert(scorporaTotaleRighe(righe))
        break
      case 'Ruota totale a…': {
        const raw = window.prompt('Nuova aliquota IVA da applicare a tutte le righe (es. 22):', '22')
        if (!raw) return
        const iva = parseFloat(raw)
        if (!Number.isFinite(iva)) {
          alert('Aliquota non valida.')
          return
        }
        updateRighe(ruotaTotaleIva(righe, iva))
        onToast?.(`IVA ${iva}% applicata a tutte le righe.`)
        break
      }
      case 'Confronta con ultimi prezzi applicati':
        alert(confrontaPrezziCatalogo(righe, products, doc.listino))
        break
      case 'Copia righe da altro documento':
        onIncludiDoc?.()
        break
      case 'Importa da terminale lettore':
        setShowBarcodePanel(true)
        setTimeout(() => barcodeRef.current?.focus(), 50)
        onToast?.('Terminale lettore attivo — inquadra o digita il codice.')
        break
      case 'Esporta con Excel/OpenOffice/LibreOffice':
        exportRigheExcel(righe)
        onToast?.('Esportazione Excel completata.')
        break
      case 'Importa con Excel/OpenOffice/LibreOffice':
        importRef.current?.click()
        break
      default:
        break
    }
  }

  const moveSelected = (direction: -1 | 1) => {
    if (selectedIndex === null) {
      alert('Seleziona una riga da spostare.')
      return
    }
    updateRighe(moveRiga(righe, selectedIndex, direction))
    setSelectedIndex(selectedIndex + direction)
  }

  return (
    <div className="vb-righe">
      <div className="vb-righe__grid-wrap">
        <table className="vb-righe__table">
          <thead>
            <tr>
              {col('cod', 'Cod.')}
              {col('descrizione', 'Descrizione')}
              {col('tagliaColore', 'Taglia/Colore')}
              {col('qta', 'Q.tà')}
              {col('um', 'U.m.')}
              {sortHeader('prezzoIvato', 'Prezzo ivato')}
              {sortHeader('sconto', 'Sconti')}
              {sortHeader('iva', 'Iva')}
              {sortHeader('scaricaMag', 'Scarica mag')}
              {col('importoIvato', 'Importo ivato')}
            </tr>
          </thead>
          <tbody>
            {righe.map((raw, i) => {
              const r = calcRiga(raw)
              return (
                <tr
                  key={r.id}
                  className={selectedIndex === i ? 'vb-righe__row--selected' : undefined}
                  onClick={() => setSelectedIndex(i)}
                >
                  {cellWrap(
                    'cod',
                    <div className="vb-row">
                      <WinIconBtn title="Ricerca prodotto" disabled={disabled} onClick={() => !disabled && setShowRicerca(true)}>
                        📦
                      </WinIconBtn>
                      <WinInput className="vb-input--flat vb-input--flex" value={r.cod} readOnly disabled={disabled} />
                    </div>,
                  )}
                  {cellWrap(
                    'descrizione',
                    <WinInput
                      className="vb-input--flat"
                      value={r.descrizione}
                      disabled={disabled}
                      onChange={e => updateRow(i, { descrizione: e.target.value })}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'tagliaColore',
                    <WinInput
                      className="vb-input--flat"
                      value={r.tagliaColore}
                      disabled={disabled}
                      onChange={e => updateRow(i, { tagliaColore: e.target.value })}
                    />,
                  )}
                  {cellWrap(
                    'qta',
                    <WinInput
                      type="number"
                      min={0}
                      className="vb-input--flat vb-input--right"
                      value={r.qta}
                      disabled={disabled}
                      onChange={e => updateRow(i, { qta: parseFloat(e.target.value) || 0 })}
                    />,
                  )}
                  {cellWrap(
                    'um',
                    <WinInput
                      className="vb-input--flat"
                      value={r.um}
                      disabled={disabled}
                      onChange={e => updateRow(i, { um: e.target.value })}
                    />,
                  )}
                  {cellWrap(
                    'prezzoIvato',
                    <WinInput
                      type="number"
                      min={0}
                      step={0.01}
                      className="vb-input--flat vb-input--right"
                      value={r.prezzoIvato}
                      disabled={disabled}
                      onChange={e => updateRow(i, { prezzoIvato: parseFloat(e.target.value) || 0 })}
                    />,
                  )}
                  {cellWrap(
                    'sconto',
                    <WinInput
                      type="number"
                      min={0}
                      max={100}
                      className="vb-input--flat vb-input--right"
                      value={r.sconto}
                      disabled={disabled}
                      onChange={e => updateRow(i, { sconto: parseFloat(e.target.value) || 0 })}
                    />,
                  )}
                  {cellWrap(
                    'iva',
                    <WinInput
                      type="number"
                      min={0}
                      className="vb-input--flat vb-input--right"
                      value={r.iva}
                      disabled={disabled}
                      onChange={e => updateRow(i, { iva: parseFloat(e.target.value) || 0 })}
                    />,
                  )}
                  {cellWrap(
                    'scaricaMag',
                    <div style={{ textAlign: 'center', padding: '2px 0' }}>
                      <input
                        type="checkbox"
                        checked={r.scaricaMagazzino}
                        disabled={disabled}
                        onChange={e => updateRow(i, { scaricaMagazzino: e.target.checked })}
                      />
                    </div>,
                  )}
                  {cellWrap('importoIvato', <div className="vb-righe__amount">{formatEuro(r.importoIvato)}</div>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="vb-righe__nav">
        <WinIconBtn title="Sposta riga su" disabled={disabled} onClick={() => moveSelected(-1)}>
          ▲
        </WinIconBtn>
        <WinIconBtn title="Sposta riga giù" disabled={disabled} onClick={() => moveSelected(1)}>
          ▼
        </WinIconBtn>
        <span className="vb-righe__voci">{vociCount} voci</span>
      </div>

      {showBarcodePanel ? (
        <div className="vb-barcode-panel">
          <strong>Lettore codici a barre con tastiera</strong>
          <WinInput
            ref={barcodeRef}
            className="vb-input--flex"
            value={barcode}
            placeholder="Inquadra o digita codice a barre…"
            disabled={disabled}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const code = barcode.trim()
                if (!code) return
                const p = products.find(x => x.code === code || x.barcode === code)
                if (!p) {
                  alert(`Prodotto con codice "${code}" non trovato.`)
                  return
                }
                applyProduct(p, null)
                setBarcode('')
              }
            }}
          />
        </div>
      ) : null}

      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          void importRigheFromExcel(file).then(imported => {
            if (!imported.length) {
              alert('Nessuna riga valida nel file.')
              return
            }
            updateRighe([...righe.filter(r => r.descrizione.trim()), ...imported])
            onToast?.(`${imported.length} righe importate da Excel.`)
          })
          e.target.value = ''
        }}
      />

      <div className="vb-righe__toolbar">
        <span className="vb-righe__toolbar-label">Aggiungi riga:</span>
        <WinButton disabled={disabled} onClick={() => setShowSelezione(true)}>
          ✏ Manuale
        </WinButton>
        <WinButton disabled={disabled} onClick={() => setShowRicerca(true)}>
          📦 Prodotti
        </WinButton>
        <WinButton
          disabled={disabled}
          onClick={() => {
            setShowBarcodePanel(v => !v)
            if (!showBarcodePanel) setTimeout(() => barcodeRef.current?.focus(), 50)
          }}
        >
          Cod. barre
        </WinButton>
        <WinButton
          disabled={disabled}
          onClick={() => {
            const expr = window.prompt('Inserisci espressione di calcolo (es. 10+5*2):')
            if (!expr) return
            const val = evalCalcolata(expr)
            if (val === null) {
              alert('Espressione non valida.')
              return
            }
            const row = calcRiga({
              ...emptyRiga(),
              descrizione: `Calcolata: ${expr}`,
              prezzoIvato: val,
              tipoRiga: 'calcolata',
            })
            updateRighe([...righe.filter(r => r.descrizione.trim()), row])
          }}
        >
          🧮 Calcolata
        </WinButton>

        <WinDropdownMenu
          disabled={disabled}
          label="📝 Nota"
          items={notaItems.map(label => ({
            id: label,
            label,
            onClick: () => (label === 'Personalizza…' ? personalizzaNota() : addNotaRiga(label)),
          }))}
        />

        <WinDropdownMenu
          disabled={disabled}
          label="📁 Gruppi"
          items={gruppiItems.map(label => ({
            id: label,
            label,
            onClick: () => {
              if (label === 'Personalizza…') personalizzaGruppo()
              else addGruppoRiga(label)
            },
          }))}
        />

        <WinButton
          disabled={disabled}
          onClick={() => {
            if (selectedIndex === null) {
              alert('Seleziona una riga da eliminare.')
              return
            }
            updateRighe(righe.filter((_, i) => i !== selectedIndex))
            setSelectedIndex(null)
          }}
        >
          🗑 Elimina
        </WinButton>

        <WinDropdownMenu
          disabled={disabled}
          label="Campi fatt. elettr."
          items={campiFeItems.map(code => ({
            id: code,
            label: code,
            onClick: () => (code === 'Personalizza…' ? personalizzaCampoFe() : applyCampoFe(code)),
          }))}
        />

        <WinDropdownMenu
          disabled={disabled}
          label="⚡ Utilità"
          items={UTILITA_MENU_ITEMS.map(label => ({
            id: label,
            label,
            onClick: () => handleUtilita(label),
          }))}
        />

        <div className="vb-righe__toolbar-spacer" />

        <button type="button" className="vb-link vb-righe__colonne-link" onClick={() => setShowColonne(true)}>
          Colonne…
        </button>
      </div>

      {showColonne ? (
        <ColonneDialog visible={colonne} onChange={setColonne} onClose={() => setShowColonne(false)} />
      ) : null}

      {showRicerca ? (
        <RicercaProdottiDialog
          products={products}
          categories={categories}
          listino={doc.listino}
          onSelect={p => applyProduct(p, selectedIndex)}
          onClose={() => setShowRicerca(false)}
        />
      ) : null}

      {showSelezione && studioId ? (
        <SelezioneProdottiDialog
          products={products}
          listino={doc.listino}
          studioId={studioId}
          onProductsChange={() => onProductsChange?.()}
          onAdd={addRigaFromSelezione}
          onClose={() => setShowSelezione(false)}
        />
      ) : null}
    </div>
  )
}
