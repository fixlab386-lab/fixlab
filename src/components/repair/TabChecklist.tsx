import { useState } from 'react'
import type { ChecklistItem } from '../../types'

interface Props {
  checklistPre: ChecklistItem[]
  checklistPost: ChecklistItem[]
  onTogglePre: (id: string) => void
  onTogglePost: (id: string) => void
  onAddPre: (label: string) => void
  onAddPost: (label: string) => void
  onRemovePre: (id: string) => void
  onRemovePost: (id: string) => void
}

function ChecklistSection({ title, subtitle, items, color, onToggle, onAdd, onRemove }: {
  title: string; subtitle: string; items: ChecklistItem[]; color: string
  onToggle: (id: string) => void; onAdd: (label: string) => void; onRemove: (id: string) => void
}) {
  const [newItem, setNewItem] = useState('')
  const completed = items.filter(i => i.checked).length

  const handleAdd = () => { if (!newItem.trim()) return; onAdd(newItem.trim()); setNewItem('') }

  const inp: React.CSSProperties = { background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', flex: 1, boxSizing: 'border-box' }

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</div>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: completed === items.length && items.length > 0 ? color : 'var(--text-tertiary)' }}>
          {completed}/{items.length}
        </span>
      </div>

      <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', marginBottom: '14px', marginTop: '10px' }}>
        <div style={{ height: '100%', background: color, borderRadius: '2px', width: `${items.length ? (completed / items.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
          Nessun controllo — aggiungine uno qui sotto
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {items.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            background: item.checked ? color + '10' : 'var(--bg-tertiary)',
            border: `1px solid ${item.checked ? color + '40' : 'var(--border-primary)'}`,
            borderRadius: '8px',
          }}>
            <div onClick={() => onToggle(item.id)} style={{
              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
              border: `2px solid ${item.checked ? color : 'var(--border-secondary)'}`,
              background: item.checked ? color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', cursor: 'pointer'
            }}>
              {item.checked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
            </div>
            <span onClick={() => onToggle(item.id)} style={{
              flex: 1, fontSize: '13px', cursor: 'pointer',
              color: item.checked ? color : 'var(--text-primary)',
              textDecoration: item.checked ? 'line-through' : 'none',
              opacity: item.checked ? 0.8 : 1
            }}>{item.label}</span>
            <button onClick={() => onRemove(item.id)} style={{
              width: '24px', height: '24px', borderRadius: '6px',
              background: 'var(--bg-hover)', border: '1px solid var(--danger-border)',
              color: 'var(--danger)', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, lineHeight: 1, transition: 'all 0.15s'
            }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input style={inp} value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Aggiungi controllo personalizzato..." />
        <button onClick={handleAdd} style={{
          padding: '9px 16px', background: color, color: '#fff',
          border: 'none', borderRadius: '8px', fontSize: '13px',
          fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
        }}>+ Aggiungi</button>
      </div>
    </div>
  )
}

export default function TabChecklist({ checklistPre, checklistPost, onTogglePre, onTogglePost, onAddPre, onAddPost, onRemovePre, onRemovePost }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ChecklistSection title="Checklist PRE-riparazione" subtitle="Controlli da fare alla presa in carico" items={checklistPre} color="var(--accent)" onToggle={onTogglePre} onAdd={onAddPre} onRemove={onRemovePre} />
      <ChecklistSection title="Checklist POST-riparazione" subtitle="Controlli da fare prima della consegna" items={checklistPost} color="var(--purple)" onToggle={onTogglePost} onAdd={onAddPost} onRemove={onRemovePost} />
    </div>
  )
}