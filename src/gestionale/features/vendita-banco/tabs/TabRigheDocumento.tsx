import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useStudioTables } from '../../../../contexts/StudioTablesContext'
import { aliquotaValues } from '../../../../lib/studioTables'
import type { Product } from '../../../../types'
import type { Category } from '../../../../types'
import { addCustomCampoFE, addCustomNotaTemplate, addCustomCalcolataTemplate, getCustomCalcolataTemplates, getCustomCampiFE, getCustomNotaTemplates } from '../../../../lib/userPrefs'
import ColonneDialog from '../dialogs/ColonneDialog'
import GruppiProdottiDialog from '../dialogs/GruppiProdottiDialog'
import SelezioneProdottiDialog from '../dialogs/SelezioneProdottiDialog'
import WinDropdownMenu from '../WinDropdownMenu'
import { WinButton, WinIconBtn, WinInput } from '../WinControls'
import { BARCODE_HELP_TEXT, findProductByScanCode } from '../barcodeLookup'
import {
  CAMPI_FE_ITEMS,
  CALCOLATA_MENU_ITEMS,
  NOTA_MENU_PREDEFINED,
} from '../constants'
import {
  buildImportoFissoRiga,
  buildPercentualeRiga,
  buildSubtotaleRiga,
  confrontaPrezziCatalogo,
  exportRigheExcel,
  importRigheFromExcel,
  moveRiga,
  portaTotaleA,
  scontoSuTotaleRighe,
  sortRighe,
} from '../righeUtilita'
import {
  COLONNE_RIGHE_DEFAULT,
  COLONNE_RIGHE_ORDER,
  COLONNE_RIGHE_WIDTH_DEFAULT,
  type ColonnaRigheId,
  type DocumentoVenditaBanco,
  type RigaDocumento,
  type SortableColonnaRigheId,
} from '../types'
import { useRigheColumnWidths } from '../useRigheColumnWidths'
import { calcRiga, documentTotalsFromRighe, emptyRiga, formatEuro, grossFromNet, netFromGross, notaDescrizioneClass, parseScontoExpr, productListGrossPrice, buildNotaRiga } from '../utils'

const round2 = (n: number) => Math.round(n * 100) / 100

type Props = {
  doc: DocumentoVenditaBanco
  products: Product[]
  categories: Category[]
  studioId?: string
  protetto: boolean
  prezziIvati?: boolean
  onPrezziModeChange?: (ivati: boolean) => void
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
  prezziIvati = true,
  onPrezziModeChange,
  onChange,
  onProductsChange,
  onToast,
  onIncludiDoc,
}: Props) {
  const { tables } = useStudioTables()
  const ivaOptions = useMemo(() => aliquotaValues(tables.aliquoteIva), [tables.aliquoteIva])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showGruppi, setShowGruppi] = useState(false)
  const [showColonne, setShowColonne] = useState(false)
  const [showPrezziDialog, setShowPrezziDialog] = useState(false)
  const [showSelezione, setShowSelezione] = useState(false)
  const [showBarcodePanel, setShowBarcodePanel] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [barcodeHelpOpen, setBarcodeHelpOpen] = useState(false)
  const [lastScanMsg, setLastScanMsg] = useState<string | null>(null)
  const [colonne, setColonne] = useState(COLONNE_RIGHE_DEFAULT)
  const { widths: colWidths, startResize } = useRigheColumnWidths(COLONNE_RIGHE_WIDTH_DEFAULT)
  const [sortCol, setSortCol] = useState<SortableColonnaRigheId | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [prefsVersion, setPrefsVersion] = useState(0)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const customNota = getCustomNotaTemplates()
  const customCalcolata = getCustomCalcolataTemplates()
  const campiFeItems = [...CAMPI_FE_ITEMS.slice(0, -1), ...getCustomCampiFE(), 'Personalizza…']
  void prefsVersion

  const righe = doc.righe
  const disabled = protetto
  // Prezzi memorizzati come ivati (canonico). In modalità "netti" la griglia mostra/edita i netti.
  const showNetti = !!onPrezziModeChange && !prezziIvati
  const dispPrezzo = (r: RigaDocumento) => (showNetti ? round2(netFromGross(r.prezzoIvato, r.iva)) : r.prezzoIvato)
  const dispImporto = (r: RigaDocumento) => (showNetti ? round2(netFromGross(r.importoIvato, r.iva)) : r.importoIvato)
  const prezzoHeaderLabel = onPrezziModeChange ? (prezziIvati ? 'Prezzo ivato' : 'Prezzo netto') : 'Prezzo ivato'
  const importoHeaderLabel = onPrezziModeChange ? (prezziIvati ? 'Importo ivato' : 'Importo') : 'Importo ivato'
  const vociCount = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota').length
  const righeImportoTotale = righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .reduce((acc, r) => acc + dispImporto(calcRiga(r)), 0)

  const visibleColCount = (Object.keys(colonne) as ColonnaRigheId[]).filter(id => colonne[id]).length

  const commitRighe = (nextRighe: RigaDocumento[], extra?: Partial<DocumentoVenditaBanco>, selectLast = false) => {
    const withEmpty =
      nextRighe.length === 0 || nextRighe[nextRighe.length - 1].descrizione.trim()
        ? [...nextRighe, emptyRiga()]
        : nextRighe
    onChange({ ...extra, righe: withEmpty })
    setSortCol(null)
    if (selectLast) {
      const activeCount = withEmpty.filter(r => r.descrizione.trim()).length
      if (activeCount > 0) setSelectedIndex(activeCount - 1)
    }
  }

  const appendRows = (rows: RigaDocumento[], extra?: Partial<DocumentoVenditaBanco>) => {
    if (!rows.length) return
    const active = righe.filter(r => r.descrizione.trim())
    commitRighe([...active, ...rows], extra, true)
    const last = rows[rows.length - 1]
    const msg = last.descrizione.trim() || 'Riga vuota'
    onToast?.(`Aggiunta in documento: ${msg}`)
  }

  const updateRighe = (next: RigaDocumento[]) => {
    commitRighe(next)
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
      appendRows([row])
    }
    setShowSelezione(false)
  }

  const addRigaFromSelezione = (row: RigaDocumento) => {
    appendRows([row])
  }

  const submitBarcode = (raw: string) => {
    const code = raw.trim()
    if (!code) return
    const p = findProductByScanCode(products, code)
    if (!p) {
      alert(`Prodotto con codice a barre "${code}" non trovato nel magazzino.`)
      window.setTimeout(() => barcodeRef.current?.focus(), 0)
      return
    }
    applyProduct(p, null)
    setBarcode('')
    setLastScanMsg(`Aggiunto: ${p.code} — ${p.name}`)
    onToast?.(`Lettura OK: ${p.name}`)
    window.setTimeout(() => {
      setLastScanMsg(null)
      barcodeRef.current?.focus()
    }, 1200)
  }

  useEffect(() => {
    if (!showBarcodePanel) return
    const t = window.setTimeout(() => barcodeRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [showBarcodePanel])

  const openBarcodeMode = () => {
    setShowBarcodePanel(true)
    setShowSelezione(false)
  }

  const toggleBarcodeMode = () => {
    setShowBarcodePanel(v => {
      const next = !v
      if (next) setShowSelezione(false)
      return next
    })
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

  const visibleColumnIds = COLONNE_RIGHE_ORDER.filter(id => colonne[id])

  const colResizeHandle = (id: ColonnaRigheId) =>
    disabled ? null : (
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

  const sortHeader = (id: SortableColonnaRigheId, label: string) => {
    if (!colonne[id]) return null
    const active = sortCol === id
    return (
      <th key={id} className="vb-righe__th" style={thStyle(id)}>
        <button
          type="button"
          className={`vb-righe__sort-header${active ? ' vb-righe__sort-header--active' : ''}`}
          onClick={() => toggleSort(id)}
        >
          {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </button>
        {colResizeHandle(id)}
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

  const cellWrap = (id: ColonnaRigheId, content: ReactNode) => {
    if (!colonne[id]) return null
    return <td key={id}>{content}</td>
  }

  /** Header colonna prezzo: cliccabile per scegliere prezzi netti/ivati (stile Danea). */
  const prezzoHeader = () => {
    const colId: ColonnaRigheId = 'prezzoIvato'
    if (!colonne[colId]) return null
    if (!onPrezziModeChange) return sortHeader('prezzoIvato', 'Prezzo ivato')
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

  const addNotaRiga = (label: string) => {
    appendRows([buildNotaRiga(label)])
  }

  const addRigaVuotaNota = () => {
    appendRows([buildNotaRiga()])
  }

  const applyCalcolataItem = (label: string) => {
    if (label === 'Subtotale') {
      appendRows([buildSubtotaleRiga(righe)])
      return
    }
    if (label === 'Rivalsa INPS 4%') {
      appendRows([buildPercentualeRiga(righe, 'Rivalsa INPS 4%', 4)])
      return
    }
    if (label === 'Contributo integrativo 4%') {
      appendRows([buildPercentualeRiga(righe, 'Contributo integrativo 4%', 4)])
      return
    }
    if (label === 'Spese di trasporto') {
      const raw = window.prompt('Importo spese di trasporto (€):', String(doc.speseImporto || ''))
      if (raw === null) return
      const amount = parseFloat(raw.replace(',', '.'))
      if (!Number.isFinite(amount) || amount < 0) {
        alert('Importo non valido.')
        return
      }
      appendRows([buildImportoFissoRiga('Spese di trasporto', amount, doc.speseIva ?? 22)], {
        speseTipo: 'Spese di trasporto',
        speseImporto: 0,
      })
      return
    }
    if (label === 'Pagamento in contrassegno 2%') {
      appendRows([buildPercentualeRiga(righe, 'Pagamento in contrassegno 2%', 2)])
      return
    }
  }

  const applyCustomCalcolata = (entry: { label: string; percent?: number; amount?: number }) => {
    if (entry.percent != null && Number.isFinite(entry.percent)) {
      appendRows([buildPercentualeRiga(righe, entry.label, entry.percent)])
      return
    }
    appendRows([buildImportoFissoRiga(entry.label, entry.amount ?? 0)])
  }

  const personalizzaCalcolata = () => {
    const label = window.prompt('Descrizione riga calcolata:')
    if (!label?.trim()) return
    const percentRaw = window.prompt('Percentuale sul totale documento (lascia vuoto per importo fisso):', '')
    if (percentRaw === null) return
    const trimmed = percentRaw.trim()
    if (trimmed) {
      const percent = parseFloat(trimmed.replace(',', '.'))
      if (!Number.isFinite(percent)) {
        alert('Percentuale non valida.')
        return
      }
      addCustomCalcolataTemplate({ label: label.trim(), percent })
      setPrefsVersion(v => v + 1)
      appendRows([buildPercentualeRiga(righe, label.trim(), percent)])
      return
    }
    const amountRaw = window.prompt('Importo fisso (€):', '0')
    if (amountRaw === null) return
    const amount = parseFloat(amountRaw.replace(',', '.'))
    if (!Number.isFinite(amount)) {
      alert('Importo non valido.')
      return
    }
    addCustomCalcolataTemplate({ label: label.trim(), amount })
    setPrefsVersion(v => v + 1)
    appendRows([buildImportoFissoRiga(label.trim(), amount)])
  }

  const insertGruppoRighe = (rows: RigaDocumento[]) => {
    appendRows(rows)
  }

  const personalizzaNota = () => {
    const label = window.prompt('Inserisci il testo della nota personalizzata:')
    if (!label?.trim()) return
    addCustomNotaTemplate(label)
    setPrefsVersion(v => v + 1)
    addNotaRiga(label.trim())
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
        updateRighe(scontoSuTotaleRighe(righe, percent))
        onToast?.(`Sconto ${percent}% applicato alle righe merce.`)
        break
      }
      case 'porta-totale': {
        const totals = documentTotalsFromRighe(righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota'))
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
        updateRighe(portaTotaleA(righe, target))
        onToast?.(`Totale portato a ${formatEuro(target)}.`)
        break
      }
      case 'confronta-prezzi':
        alert(confrontaPrezziCatalogo(righe, products, doc.listino))
        break
      case 'copia-righe':
        onIncludiDoc?.()
        break
      case 'terminale':
        openBarcodeMode()
        onToast?.('Terminale portatile attivo — leggi i codici con il lettore o digita e premi Invio.')
        break
      case 'export-excel':
        exportRigheExcel(righe)
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
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F9') {
        e.preventDefault()
        appendRows([buildNotaRiga()])
        return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [disabled, righe])

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
        <table className="vb-righe__table vb-righe__table--resizable">
          <colgroup>
            {visibleColumnIds.map(id => (
              <col key={id} style={{ width: colWidths[id] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {col('cod', 'Cod.')}
              {col('descrizione', 'Descrizione')}
              {col('tagliaColore', 'Taglia/Colore')}
              {col('qta', 'Q.tà')}
              {col('um', 'U.m.')}
              {prezzoHeader()}
              {sortHeader('sconto', 'Sconti')}
              {sortHeader('iva', 'Iva')}
              {sortHeader('scaricaMag', 'Scarica mag')}
              {col('importoIvato', importoHeaderLabel)}
            </tr>
          </thead>
          <tbody>
            {righe.map((raw, i) => {
              const r = calcRiga(raw)
              return (
                <tr
                  key={r.id}
                  className={[
                    selectedIndex === i ? 'vb-righe__row--selected' : '',
                    r.tipoRiga === 'calcolata' ? 'vb-righe__row--calcolata' : '',
                    r.tipoRiga === 'nota' ? 'vb-righe__row--nota' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                  onClick={() => setSelectedIndex(i)}
                >
                  {cellWrap(
                    'cod',
                    <div className="vb-row">
                      <WinIconBtn title="Ricerca prodotto" disabled={disabled} onClick={() => !disabled && setShowSelezione(true)}>
                        📦
                      </WinIconBtn>
                      <WinInput className="vb-input--flat vb-input--flex" value={r.cod} readOnly disabled={disabled} />
                    </div>,
                  )}
                  {cellWrap(
                    'descrizione',
                    <WinInput
                      className={[
                        'vb-input--flat',
                        r.tipoRiga === 'nota' ? notaDescrizioneClass(r.descrizione) : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
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
                      value={dispPrezzo(r)}
                      disabled={disabled}
                      onChange={e => {
                        const typed = parseFloat(e.target.value) || 0
                        const stored = showNetti ? round2(grossFromNet(typed, r.iva)) : typed
                        updateRow(i, { prezzoIvato: stored })
                      }}
                    />,
                  )}
                  {cellWrap(
                    'sconto',
                    <WinInput
                      className="vb-input--flat vb-input--right"
                      value={r.scontoExpr ?? (r.sconto ? String(r.sconto) : '')}
                      disabled={disabled}
                      placeholder="es. 2+1"
                      title="Sconto in percentuale, anche a cascata (es. 2+1)"
                      onChange={e => updateRow(i, { scontoExpr: e.target.value, sconto: parseScontoExpr(e.target.value) })}
                    />,
                  )}
                  {cellWrap(
                    'iva',
                    <select
                      className="vb-input vb-input--flat vb-input--right"
                      value={r.iva}
                      disabled={disabled}
                      onChange={e => updateRow(i, { iva: parseFloat(e.target.value) || 0 })}
                    >
                      {(ivaOptions.includes(r.iva) ? ivaOptions : [...ivaOptions, r.iva].sort((a, b) => a - b)).map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>,
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
                  {cellWrap('importoIvato', <div className="vb-righe__amount">{formatEuro(dispImporto(r))}</div>)}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="vb-righe__foot">
              <td colSpan={Math.max(1, visibleColCount - (colonne.importoIvato ? 1 : 0))}>
                {vociCount} voci
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
            placeholder=""
            disabled={disabled}
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
        <div className="vb-dialog-overlay" style={{ zIndex: 22500 }} onClick={() => setBarcodeHelpOpen(false)}>
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
        <WinIconBtn title="Sposta riga su" disabled={disabled} onClick={() => moveSelected(-1)}>
          ▲
        </WinIconBtn>
        <WinIconBtn title="Sposta riga giù" disabled={disabled} onClick={() => moveSelected(1)}>
          ▼
        </WinIconBtn>
        <span className="vb-righe__toolbar-label">Aggiungi riga:</span>
        <WinButton disabled={disabled} onClick={() => updateRighe([...righe.filter(r => r.descrizione.trim()), calcRiga(emptyRiga())])}>
          ✏ Manuale
        </WinButton>
        <WinButton disabled={disabled} onClick={() => setShowSelezione(true)}>
          📦 Prodotti
        </WinButton>
        <WinButton
          disabled={disabled}
          className={showBarcodePanel ? 'vb-btn--active' : undefined}
          onClick={() => toggleBarcodeMode()}
        >
          Cod. barre
        </WinButton>

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

        <div className="vb-righe__toolbar-spacer" />

        <button type="button" className="vb-link vb-righe__colonne-link" onClick={() => setShowColonne(true)}>
          Colonne…
        </button>
      </div>

      {showColonne ? (
        <ColonneDialog visible={colonne} onChange={setColonne} onClose={() => setShowColonne(false)} />
      ) : null}

      {showPrezziDialog && onPrezziModeChange ? (
        <div className="vb-dialog-overlay" style={{ zIndex: 22500 }} onClick={() => setShowPrezziDialog(false)}>
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
