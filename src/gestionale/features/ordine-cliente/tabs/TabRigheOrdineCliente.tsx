import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Product } from '../../../../types'
import type { Category } from '../../../../types'
import { addProduct, getNextProductCode } from '../../../../lib/firestore'
import {
  addCustomCampoFE,
  getCustomCampiFE,
} from '../../../../lib/userPrefs'
import ColonneDialog from '../../vendita-banco/dialogs/ColonneDialog'
import SelezioneProdottiDialog from '../../vendita-banco/dialogs/SelezioneProdottiDialog'
import WinDropdownMenu from '../../vendita-banco/WinDropdownMenu'
import { WinButton, WinIconBtn, WinInput } from '../../vendita-banco/WinControls'
import { BARCODE_HELP_TEXT, findProductByScanCode } from '../../vendita-banco/barcodeLookup'
import {
  CAMPI_FE_ITEMS,
} from '../../vendita-banco/constants'
import { useStudioTables } from '../../../../contexts/StudioTablesContext'
import { aliquotaValues } from '../../../../lib/studioTables'
import { isSpreadsheetImportFile, spreadsheetImportRejectionMessage } from '../../../../lib/daneaImport/spreadsheet'
import {
  confrontaPrezziCatalogoOrdine,
  exportRigheOrdineExcel,
  importRigheOrdineFromExcel,
  moveRigaOrdine,
  portaTotaleAOrdine,
  scontoSuTotaleRigheOrdine,
  sortRigheOrdine,
} from '../righeUtilitaOrdine'
import {
  COLONNE_RIGHE_DEFAULT,
  COLONNE_RIGHE_ORDER,
  COLONNE_RIGHE_WIDTH_DEFAULT,
  type ColonnaRigheId,
  type RigaDocumento,
} from '../../vendita-banco/types'
import { useRigheColumnWidths } from '../../vendita-banco/useRigheColumnWidths'
import {
  formatEuro,
  grossFromNet,
  netFromGross,
  notaDescrizioneClass,
} from '../../vendita-banco/utils'
import type { DocumentoOrdineCliente, RigaOrdineCliente } from '../types'
import {
  applyProductToRigaOrdine,
  calcRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
  parseScontoExpr,
  rigaDocumentoToRigaOrdine,
} from '../utils'

const round2 = (n: number) => Math.round(n * 100) / 100

type SortableOrdineCol = 'prezzoNetto' | 'sconto' | 'iva' | 'impegnaMag'

const ORDINE_COLONNE_LABELS: Partial<Record<ColonnaRigheId, string>> = {
  prezzoIvato: 'Prezzo ivato',
  scaricaMag: 'Impegna',
  importoIvato: 'Importo',
  tagliaColore: 'Taglia/Colore',
}

type Props = {
  doc: DocumentoOrdineCliente
  products: Product[]
  categories: Category[]
  studioId?: string
  impegnaColumnLabel?: string
  showImpegnaColumn?: boolean
  prezzoColumnLabel?: string
  /** true = colonna prezzi/importi ivati, false = netti. Se presente onPrezziModeChange l'header è cliccabile (stile Danea). */
  prezziIvati?: boolean
  onPrezziModeChange?: (ivati: boolean) => void
  showCodProdFornitore?: boolean
  /** Mostra il menu "Campi fatt. elettr." (true di default). Disattivato per gli ordini cliente. */
  showCampiFE?: boolean
  /** Mostra il menu "Utilità" e le relative scorciatoie (true di default). Disattivato per gli ordini cliente. */
  showUtilita?: boolean
  colonneLabels?: Partial<Record<ColonnaRigheId, string>>
  colonneDefault?: Partial<Record<ColonnaRigheId, boolean>>
  righeHeaderExtra?: ReactNode
  onChange: (patch: Partial<DocumentoOrdineCliente>) => void
  onProductsChange?: () => void
  onToast?: (msg: string) => void
  onIncludiDoc?: () => void
}

export default function TabRigheOrdineCliente({
  doc,
  products,
  categories,
  studioId,
  impegnaColumnLabel = 'Impegna',
  showImpegnaColumn = true,
  prezzoColumnLabel = 'Prezzo ivato',
  prezziIvati = true,
  onPrezziModeChange,
  showCodProdFornitore = false,
  showCampiFE = true,
  showUtilita = true,
  colonneLabels,
  colonneDefault,
  righeHeaderExtra,
  onChange,
  onProductsChange,
  onToast,
  onIncludiDoc,
}: Props) {
  const { tables } = useStudioTables()
  const ivaOptions = useMemo(() => aliquotaValues(tables.aliquoteIva), [tables.aliquoteIva])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showColonne, setShowColonne] = useState(false)
  const [showPrezziDialog, setShowPrezziDialog] = useState(false)
  const [showSelezione, setShowSelezione] = useState(false)
  const [showBarcodePanel, setShowBarcodePanel] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [barcodeHelpOpen, setBarcodeHelpOpen] = useState(false)
  const [lastScanMsg, setLastScanMsg] = useState<string | null>(null)
  const [colonne, setColonne] = useState(() => ({ ...COLONNE_RIGHE_DEFAULT, ...colonneDefault }))
  const { widths: colWidths, startResize } = useRigheColumnWidths(COLONNE_RIGHE_WIDTH_DEFAULT)
  const [sortCol, setSortCol] = useState<SortableOrdineCol | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [codeSuggestRow, setCodeSuggestRow] = useState<number | null>(null)
  const [codeSuggestQuery, setCodeSuggestQuery] = useState('')
  const barcodeRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const campiFeItems = [...CAMPI_FE_ITEMS.slice(0, -1), ...getCustomCampiFE(), 'Personalizza…']

  const righe = doc.righe
  // I prezzi sono memorizzati internamente come ivati (canonico). In modalità "netti" la griglia mostra/edita i netti.
  const showNetti = !!onPrezziModeChange && !prezziIvati
  const dispPrezzo = (r: RigaOrdineCliente) => (showNetti ? round2(netFromGross(r.prezzoNetto, r.iva)) : r.prezzoNetto)
  const dispImporto = (r: RigaOrdineCliente) => (showNetti ? round2(r.importo / (1 + (r.iva || 0) / 100)) : r.importo)
  const prezzoHeaderLabel = onPrezziModeChange ? (prezziIvati ? 'Prezzo ivato' : 'Prezzo netto') : prezzoColumnLabel
  const codeSuggestLower = codeSuggestQuery.trim().toLowerCase()
  const codeSuggestions = useMemo(() => {
    if (!codeSuggestLower) return []
    return products
      .filter(p => `${p.code} ${p.name} ${p.brand} ${p.model}`.toLowerCase().includes(codeSuggestLower))
      .slice(0, 10)
  }, [products, codeSuggestLower])

  const vociCount = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota').length
  const qtaTot = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota').reduce((a, r) => a + r.qta, 0)
  const righeImportoTotale = righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .reduce((a, r) => a + dispImporto(calcRigaOrdine(r)), 0)

  const visibleColCount = (Object.keys(colonne) as ColonnaRigheId[]).filter(id => colonne[id]).length

  const commitRighe = (nextRighe: RigaOrdineCliente[], extra?: Partial<DocumentoOrdineCliente>, selectLast = false) => {
    const withEmpty =
      nextRighe.length === 0 || nextRighe[nextRighe.length - 1].descrizione.trim()
        ? [...nextRighe, emptyRigaOrdine()]
        : nextRighe
    onChange({ ...extra, righe: withEmpty })
    setSortCol(null)
    if (selectLast) {
      const activeCount = withEmpty.filter(r => r.descrizione.trim()).length
      if (activeCount > 0) setSelectedIndex(activeCount - 1)
    }
  }

  const appendRows = (rows: RigaOrdineCliente[], extra?: Partial<DocumentoOrdineCliente>) => {
    if (!rows.length) return
    const active = righe.filter(r => r.descrizione.trim())
    commitRighe([...active, ...rows], extra, true)
    const last = rows[rows.length - 1]
    onToast?.(`Aggiunta in documento: ${last.descrizione.trim() || 'Riga'}`)
  }

  const updateRighe = (next: RigaOrdineCliente[]) => {
    commitRighe(next)
  }

  const addRigaManuale = () => {
    const active = righe.filter(r => r.descrizione.trim())
    const next = [...active, calcRigaOrdine(emptyRigaOrdine())]
    onChange({ righe: next })
    setSortCol(null)
    setSelectedIndex(next.length - 1)
    onToast?.('Nuova riga aggiunta — compila descrizione, quantità e prezzo.')
  }

  const updateRow = (index: number, patch: Partial<RigaOrdineCliente>) => {
    const next = righe.map((r, i) => (i === index ? calcRigaOrdine({ ...r, ...patch }) : r))
    updateRighe(next)
  }

  const applyProduct = (p: Product, rowIndex: number | null) => {
    const row = applyProductToRigaOrdine(p, doc.listino)
    if (rowIndex !== null && rowIndex >= 0 && rowIndex < righe.length) {
      updateRighe(righe.map((r, i) => (i === rowIndex ? { ...row, id: r.id } : r)))
    } else {
      appendRows([row])
    }
    setShowSelezione(false)
    setCodeSuggestRow(null)
    setCodeSuggestQuery('')
  }

  const tryAutoFillProductCode = (code: string, rowIndex: number) => {
    const trimmed = code.trim()
    if (!trimmed) return false
    const p = products.find(prod => prod.code?.trim().toLowerCase() === trimmed.toLowerCase())
    if (!p) return false
    applyProduct(p, rowIndex)
    return true
  }

  const addRigaFromSelezione = (row: RigaDocumento) => {
    appendRows([rigaDocumentoToRigaOrdine(row)])
    setShowSelezione(false)
  }

  const finalizeScan = (p: Product, msg: string) => {
    applyProduct(p, null)
    setBarcode('')
    setLastScanMsg(msg)
    onToast?.(`Lettura OK: ${p.name}`)
    window.setTimeout(() => {
      setLastScanMsg(null)
      barcodeRef.current?.focus()
    }, 1200)
  }

  const createProductFromScan = async (code: string) => {
    if (!studioId) {
      alert('Impossibile creare il prodotto: studio non disponibile.')
      return
    }
    try {
      const nextCode = await getNextProductCode(studioId)
      const ref = await addProduct({
        studioId,
        code: nextCode,
        barcode: code,
        name: `Nuovo prodotto ${code}`,
        categoryId: '',
        categoryName: '',
        brand: '',
        model: '',
        typology: 'with_stock',
        unitOfMeasure: 'pz',
        prices: { privati: 0 },
        price: 0,
        stock: 0,
      })
      const newProduct: Product = {
        id: ref.id,
        studioId,
        code: nextCode,
        barcode: code,
        name: `Nuovo prodotto ${code}`,
        categoryId: '',
        categoryName: '',
        brand: '',
        model: '',
        typology: 'with_stock',
        unitOfMeasure: 'pz',
        prices: { privati: 0 },
        price: 0,
        stock: 0,
        createdAt: new Date(),
      }
      onProductsChange?.()
      finalizeScan(newProduct, `Creato e aggiunto: ${nextCode} — ${code}`)
    } catch {
      alert('Errore durante la creazione del prodotto. Riprova.')
      window.setTimeout(() => barcodeRef.current?.focus(), 0)
    }
  }

  const submitBarcode = (raw: string) => {
    const code = raw.trim()
    if (!code) return
    const p = findProductByScanCode(products, code)
    if (!p) {
      const wantNew = window.confirm(
        `Il codice "${code}" non è presente in magazzino.\n\nVuoi aggiungerlo come nuovo prodotto?`,
      )
      if (wantNew) {
        void createProductFromScan(code)
      } else {
        setBarcode('')
        window.setTimeout(() => barcodeRef.current?.focus(), 0)
      }
      return
    }
    finalizeScan(p, `Aggiunto: ${p.code} — ${p.name}`)
  }

  useEffect(() => {
    if (!showBarcodePanel) return
    const t = window.setTimeout(() => barcodeRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [showBarcodePanel])

  const toggleBarcodeMode = () => {
    setShowBarcodePanel(v => {
      const next = !v
      if (next) setShowSelezione(false)
      return next
    })
  }

  const sortColMap: Record<SortableOrdineCol, ColonnaRigheId> = {
    prezzoNetto: 'prezzoIvato',
    sconto: 'sconto',
    iva: 'iva',
    impegnaMag: 'scaricaMag',
  }

  const toggleSort = (column: SortableOrdineCol) => {
    if (sortCol === column) {
      if (sortDir === 'asc') {
        setSortDir('desc')
        updateRighe(sortRigheOrdine(righe, column, 'desc'))
      } else {
        setSortCol(null)
        onChange({ righe: doc.righe })
      }
      return
    }
    setSortCol(column)
    setSortDir('asc')
    updateRighe(sortRigheOrdine(righe, column, 'asc'))
  }

  const visibleColumnIds = COLONNE_RIGHE_ORDER.filter(id => colonne[id])

  const columnLabel = (id: ColonnaRigheId, fallback: string) =>
    colonneLabels?.[id] ?? ORDINE_COLONNE_LABELS[id] ?? fallback

  const importoHeaderLabel = onPrezziModeChange
    ? prezziIvati
      ? 'Importo ivato'
      : 'Importo'
    : columnLabel('importoIvato', 'Importo')

  const colResizeHandle = (id: ColonnaRigheId) => (
    <span
      className="vb-righe__col-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Ridimensiona colonna ${id}`}
      onMouseDown={e => {
        e.preventDefault()
        e.stopPropagation()
        startResize(id, e.clientX)
      }}
      onClick={e => e.stopPropagation()}
    />
  )

  const thStyle = (id: ColonnaRigheId): CSSProperties => ({
    width: colWidths[id],
    minWidth: colWidths[id],
    maxWidth: colWidths[id],
  })

  const sortHeader = (sortId: SortableOrdineCol, label: string) => {
    const colId = sortColMap[sortId]
    if (!colonne[colId]) return null
    const active = sortCol === sortId
    return (
      <th key={colId} className="vb-righe__th" style={thStyle(colId)}>
        <button
          type="button"
          className={`vb-righe__sort-header${active ? ' vb-righe__sort-header--active' : ''}`}
          onClick={() => toggleSort(sortId)}
        >
          {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </button>
        {colResizeHandle(colId)}
      </th>
    )
  }

  const col = (id: ColonnaRigheId, header: string) => {
    if (!colonne[id]) return null
    return (
      <th key={id} className="vb-righe__th" style={thStyle(id)}>
        <span className="vb-righe__th-label">{header}</span>
        {colResizeHandle(id)}
      </th>
    )
  }

  /** Header colonna prezzo: cliccabile per scegliere prezzi netti/ivati (stile Danea). */
  const prezzoHeader = () => {
    const colId: ColonnaRigheId = 'prezzoIvato'
    if (!colonne[colId]) return null
    if (!onPrezziModeChange) return sortHeader('prezzoNetto', prezzoColumnLabel)
    return (
      <th key={colId} className="vb-righe__th" style={thStyle(colId)}>
        <button
          type="button"
          className="vb-righe__sort-header oc-righe__prezzo-header"
          title="Scegli tra prezzi netti o ivati"
          onClick={() => setShowPrezziDialog(true)}
        >
          {prezzoHeaderLabel} ⥥
        </button>
        {colResizeHandle(colId)}
      </th>
    )
  }

  const cellWrap = (id: ColonnaRigheId, content: ReactNode) => {
    if (!colonne[id]) return null
    return <td key={id}>{content}</td>
  }

  const personalizzaCampoFe = () => {
    const code = window.prompt('Inserisci il codice campo fattura elettronica:')
    if (!code?.trim()) return
    addCustomCampoFE(code)
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

  const applyUtilita = (id: string) => {
    switch (id) {
      case 'sconto-su-totale': {
        const raw = window.prompt('Sconto % sul totale documento:', '0')
        if (raw === null) return
        const percent = parseFloat(raw.replace(',', '.'))
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          alert('Sconto non valido (0–100).')
          return
        }
        updateRighe(scontoSuTotaleRigheOrdine(righe, percent))
        onToast?.(`Sconto ${percent}% applicato alle righe merce.`)
        break
      }
      case 'porta-totale': {
        const totals = documentTotalsFromRigheOrdine(
          righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota'),
        )
        const raw = window.prompt(
          'Porta totale documento (ivato) a €:\n(Calcolo fattura inversa — i prezzi riga vengono ricalcolati proporzionalmente)',
          String(totals.totaleDocumento.toFixed(2).replace('.', ',')),
        )
        if (raw === null) return
        const target = parseFloat(raw.replace(',', '.'))
        if (!Number.isFinite(target) || target <= 0) {
          alert('Importo non valido.')
          return
        }
        updateRighe(portaTotaleAOrdine(righe, target))
        onToast?.(`Totale portato a ${formatEuro(target)}.`)
        break
      }
      case 'confronta-prezzi':
        alert(confrontaPrezziCatalogoOrdine(righe, products, doc.listino))
        break
      case 'copia-righe':
        onIncludiDoc?.()
        break
      case 'terminale':
        setShowBarcodePanel(true)
        setShowSelezione(false)
        onToast?.('Terminale portatile attivo — leggi i codici con il lettore o digita e premi Invio.')
        break
      case 'export-excel':
        exportRigheOrdineExcel(righe)
        onToast?.('Esportazione Excel completata.')
        break
      case 'import-excel':
        importRef.current?.click()
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (!showUtilita) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        applyUtilita('sconto-su-totale')
        return
      }
      if (e.shiftKey && e.key === 'F5') {
        e.preventDefault()
        applyUtilita('terminale')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [righe, showUtilita])

  const moveSelected = (direction: -1 | 1) => {
    if (selectedIndex === null) {
      alert('Seleziona una riga da spostare.')
      return
    }
    updateRighe(moveRigaOrdine(righe, selectedIndex, direction))
    setSelectedIndex(selectedIndex + direction)
  }

  const deleteSelected = () => {
    if (selectedIndex === null) {
      alert('Seleziona una riga da eliminare.')
      return
    }
    updateRighe(righe.filter((_, i) => i !== selectedIndex))
    setSelectedIndex(null)
  }

  return (
    <div className="vb-tab-panel vb-righe oc-righe">
      {righeHeaderExtra ? <div className="vb-righe__header-extra">{righeHeaderExtra}</div> : null}
      <div className="vb-righe__grid-wrap">
        <table className="vb-righe__table vb-righe__table--resizable">
          <colgroup>
            {visibleColumnIds.map(id => (
              <col key={id} style={{ width: colWidths[id] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {col('cod', 'Cod.')}
              {showCodProdFornitore ? (
                <th className="vb-righe__th am-col-cod-forn">Cod. prod. forn.</th>
              ) : (
                col('tagliaColore', columnLabel('tagliaColore', 'Taglia/Colore'))
              )}
              {col('descrizione', 'Descrizione')}
              {col('qta', 'Q.tà')}
              {col('um', 'U.m.')}
              {prezzoHeader()}
              {sortHeader('sconto', 'Sconti')}
              {sortHeader('iva', 'Iva')}
              {showImpegnaColumn ? sortHeader('impegnaMag', impegnaColumnLabel) : null}
              {col('importoIvato', importoHeaderLabel)}
            </tr>
          </thead>
          <tbody>
            {righe.map((raw, i) => {
              const r = calcRigaOrdine(raw)
              const isNota = r.tipoRiga === 'nota'
              const isCalcolata = r.tipoRiga === 'calcolata'
              return (
                <tr
                  key={r.id}
                  className={[
                    selectedIndex === i ? 'vb-righe__row--selected' : '',
                    isCalcolata ? 'vb-righe__row--calcolata' : '',
                    isNota ? 'vb-righe__row--nota' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={() => setSelectedIndex(i)}
                >
                  {cellWrap(
                    'cod',
                    <div className="oc-righe__code-cell">
                      <WinInput
                        className="vb-input--flat vb-input--compact"
                        value={r.cod}
                        disabled={isNota}
                        onChange={e => {
                          const value = e.target.value
                          updateRow(i, { cod: value, productId: undefined })
                          setCodeSuggestRow(i)
                          setCodeSuggestQuery(value)
                        }}
                        onFocus={() => {
                          setCodeSuggestRow(i)
                          setCodeSuggestQuery(r.cod)
                        }}
                        onBlur={() => {
                          window.setTimeout(() => setCodeSuggestRow(null), 150)
                          tryAutoFillProductCode(r.cod, i)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            if (tryAutoFillProductCode((e.target as HTMLInputElement).value, i)) {
                              e.preventDefault()
                            }
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                      {codeSuggestRow === i && codeSuggestions.length > 0 ? (
                        <ul className="oc-righe__suggest" role="listbox">
                          {codeSuggestions.map(p => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault()
                                  applyProduct(p, i)
                                }}
                              >
                                <strong>{p.code}</strong> — {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>,
                  )}
                  {showCodProdFornitore ? (
                    <td className="vb-righe__td am-col-cod-forn">
                      <WinInput
                        className="vb-input--flat vb-input--compact"
                        value={r.codProdFornitore || ''}
                        disabled={isNota}
                        onChange={e => updateRow(i, { codProdFornitore: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                  ) : (
                    cellWrap(
                      'tagliaColore',
                      <WinInput
                        className="vb-input--flat"
                        value={r.tagliaColore}
                        disabled={isNota}
                        onChange={e => updateRow(i, { tagliaColore: e.target.value })}
                        onClick={e => e.stopPropagation()}
                      />,
                    )
                  )}
                  {cellWrap(
                    'descrizione',
                    <WinInput
                      className={[
                        'vb-input--flat',
                        isNota ? notaDescrizioneClass(r.descrizione) : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      value={r.descrizione}
                      onChange={e => updateRow(i, { descrizione: e.target.value })}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'qta',
                    <WinInput
                      type="number"
                      min={0}
                      className="vb-input--flat vb-input--right"
                      value={r.qta}
                      disabled={isNota}
                      onChange={e => updateRow(i, { qta: parseFloat(e.target.value) || 0 })}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'um',
                    <WinInput
                      className="vb-input--flat"
                      value={r.um}
                      disabled={isNota}
                      onChange={e => updateRow(i, { um: e.target.value })}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'prezzoIvato',
                    <WinInput
                      type="number"
                      min={0}
                      step={0.01}
                      className="vb-input--flat vb-input--right"
                      value={dispPrezzo(r) || ''}
                      disabled={isNota}
                      onChange={e => {
                        const typed = parseFloat(e.target.value) || 0
                        const stored = showNetti ? round2(grossFromNet(typed, r.iva)) : typed
                        updateRow(i, { prezzoNetto: stored })
                      }}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'sconto',
                    <WinInput
                      className="vb-input--flat vb-input--right"
                      value={r.scontoExpr ?? (r.sconto ? String(r.sconto) : '')}
                      disabled={isNota}
                      placeholder="es. 2+1"
                      title="Sconto in percentuale, anche a cascata (es. 2+1)"
                      onChange={e => updateRow(i, { scontoExpr: e.target.value, sconto: parseScontoExpr(e.target.value) })}
                      onClick={e => e.stopPropagation()}
                    />,
                  )}
                  {cellWrap(
                    'iva',
                    <select
                      className="vb-input vb-input--flat vb-input--compact"
                      value={r.iva}
                      disabled={isNota}
                      onChange={e => updateRow(i, { iva: parseInt(e.target.value, 10) || 0 })}
                      onClick={e => e.stopPropagation()}
                    >
                      {(ivaOptions.includes(r.iva) ? ivaOptions : [...ivaOptions, r.iva].sort((a, b) => a - b)).map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>,
                  )}
                  {showImpegnaColumn
                    ? cellWrap(
                        'scaricaMag',
                        <div style={{ textAlign: 'center', padding: '2px 0' }}>
                          <input
                            type="checkbox"
                            checked={r.impegnaMagazzino}
                            disabled={isNota}
                            onChange={e => updateRow(i, { impegnaMagazzino: e.target.checked })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>,
                      )
                    : null}
                  {cellWrap('importoIvato', <div className="vb-righe__amount">{formatEuro(dispImporto(r))}</div>)}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="vb-righe__foot">
              <td colSpan={Math.max(1, visibleColCount - (colonne.importoIvato ? 1 : 0))}>
                <div className="vb-righe__foot-inner">
                  <span>{vociCount} voci</span>
                  <span className="oc-righe__foot-qta">{qtaTot}</span>
                </div>
              </td>
              {colonne.importoIvato ? (
                <td className="vb-righe__amount vb-righe__foot-total">{formatEuro(righeImportoTotale)}</td>
              ) : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {showBarcodePanel ? (
        <div className="vb-barcode-panel">
          <div className="vb-barcode-panel__label">
            <span>Codice a barre</span>
            <button
              type="button"
              className="vb-barcode-panel__help"
              title="Aiuto lettore codici a barre"
              onClick={() => setBarcodeHelpOpen(true)}
            >
              ?
            </button>
          </div>
          <WinInput
            ref={barcodeRef}
            className="vb-barcode-panel__input"
            value={barcode}
            disabled={false}
            aria-label="Codice a barre"
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitBarcode(barcode)
              }
            }}
          />
          <span className="vb-barcode-panel__hint">Leggere il codice a barre con il lettore</span>
          {lastScanMsg ? <span className="vb-barcode-panel__feedback">{lastScanMsg}</span> : null}
        </div>
      ) : null}

      {barcodeHelpOpen ? (
        <div className="vb-dialog-overlay" style={{ zIndex: 24000 }} onClick={() => setBarcodeHelpOpen(false)}>
          <div className="vb-dialog vb-dialog--sm" onClick={e => e.stopPropagation()}>
            <div className="vb-dialog__titlebar">
              <span>Codice a barre — Aiuto</span>
            </div>
            <div className="vb-dialog__body" style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {BARCODE_HELP_TEXT}
            </div>
            <div className="vb-dialog__footer">
              <WinButton onClick={() => setBarcodeHelpOpen(false)}>Chiudi</WinButton>
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={importRef}
        type="file"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          if (!isSpreadsheetImportFile(file)) {
            alert(spreadsheetImportRejectionMessage(file.name))
            e.target.value = ''
            return
          }
          void importRigheOrdineFromExcel(file).then(imported => {
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
        <WinIconBtn title="Sposta riga su" onClick={() => moveSelected(-1)}>
          ▲
        </WinIconBtn>
        <WinIconBtn title="Sposta riga giù" onClick={() => moveSelected(1)}>
          ▼
        </WinIconBtn>
        <span className="vb-righe__toolbar-label">Aggiungi riga:</span>
        <WinButton onClick={addRigaManuale}>
          ✏ Manuale
        </WinButton>
        <WinButton onClick={() => setShowSelezione(true)}>📦 Prodotti</WinButton>
        <WinButton className={showBarcodePanel ? 'vb-btn--active' : undefined} onClick={() => toggleBarcodeMode()}>
          Cod. barre
        </WinButton>
        <WinButton onClick={deleteSelected}>🗑 Elimina</WinButton>
        {showCampiFE ? (
          <WinDropdownMenu
            label="Campi fatt. elettr."
            items={campiFeItems.map(code => ({
              id: code,
              label: code,
              onClick: () => (code === 'Personalizza…' ? personalizzaCampoFe() : applyCampoFe(code)),
            }))}
          />
        ) : null}
        {showUtilita ? (
        <WinDropdownMenu
          className="vb-dropdown--utilita"
          label="⚡ Utilità"
          items={[
            {
              id: 'sconto-su-totale',
              label: 'Sconto su totale',
              shortcut: 'Ctrl+S',
              onClick: () => applyUtilita('sconto-su-totale'),
            },
            {
              id: 'porta-totale',
              label: 'Porta totale a… (Calcolo fattura inversa)',
              onClick: () => applyUtilita('porta-totale'),
            },
            {
              id: 'confronta-prezzi',
              label: 'Confronta con ultimi prezzi applicati',
              onClick: () => applyUtilita('confronta-prezzi'),
            },
            {
              id: 'copia-righe',
              label: 'Copia righe da altro documento',
              onClick: () => applyUtilita('copia-righe'),
            },
            {
              id: 'terminale',
              label: 'Importa da terminale portatile',
              shortcut: 'Shift+F5',
              onClick: () => applyUtilita('terminale'),
            },
            { id: 'sep-utilita', separator: true },
            {
              id: 'export-excel',
              label: 'Esporta con Excel/OpenOffice/LibreOffice',
              onClick: () => applyUtilita('export-excel'),
            },
            {
              id: 'import-excel',
              label: 'Importa con Excel/OpenOffice/LibreOffice',
              onClick: () => applyUtilita('import-excel'),
            },
          ]}
        />
        ) : null}
        <button type="button" className="vb-link vb-righe__colonne-link" onClick={() => setShowColonne(true)}>
          Colonne…
        </button>
      </div>

      {showColonne ? (
        <ColonneDialog
          visible={colonne}
          labels={ORDINE_COLONNE_LABELS}
          onChange={setColonne}
          onClose={() => setShowColonne(false)}
        />
      ) : null}

      {showPrezziDialog && onPrezziModeChange ? (
        <div className="vb-dialog-overlay" style={{ zIndex: 24000 }} onClick={() => setShowPrezziDialog(false)}>
          <div className="vb-dialog vb-dialog--sm" onClick={e => e.stopPropagation()}>
            <div className="vb-dialog__titlebar">
              <span>Prezzi documento</span>
            </div>
            <div className="vb-dialog__body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              <WinButton
                className={!prezziIvati ? 'vb-btn--active' : undefined}
                onClick={() => {
                  onPrezziModeChange(false)
                  setShowPrezziDialog(false)
                }}
              >
                Usa prezzi netti
              </WinButton>
              <WinButton
                className={prezziIvati ? 'vb-btn--active' : undefined}
                onClick={() => {
                  onPrezziModeChange(true)
                  setShowPrezziDialog(false)
                }}
              >
                Usa prezzi ivati
              </WinButton>
            </div>
            <div className="vb-dialog__footer">
              <WinButton onClick={() => setShowPrezziDialog(false)}>Chiudi</WinButton>
            </div>
          </div>
        </div>
      ) : null}

      {showSelezione && studioId ? (
        <SelezioneProdottiDialog
          products={products}
          categories={categories}
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
