import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { PaymentConfig } from '../types'
import { DEFAULT_PAYMENT_CONFIG } from '../lib/subscription'

export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getDoc(doc(db, 'config', 'payment'))
      .then(snap => {
        if (cancelled) return
        if (snap.exists()) {
          setConfig({ ...DEFAULT_PAYMENT_CONFIG, ...(snap.data() as PaymentConfig) })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { config, loading }
}
