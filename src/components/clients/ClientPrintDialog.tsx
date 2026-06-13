import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import type { Client } from '../../types'
import { db } from '../../firebase'
import type { PrintDocumentHeader } from '../../lib/printDocument'
import PrintDialog from '../print/PrintDialog'
import { CLIENT_PRINT_MODELS, renderClientPrintDocument, type ClientPrintContext } from './clientPrintModels'

type Props = {
  rows: Client[]
  selected: Client | null
  archiveName: string
  studioId: string
  onClose: () => void
}

type StudioPrintInfo = {
  name?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  logoUrl?: string
}

function studioSubtitle(studio: StudioPrintInfo): string | undefined {
  const parts = [
    studio.address,
    [studio.cap, studio.city, studio.province].filter(Boolean).join(' '),
  ].filter(Boolean)
  return parts.length ? parts.join(' — ') : undefined
}

export default function ClientPrintDialog({ rows, selected, archiveName, studioId, onClose }: Props) {
  const [studio, setStudio] = useState<StudioPrintInfo>({})

  useEffect(() => {
    if (!studioId) return
    void getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudio(snap.data() as StudioPrintInfo)
    })
  }, [studioId])

  const context = useMemo((): ClientPrintContext => {
    const header: PrintDocumentHeader = {
      documentTitle: 'Clienti',
      archiveName,
      studioName: studio.name || archiveName,
      studioSubtitle: studioSubtitle(studio),
      logoUrl: studio.logoUrl,
    }
    return { rows, selected, header }
  }, [rows, selected, archiveName, studio])

  return (
    <PrintDialog
      title="Stampa"
      filenamePrefix="clienti"
      archiveName={archiveName}
      models={CLIENT_PRINT_MODELS}
      context={context}
      buildDocument={renderClientPrintDocument}
      onClose={onClose}
    />
  )
}
