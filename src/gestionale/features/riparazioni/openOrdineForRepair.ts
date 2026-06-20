import type { OrdineClienteOpenOptions } from '../../../contexts/AppWindowsContext'
import type { Repair } from '../../../types'

type OpenOrdineCliente = (options?: OrdineClienteOpenOptions) => void
type OpenOrdineClienteEdit = (documentId: string) => void

/** Apre l'ordine cliente collegato al ticket, o ne crea uno precompilato dai dati riparazione. */
export function openOrdineForRepair(
  repair: Repair,
  openOrdineCliente: OpenOrdineCliente,
  openOrdineClienteEdit: OpenOrdineClienteEdit,
) {
  if (repair.linkedDocumentId) {
    openOrdineClienteEdit(repair.linkedDocumentId)
    return
  }
  openOrdineCliente({
    clientId: repair.clientId,
    repairId: repair.id,
  })
}
