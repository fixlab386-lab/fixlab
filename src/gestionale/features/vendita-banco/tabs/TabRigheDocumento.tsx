import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  type ColonnaRigheId,
  type DocumentoVenditaBanco,
  type RigaDocumento,
  type SortableColonnaRigheId,
} from '../types'
import { calcRiga, documentTotalsFromRighe, emptyRiga, formatEuro, notaDescrizioneClass, productListGrossPrice, buildNotaRiga } from '../utils'

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
  const [showGruppi, setShowGruppi] = useState(false)
  const [showColonne, setShowColonne] = useState(false)
  const [showSelezione, setShowSelezione] = useState(false)
  const [showBarcodePanel, setShowBarcodePanel] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [barcodeHelpOpen, setBarcodeHelpOpen] = useState(false)
  const [lastScanMsg, setLastScanMsg] = useState<string | null>(null)
  const [colonne, setColonne] = useState(COLONNE_RIGHE_DEFAULT)
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
  const vociCount = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota').length
  const righeImportoTotale = righe
    .filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    .reduce((acc, r) => acc + calcRiga(r).importoIvato, 0)

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
        <WinDropdownMenu
          disabled={disabled}
          label="🧮 Calcolata"
          items={[
            ...CALCOLATA_MENU_ITEMS.slice(0, -1).map(label => ({
              id: label,
              label,
              onClick: () => applyCalcolataItem(label),
            })),
            ...customCalcolata.map(entry => ({
              id: `custom-${entry.label}`,
              label: entry.label,
              onClick: () => applyCustomCalcolata(entry),
            })),
            { id: 'sep-calcolata', separator: true },
            {
              id: 'Personalizza…',
              label: 'Personalizza…',
              onClick: () => personalizzaCalcolata(),
            },
          ]}
        />

        <WinDropdownMenu
          disabled={disabled}
          className="vb-dropdown--nota"
          label="📝 Nota"
          items={[
            {
              id: 'riga-vuota',
              label: 'Riga vuota',
              shortcut: 'Ctrl+F9',
              onClick: () => addRigaVuotaNota(),
            },
            { id: 'sep-nota-1', separator: true },
            ...NOTA_MENU_PREDEFINED.map(label => ({
              id: label,
              label,
              onClick: () => addNotaRiga(label),
            })),
            ...customNota.map(label => ({
              id: `custom-nota-${label}`,
              label,
              onClick: () => addNotaRiga(label),
            })),
            { id: 'sep-nota-2', separator: true },
            {
              id: 'Personalizza…',
              label: 'Personalizza…',
              onClick: () => personalizzaNota(),
            },
          ]}
        />

        <WinButton disabled={disabled || !studioId} onClick={() => setShowGruppi(true)}>
          📁 Gruppi
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

        <div className="vb-righe__toolbar-spacer" />

        <button type="button" className="vb-link vb-righe__colonne-link" onClick={() => setShowColonne(true)}>
          Colonne…
        </button>
      </div>

      {showColonne ? (
        <ColonneDialog visible={colonne} onChange={setColonne} onClose={() => setShowColonne(false)} />
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

      {showGruppi && studioId ? (
        <GruppiProdottiDialog
          studioId={studioId}
          products={products}
          categories={categories}
          listino={doc.listino}
          onInsert={insertGruppoRighe}
          onClose={() => setShowGruppi(false)}
        />
      ) : null}
    </div>
  )
}
