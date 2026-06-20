import { useCallback, useEffect, useState } from 'react'
import { useAppWindows } from '../contexts/AppWindowsContext'
import { useActiveStudio } from '../hooks/useActiveStudio'
import {
  addPaymentResource,
  deletePaymentResource,
  ensureDefaultPaymentResources,
  updatePaymentResource,
} from '../lib/firestore'
import { countPaymentsByResource } from '../lib/firestorePagination'
import type { PaymentResource } from '../types'
import BancheRisorseModal from '../gestionale/features/pagamenti/BancheRisorseModal'

export default function BancheRisorseWindow() {
  const { pagamentiRisorseOpen, closePagamentiRisorse } = useAppWindows()
  const { studioId } = useActiveStudio()
  const [resources, setResources] = useState<PaymentResource[]>([])
  const [paymentCounts, setPaymentCounts] = useState<Record<string, number>>({})

  const refresh = useCallback(async () => {
    if (!studioId) return
    const r = await ensureDefaultPaymentResources(studioId)
    setResources(r)
    const counts = await Promise.all(
      r.map(async res => [res.id, await countPaymentsByResource(studioId, res.id)] as const),
    )
    setPaymentCounts(Object.fromEntries(counts))
  }, [studioId])

  useEffect(() => {
    if (!pagamentiRisorseOpen || !studioId) return
    void refresh()
  }, [pagamentiRisorseOpen, studioId, refresh])

  if (!pagamentiRisorseOpen || !studioId) return null

  return (
    <BancheRisorseModal
      resources={resources}
      paymentCounts={paymentCounts}
      onClose={closePagamentiRisorse}
      onAdd={async data => {
        const sortOrder = resources.length
        await addPaymentResource({
          studioId,
          name: data.name,
          type: data.type,
          initialBalance: data.initialBalance,
          isDefault: data.isDefault,
          homeBankingUrl: data.homeBankingUrl,
          notes: data.notes,
          sortOrder,
        })
        await refresh()
      }}
      onUpdate={async (id, data) => {
        await updatePaymentResource(id, data)
        await refresh()
      }}
      onDelete={async id => {
        await deletePaymentResource(id)
        await refresh()
      }}
      onSetDefault={async id => {
        for (const r of resources) {
          if (r.isDefault && r.id !== id) await updatePaymentResource(r.id, { isDefault: false })
        }
        await updatePaymentResource(id, { isDefault: true })
        await refresh()
      }}
    />
  )
}
