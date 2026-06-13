import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Apre la creazione esistente quando la route ha `?new=1`, poi rimuove il parametro. */
export function useOpenNewOnMount(openNew: () => void): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const consumed = useRef(false)

  useEffect(() => {
    if (consumed.current || searchParams.get('new') !== '1') return
    consumed.current = true
    openNew()
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }, [openNew, searchParams, setSearchParams])
}
