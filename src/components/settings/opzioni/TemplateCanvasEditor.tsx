import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import type { ConfermaOrdineViewModel } from '../../../lib/confermaOrdineTemplate'
import {
  CANVAS_GRID,
  CANVAS_PAGE_HEIGHT,
  CANVAS_PAGE_WIDTH,
  FIELD_LABELS,
  PX_PER_CM,
  newElementId,
  resolveFieldContent,
  snapToGrid,
  type TemplateCanvasElement,
  type TemplateElementKind,
  type TemplateFieldKey,
} from '../../../lib/templateCanvas'

type Props = {
  elements: TemplateCanvasElement[]
  onChange: (elements: TemplateCanvasElement[]) => void
  previewModel: ConfermaOrdineViewModel
  zoom: number
}

type DragMode = 'move' | 'resize-se' | 'resize-e' | 'resize-s'

type DragState = {
  id: string
  mode: DragMode
  startX: number
  startY: number
  orig: TemplateCanvasElement
}

const MIN_W = 20
const MIN_H = 14

const FONT_FAMILIES = ['Arial', 'Helvetica', 'Segoe UI', 'Times New Roman', 'Courier New']
const FONT_SIZES = [7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 24]

function elementLabel(el: TemplateCanvasElement): string {
  if (el.kind === 'text') return el.content?.slice(0, 40) || 'Testo'
  if (el.fieldKey) return FIELD_LABELS[el.fieldKey] ?? el.fieldKey
  if (el.kind === 'table') return 'Tabella righe'
  if (el.kind === 'line') return 'Linea'
  if (el.kind === 'rect') return 'Rettangolo'
  return 'Elemento'
}

function displayText(el: TemplateCanvasElement, model: ConfermaOrdineViewModel): string {
  if (el.kind === 'text') return el.content ?? ''
  if (el.fieldKey === 'studio.logo') return el.fieldKey ? 'Logo azienda' : ''
  if (el.kind === 'table') return 'Tabella righe documento'
  if (el.kind === 'line' || el.kind === 'rect') return ''
  const resolved = resolveFieldContent(el, model)
  if (el.fieldKey && ['client.title', 'second.title', 'footer.signature', 'footer.total.label'].includes(el.fieldKey)) {
    return resolved
  }
  if (el.fieldKey) return resolved.slice(0, 120) + (resolved.length > 120 ? '…' : '')
  return el.content ?? ''
}

function RulerH({ zoom }: { zoom: number }) {
  const marks: React.ReactNode[] = []
  for (let cm = 0; cm <= 22; cm++) {
    const x = cm * PX_PER_CM * zoom
    marks.push(
      <span key={cm} className="tc-ruler__mark" style={{ left: x }}>
        {cm > 0 ? cm : ''}
      </span>,
    )
  }
  return (
    <div className="tc-ruler tc-ruler--h" style={{ width: CANVAS_PAGE_WIDTH * zoom + 24 }}>
      {marks}
    </div>
  )
}

function RulerV({ zoom }: { zoom: number }) {
  const marks: React.ReactNode[] = []
  for (let cm = 0; cm <= 30; cm++) {
    const y = cm * PX_PER_CM * zoom
    marks.push(
      <span key={cm} className="tc-ruler__mark" style={{ top: y }}>
        {cm > 0 ? cm : ''}
      </span>,
    )
  }
  return (
    <div className="tc-ruler tc-ruler--v" style={{ height: CANVAS_PAGE_HEIGHT * zoom + 24 }}>
      {marks}
    </div>
  )
}

export default function TemplateCanvasEditor({ elements, onChange, previewModel, zoom }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [clipboard, setClipboard] = useState<TemplateCanvasElement | null>(null)
  const [history, setHistory] = useState<TemplateCanvasElement[][]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const selected = elements.find(e => e.id === selectedId) ?? null

  const pushHistory = useCallback(
    (next: TemplateCanvasElement[]) => {
      setHistory(prev => {
        const trimmed = prev.slice(0, historyIdx + 1)
        return [...trimmed, next.map(e => ({ ...e }))].slice(-40)
      })
      setHistoryIdx(i => Math.min(i + 1, 39))
    },
    [historyIdx],
  )

  const commit = useCallback(
    (next: TemplateCanvasElement[], recordHistory = true) => {
      onChange(next)
      if (recordHistory) pushHistory(next)
    },
    [onChange, pushHistory],
  )

  const patchSelected = useCallback(
    (patch: Partial<TemplateCanvasElement>) => {
      if (!selectedId) return
      commit(elements.map(e => (e.id === selectedId ? { ...e, ...patch } : e)))
    },
    [selectedId, elements, commit],
  )

  const undo = useCallback(() => {
    if (historyIdx <= 0) return
    const idx = historyIdx - 1
    setHistoryIdx(idx)
    onChange(history[idx].map(e => ({ ...e })))
  }, [history, historyIdx, onChange])

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return
    const idx = historyIdx + 1
    setHistoryIdx(idx)
    onChange(history[idx].map(e => ({ ...e })))
  }, [history, historyIdx, onChange])

  useEffect(() => {
    if (history.length === 0) {
      setHistory([elements.map(e => ({ ...e }))])
      setHistoryIdx(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const el = elements.find(x => x.id === selectedId)
        if (el && !el.locked && el.kind === 'text') {
          e.preventDefault()
          commit(elements.filter(x => x.id !== selectedId))
          setSelectedId(null)
        }
      }
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? CANVAS_GRID * 2 : CANVAS_GRID
        const el = elements.find(x => x.id === selectedId)
        if (!el || el.locked) return
        const delta = { ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step }, ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 } }[e.key]!
        commit(
          elements.map(x =>
            x.id === selectedId
              ? { ...x, x: snapToGrid(Math.max(0, x.x + delta.x)), y: snapToGrid(Math.max(0, x.y + delta.y)) }
              : x,
          ),
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingId, selectedId, elements, commit, undo, redo])

  const startDrag = (e: ReactMouseEvent, id: string, mode: DragMode) => {
    e.stopPropagation()
    const orig = elements.find(x => x.id === id)
    if (!orig || orig.locked) return
    setSelectedId(id)
    setDrag({ id, mode, startX: e.clientX, startY: e.clientY, orig: { ...orig } })
  }

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - drag.startX) / zoom
      const dy = (e.clientY - drag.startY) / zoom
      const o = drag.orig
      let next: TemplateCanvasElement
      if (drag.mode === 'move') {
        next = {
          ...o,
          x: snapToGrid(Math.max(0, Math.min(CANVAS_PAGE_WIDTH - o.width, o.x + dx))),
          y: snapToGrid(Math.max(0, Math.min(CANVAS_PAGE_HEIGHT - o.height, o.y + dy))),
        }
      } else if (drag.mode === 'resize-se') {
        next = {
          ...o,
          width: snapToGrid(Math.max(MIN_W, o.width + dx)),
          height: snapToGrid(Math.max(MIN_H, o.height + dy)),
        }
      } else if (drag.mode === 'resize-e') {
        next = { ...o, width: snapToGrid(Math.max(MIN_W, o.width + dx)) }
      } else {
        next = { ...o, height: snapToGrid(Math.max(MIN_H, o.height + dy)) }
      }
      onChange(elements.map(el => (el.id === drag.id ? next : el)))
    }
    const onUp = () => {
      if (drag) pushHistory(elements)
      setDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, zoom, elements, onChange, pushHistory])

  const insertElement = (kind: TemplateElementKind) => {
    const base: TemplateCanvasElement = {
      id: newElementId(),
      kind,
      x: snapToGrid(CANVAS_PAGE_WIDTH / 2 - 80),
      y: snapToGrid(CANVAS_PAGE_HEIGHT / 2 - 20),
      width: kind === 'line' ? 200 : 160,
      height: kind === 'line' ? 2 : kind === 'rect' ? 80 : 36,
      content: kind === 'text' ? 'Nuovo testo' : undefined,
      fontSize: 10,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'left',
      color: '#000000',
      backgroundColor: kind === 'rect' ? '#ffffff' : 'transparent',
      borderWidth: kind === 'line' || kind === 'rect' ? 1 : 0,
      borderColor: '#000000',
      borderStyle: 'solid',
      zIndex: Math.max(0, ...elements.map(e => e.zIndex ?? 0)) + 1,
    }
    const next = [...elements, base]
    commit(next)
    setSelectedId(base.id)
    if (kind === 'text') setEditingId(base.id)
  }

  const copySelected = () => {
    if (!selected) return
    setClipboard({ ...selected })
  }

  const pasteClipboard = () => {
    if (!clipboard) return
    const pasted: TemplateCanvasElement = {
      ...clipboard,
      id: newElementId(),
      x: snapToGrid(clipboard.x + 15),
      y: snapToGrid(clipboard.y + 15),
    }
    commit([...elements, pasted])
    setSelectedId(pasted.id)
  }

  const deleteSelected = () => {
    if (!selected || selected.locked) return
    if (selected.kind !== 'text' && selected.fieldKey) return
    commit(elements.filter(e => e.id !== selected.id))
    setSelectedId(null)
  }

  const toggleSecondBox = () => {
    const hasSecond = elements.some(e => e.fieldKey === 'second.body')
    if (hasSecond) {
      commit(elements.filter(e => !e.fieldKey?.startsWith('second.')))
    } else {
      const secondElements: TemplateCanvasElement[] = [
        {
          id: newElementId(),
          kind: 'rect',
          x: 397,
          y: 108,
          width: 355,
          height: 90,
          borderWidth: 1,
          borderStyle: 'solid',
          backgroundColor: '#ffffff',
          borderColor: '#000',
          zIndex: 0,
        },
        {
          id: newElementId(),
          kind: 'field',
          fieldKey: 'second.title',
          content: 'Note',
          x: 403,
          y: 112,
          width: 343,
          height: 16,
          fontSize: 8,
          fontWeight: 'bold',
          zIndex: 3,
        },
        {
          id: newElementId(),
          kind: 'field',
          fieldKey: 'second.body',
          x: 403,
          y: 130,
          width: 343,
          height: 62,
          fontSize: 8,
          zIndex: 3,
        },
      ]
      commit([...elements, ...secondElements])
    }
  }

  const finishEdit = (id: string, value: string) => {
    setEditingId(null)
    commit(
      elements.map(e => {
        if (e.id !== id) return e
        return { ...e, content: value }
      }),
    )
  }

  const renderElement = (el: TemplateCanvasElement) => {
    if (el.hidden) return null
    const isSelected = el.id === selectedId
    const isEditing = el.id === editingId
    const style: CSSProperties = {
      left: el.x * zoom,
      top: el.y * zoom,
      width: el.width * zoom,
      height: el.height * zoom,
      fontSize: `${(el.fontSize ?? 10) * zoom}pt`,
      fontFamily: el.fontFamily,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      textDecoration: el.textDecoration,
      textAlign: el.textAlign,
      color: el.color,
      background: el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
      border: el.borderWidth && el.borderStyle !== 'none' ? `${el.borderWidth * zoom}px ${el.borderStyle} ${el.borderColor}` : undefined,
      zIndex: el.zIndex,
    }

    const text = displayText(el, previewModel)
    const isLogo = el.fieldKey === 'studio.logo'
    const isTable = el.kind === 'table'

    return (
      <div
        key={el.id}
        className={`tc-element${isSelected ? ' tc-element--selected' : ''}${el.locked ? ' tc-element--locked' : ''}${isTable ? ' tc-element--table' : ''}`}
        style={style}
        onMouseDown={e => {
          if (isEditing) return
          startDrag(e, el.id, 'move')
        }}
        onDoubleClick={e => {
          e.stopPropagation()
          if (el.kind === 'text' || (el.kind === 'field' && el.content !== undefined)) {
            setEditingId(el.id)
          }
        }}
        title={elementLabel(el)}
      >
        {isEditing ? (
          <textarea
            ref={editRef}
            className="tc-element__editor"
            defaultValue={el.content ?? text}
            onBlur={ev => finishEdit(el.id, ev.target.value)}
            onKeyDown={ev => {
              if (ev.key === 'Escape') setEditingId(null)
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault()
                finishEdit(el.id, ev.currentTarget.value)
              }
            }}
            onMouseDown={ev => ev.stopPropagation()}
          />
        ) : isLogo && previewModel.studio.logoUrl ? (
          <img src={previewModel.studio.logoUrl} alt="" className="tc-element__logo" />
        ) : isTable ? (
          <div className="tc-element__table-preview">
            <div className="tc-element__table-head">Codice · Descrizione · Q.tà · Prezzo · Importo</div>
            <div className="tc-element__table-row">ART001 — Riga di esempio</div>
          </div>
        ) : el.kind === 'line' ? (
          <div className="tc-element__line" />
        ) : (
          <div className="tc-element__text">{text || elementLabel(el)}</div>
        )}

        {isSelected && !el.locked ? (
          <>
            <span className="tc-handle tc-handle--se" onMouseDown={e => startDrag(e, el.id, 'resize-se')} />
            <span className="tc-handle tc-handle--e" onMouseDown={e => startDrag(e, el.id, 'resize-e')} />
            <span className="tc-handle tc-handle--s" onMouseDown={e => startDrag(e, el.id, 'resize-s')} />
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="tc-editor">
      <div className="tc-toolbar">
        <div className="tc-toolbar__group">
          <span className="tc-toolbar__label">Formato</span>
          <select
            className="tc-toolbar__select"
            value={selected?.fontFamily?.split(',')[0] ?? 'Arial'}
            disabled={!selected}
            onChange={e => patchSelected({ fontFamily: `${e.target.value}, Helvetica, sans-serif` })}
          >
            {FONT_FAMILIES.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            className="tc-toolbar__select tc-toolbar__select--sm"
            value={selected?.fontSize ?? 10}
            disabled={!selected}
            onChange={e => patchSelected({ fontSize: Number(e.target.value) })}
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.fontWeight === 'bold' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() => patchSelected({ fontWeight: selected?.fontWeight === 'bold' ? 'normal' : 'bold' })}
            title="Grassetto"
          >
            B
          </button>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.fontStyle === 'italic' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() => patchSelected({ fontStyle: selected?.fontStyle === 'italic' ? 'normal' : 'italic' })}
            title="Corsivo"
          >
            I
          </button>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.textDecoration === 'underline' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() =>
              patchSelected({ textDecoration: selected?.textDecoration === 'underline' ? 'none' : 'underline' })
            }
            title="Sottolineato"
          >
            U
          </button>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.textAlign === 'left' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() => patchSelected({ textAlign: 'left' })}
            title="Allinea a sinistra"
          >
            ≡
          </button>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.textAlign === 'center' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() => patchSelected({ textAlign: 'center' })}
            title="Centra"
          >
            ≡
          </button>
          <button
            type="button"
            className={`tc-toolbar__btn${selected?.textAlign === 'right' ? ' tc-toolbar__btn--active' : ''}`}
            disabled={!selected}
            onClick={() => patchSelected({ textAlign: 'right' })}
            title="Allinea a destra"
          >
            ≡
          </button>
          <input
            type="color"
            className="tc-toolbar__color"
            value={selected?.color ?? '#000000'}
            disabled={!selected}
            onChange={e => patchSelected({ color: e.target.value })}
            title="Colore testo"
          />
        </div>

        <div className="tc-toolbar__group">
          <span className="tc-toolbar__label">Modifica</span>
          <button type="button" className="tc-toolbar__btn" onClick={copySelected} disabled={!selected} title="Copia">
            Copia
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={pasteClipboard} disabled={!clipboard} title="Incolla">
            Incolla
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={deleteSelected} disabled={!selected || !!selected.fieldKey} title="Elimina">
            Elimina
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={undo} title="Annulla">
            ↶
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={redo} title="Ripeti">
            ↷
          </button>
        </div>

        <div className="tc-toolbar__group">
          <span className="tc-toolbar__label">Inserisci</span>
          <button type="button" className="tc-toolbar__btn" onClick={() => insertElement('text')} title="Casella di testo">
            Ab
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={() => insertElement('line')} title="Linea">
            ─
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={() => insertElement('rect')} title="Rettangolo">
            ▭
          </button>
          <button type="button" className="tc-toolbar__btn" onClick={toggleSecondBox} title="Secondo riquadro">
            2° riq.
          </button>
        </div>

        {selected ? (
          <div className="tc-toolbar__selection">
            Selezionato: <strong>{elementLabel(selected)}</strong>
          </div>
        ) : (
          <div className="tc-toolbar__hint">Clicca un elemento per selezionarlo · Doppio clic per modificare il testo · Trascina per spostare</div>
        )}
      </div>

      <div className="tc-workspace">
        <div className="tc-workspace__corner" />
        <RulerH zoom={zoom} />
        <RulerV zoom={zoom} />
        <div
          className="tc-canvas-scroll"
          onMouseDown={() => {
            setSelectedId(null)
            setEditingId(null)
          }}
        >
          <div
            ref={canvasRef}
            className="tc-canvas"
            style={{ width: CANVAS_PAGE_WIDTH * zoom, height: CANVAS_PAGE_HEIGHT * zoom }}
          >
            <div className="tc-page" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
              {[...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map(renderElement)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { TemplateFieldKey }
