import { useState, useRef } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../firebase'

interface PhotoItem {
  url: string
  path: string
  name: string
  type: 'before' | 'after'
  timestamp: number
}

interface Props {
  studioId: string
  repairId: string
  photos: PhotoItem[]
  onPhotosChange: (photos: PhotoItem[]) => void
}

function PhotoGrid({ items, type, label, color, onDelete, onSelect, selectedPath, onUpload, uploading }: {
  items: PhotoItem[]; type: 'before' | 'after'; label: string; color: string
  onDelete: (photo: PhotoItem) => void; onSelect: (photo: PhotoItem) => void
  selectedPath: string | null; onUpload: (type: 'before' | 'after') => void; uploading: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{items.length} foto</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        {items.map(photo => (
          <div key={photo.path} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', cursor: 'pointer', border: selectedPath === photo.path ? `2px solid ${color}` : '2px solid transparent' }}
            onClick={() => onSelect(photo)}>
            <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button onClick={e => { e.stopPropagation(); onDelete(photo) }}
              style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
        <button onClick={() => onUpload(type)} disabled={uploading}
          style={{ aspectRatio: '1', borderRadius: '8px', border: `2px dashed ${color}40`, background: 'transparent', cursor: uploading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color, fontSize: '11px', fontWeight: 500, fontFamily: 'inherit' }}>
          <span style={{ fontSize: '20px' }}>📷</span>
          <span>{uploading ? '...' : '+ Foto'}</span>
        </button>
      </div>
    </div>
  )
}

export default function TabFoto({ studioId, repairId, photos, onPhotosChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'before' | 'after'>('before')
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')

  const triggerUpload = (type: 'before' | 'after') => {
    setUploadType(type)
    fileInputRef.current?.click()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    const newPhotos = [...photos]
    for (const file of Array.from(files)) {
      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `studios/${studioId}/repairs/${repairId}/photos/${uploadType}_${timestamp}_${safeName}`
        const storageRef = ref(storage, storagePath)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        newPhotos.push({ url, path: storagePath, name: file.name, type: uploadType, timestamp })
      } catch (err) {
        alert(`Errore upload "${file.name}": ${err}`)
      }
    }
    onPhotosChange(newPhotos)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (photo: PhotoItem) => {
    if (!confirm('Eliminare questa foto?')) return
    try {
      const storageRef = ref(storage, photo.path)
      await deleteObject(storageRef)
    } catch (err) {
      console.warn('File già eliminato:', err)
    }
    onPhotosChange(photos.filter(p => p.path !== photo.path))
    if (selectedPhoto?.path === photo.path) setSelectedPhoto(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={handleUpload} />

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
        <PhotoGrid items={beforePhotos} label="📸 Foto PRIMA della riparazione" type="before" color="#f59e0b"
          onDelete={handleDelete} onSelect={setSelectedPhoto} selectedPath={selectedPhoto?.path || null}
          onUpload={triggerUpload} uploading={uploading} />
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px' }}>
        <PhotoGrid items={afterPhotos} label="✅ Foto DOPO la riparazione" type="after" color="#22c55e"
          onDelete={handleDelete} onSelect={setSelectedPhoto} selectedPath={selectedPhoto?.path || null}
          onUpload={triggerUpload} uploading={uploading} />
      </div>

      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto.url} alt={selectedPhoto.name} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: selectedPhoto.type === 'before' ? 'rgba(245,158,11,0.9)' : 'rgba(34,197,94,0.9)', color: '#fff' }}>
                {selectedPhoto.type === 'before' ? 'PRIMA' : 'DOPO'}
              </span>
              <button onClick={() => setSelectedPhoto(null)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}