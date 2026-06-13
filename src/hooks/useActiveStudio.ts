import { useContext } from 'react'
import { ActiveStudioContext } from '../contexts/ActiveStudioContext'

/**
 * Punto unico per lo studio attivo (archivio corrente).
 * Sostituisce `userProfile.studioId` nelle pagine operative.
 */
export function useActiveStudio() {
  const ctx = useContext(ActiveStudioContext)
  if (!ctx) {
    throw new Error('useActiveStudio deve essere usato dentro ActiveStudioProvider')
  }

  const {
    activeStudioId,
    archives,
    loading,
    legacyStudioId,
    memberships,
    setActiveStudioId,
    refreshArchives,
    setMemberships,
  } = ctx

  return {
    /** ID studio per query Firestore (stringa vuota se non ancora risolto). */
    studioId: activeStudioId ?? '',
    activeStudioId,
    /** Alias esplicito per codice che preferisce il nome lungo. */
    activeStudioIdOrEmpty: activeStudioId ?? '',
    legacyStudioId,
    archives,
    memberships,
    loading,
    hasMultipleArchives: archives.length > 1,
    setActiveStudioId,
    refreshArchives,
    setMemberships,
    /** Archivio attualmente selezionato (metadati). */
    activeArchive: archives.find(a => a.studioId === activeStudioId) ?? null,
  }
}
