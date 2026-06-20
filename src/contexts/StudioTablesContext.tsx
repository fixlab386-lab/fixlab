import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveStudio } from '../hooks/useActiveStudio'
import {
  defaultStudioTables,
  loadStudioTables,
  studioTablesToFirestore,
  type AliquotaIva,
  type ContoAcquisto,
  type StudioTables,
  type TipoPagamentoVoce,
} from '../lib/studioTables'

type StudioTablesContextValue = {
  tables: StudioTables
  loading: boolean
  saving: boolean
  saveAliquoteIva: (next: AliquotaIva[]) => Promise<void>
  saveTipiPagamento: (next: TipoPagamentoVoce[]) => Promise<void>
  saveContiAcquisto: (next: ContoAcquisto[]) => Promise<void>
}

const StudioTablesContext = createContext<StudioTablesContextValue | null>(null)

export function StudioTablesProvider({ children }: { children: ReactNode }) {
  const { studioId } = useActiveStudio()
  const [tables, setTables] = useState<StudioTables>(() => defaultStudioTables())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const tablesRef = useRef(tables)
  tablesRef.current = tables

  useEffect(() => {
    if (!studioId) {
      setTables(defaultStudioTables())
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = onSnapshot(
      doc(db, 'studios', studioId),
      snap => {
        setTables(loadStudioTables(snap.data() as Record<string, unknown> | undefined))
        setLoading(false)
      },
      err => {
        console.warn('FIXLab: impossibile leggere le tabelle dello studio.', err)
        setTables(defaultStudioTables())
        setLoading(false)
      },
    )
    return unsub
  }, [studioId])

  const persist = useCallback(
    async (next: StudioTables) => {
      // Aggiornamento ottimistico: la UI riflette subito la modifica.
      setTables(next)
      if (!studioId) return
      setSaving(true)
      try {
        await updateDoc(doc(db, 'studios', studioId), studioTablesToFirestore(next))
      } catch (err) {
        console.error('FIXLab: salvataggio tabelle studio non riuscito.', err)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [studioId],
  )

  const saveAliquoteIva = useCallback(
    (next: AliquotaIva[]) => persist({ ...tablesRef.current, aliquoteIva: next }),
    [persist],
  )
  const saveTipiPagamento = useCallback(
    (next: TipoPagamentoVoce[]) => persist({ ...tablesRef.current, tipiPagamento: next }),
    [persist],
  )
  const saveContiAcquisto = useCallback(
    (next: ContoAcquisto[]) => persist({ ...tablesRef.current, contiAcquisto: next }),
    [persist],
  )

  const value = useMemo<StudioTablesContextValue>(
    () => ({ tables, loading, saving, saveAliquoteIva, saveTipiPagamento, saveContiAcquisto }),
    [tables, loading, saving, saveAliquoteIva, saveTipiPagamento, saveContiAcquisto],
  )

  return <StudioTablesContext.Provider value={value}>{children}</StudioTablesContext.Provider>
}

/**
 * Restituisce le tabelle dello studio. Se usato fuori dal provider (es. utility
 * di stampa) ritorna i default senza lanciare eccezioni, per robustezza.
 */
export function useStudioTables(): StudioTablesContextValue {
  const ctx = useContext(StudioTablesContext)
  if (!ctx) {
    return {
      tables: defaultStudioTables(),
      loading: false,
      saving: false,
      saveAliquoteIva: async () => {},
      saveTipiPagamento: async () => {},
      saveContiAcquisto: async () => {},
    }
  }
  return ctx
}
