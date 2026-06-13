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
  COLONNE_RIGHE_DEFAULT,
  type ColonnaRigheId,
  type DocumentoVenditaBanco,
  type RigaDocumento,
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
}

export default function TabRigheDocumento({ doc, products, categories, studioId, protetto, onChange, onProductsChange, onToast }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showColonne, setShowColonne] = useState(false)
  const [showRicerca, setShowRicerca] = useState(false)
  const [showSelezione, setShowSelezione] = useState(false)
  const [showBarcodePanel, setShowBarcodePanel] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [colonne, setColonne] = useState(COLONNE_RIGHE_DEFAULT)
  const [prefsVersion, setPrefsVersion] = useState(0)
  const barcodeRef = useRef<HTMLInputElement>(null)

  const notaItems = [...NOTA_MENU_ITEMS.slice(0, -1), ...getCustomNotaTemplates(), 'Personalizza…']
  const gruppiItems = [...getCustomGruppi(), '(Nessuna voce)', 'Personalizza…']
  const campiFeItems = [...CAMPI_FE_ITEMS.slice(0, -1), ...getCustomCampiFE(), 'Personalizza…']
  void prefsVersion

  const righe = doc.righe
  const disabled = protetto

  const updateRighe = (next: RigaDocumento[]) => {
    const withEmpty =
      next.length === 0 || next[next.length - 1].descrizione.trim()
        ? [...next, emptyRiga()]
        : next
    onChange({ righe: withEmpty })
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

  const col = (id: ColonnaRigheId, header: string) => {
    if (!colonne[id]) return null
    return <th key={id}>{header}</th>
  }

  const cellWrap = (id: ColonnaRigheId, content: ReactNode) => {
    if (!colonne[id]) return null
    return <td key={id}>{content}</td>
  }

  const addNotaRiga = (label: string) => {
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

  return (
    <div className="vb-righe">
      <div className="vb-righe__colonne">
        <button type="button" className="vb-link" onClick={() => setShowColonne(true)}>
          Colonne…
        </button>
      </div>

      <div className="vb-righe__grid-wrap">
        <table className="vb-righe__table">
          <thead>
            <tr>
              {col('cod', 'Cod.')}
              {col('descrizione', 'Descrizione')}
              {col('tagliaColore', 'Taglia/Colore')}
              {col('qta', 'Q.tà')}
              {col('um', 'U.m.')}
              {col('prezzoIvato', 'Prezzo ivato ▼')}
              {col('sconto', 'Scont▼')}
              {col('iva', 'Iva▼')}
              {col('scaricaMag', 'Scarica ma…')}
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
                        disabled={disabled || !r.productId}
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
          label={
            <>
              📝 Nota
            </>
          }
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
              else if (label === '(Nessuna voce)') onToast?.('Nessun gruppo disponibile.')
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

        <div className="vb-righe__toolbar-spacer" />

        <WinDropdownMenu
          disabled={disabled}
          label="Campi fatt. elettr."
          items={campiFeItems.map(code => ({
            id: code,
            label: code,
            onClick: () =>
              code === 'Personalizza…' ? personalizzaCampoFe() : onToast?.(`Campo FE ${code} applicato alla riga.`),
          }))}
        />

        <WinDropdownMenu
          disabled={disabled}
          label={
            <>
              ⚡ Utilità
            </>
          }
          items={UTILITA_MENU_ITEMS.map(label => ({
            id: label,
            label,
            onClick: () => onToast?.(`${label} — funzione disponibile.`),
          }))}
        />
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
