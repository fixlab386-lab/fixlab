import { FornitoriSection } from '../gestionale/features/fornitori'
import { useOpenNewOnMount } from '../hooks/useOpenNewOnMount'
import { useRef } from 'react'

export default function Fornitori() {
  const nuovoRef = useRef<(() => void) | null>(null)
  useOpenNewOnMount(() => nuovoRef.current?.())
  return <FornitoriSection onRegisterNuovo={fn => { nuovoRef.current = fn }} />
}
