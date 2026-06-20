import type { Client, Repair } from '../../../types'
import type { DocumentoOrdineCliente, RigaOrdineCliente } from './types'
import { calcRigaOrdine, clientToOrdineCliente, emptyRigaOrdine } from './utils'

function buildDeviceNotes(repair: Repair): string {
  return [
    [repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' '),
    repair.deviceColor ? `Colore: ${repair.deviceColor}` : '',
    repair.deviceType ? `Tipo: ${repair.deviceType}` : '',
    repair.deviceCondition ? `Condizioni: ${repair.deviceCondition}` : '',
    repair.problem ? `Problema: ${repair.problem}` : '',
    repair.diagnosis ? `Diagnosi: ${repair.diagnosis}` : '',
    repair.notes ? `Note officina: ${repair.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function repairProductsToRighe(repair: Repair): RigaOrdineCliente[] {
  const righe: RigaOrdineCliente[] = []

  for (const line of repair.products || []) {
    if (!line.name?.trim()) continue
    righe.push(
      calcRigaOrdine({
        ...emptyRigaOrdine(),
        cod: line.code || '',
        descrizione: [line.name, line.model, line.description].filter(Boolean).join(' ').trim(),
        qta: Math.max(1, line.qty || 1),
        prezzoNetto: line.price || 0,
        sconto: line.discount || 0,
        iva: line.vatPercent ?? 22,
        impegnaMagazzino: Boolean(line.productId),
        productId: line.productId,
      }),
    )
  }

  if ((repair.laborCost || 0) > 0) {
    righe.push(
      calcRigaOrdine({
        ...emptyRigaOrdine(),
        descrizione: 'Manodopera',
        qta: 1,
        prezzoNetto: repair.laborCost,
        iva: 22,
        impegnaMagazzino: false,
      }),
    )
  }

  return righe
}

/** Precompila un ordine cliente dai dati del ticket riparazione (tab Dispositivo e righe). */
export function repairToOrdineClientePatch(
  repair: Repair,
  client?: Client,
): Partial<DocumentoOrdineCliente> {
  const righe = repairProductsToRighe(repair)
  const deviceAccount = [repair.deviceAccount, repair.devicePassword].filter(Boolean).join(' / ')

  const patch: Partial<DocumentoOrdineCliente> = {
    deviceImei: repair.imei || '',
    deviceLockCode: repair.deviceLockCode || repair.devicePin || '',
    deviceAccount,
    deviceNotes: buildDeviceNotes(repair),
    commentoInterno: repair.ticketNumber ? `Ticket ${repair.ticketNumber}` : '',
    campiLiberi: [repair.problem || '', '', '', ''],
    dataPrevistaConclusione: repair.deadline || '',
    acconto: repair.deposit ? `Acconto € ${repair.deposit.toFixed(2)}` : '',
  }

  if (righe.length > 0) {
    patch.righe = [...righe, emptyRigaOrdine()]
  }

  if (client) {
    Object.assign(patch, clientToOrdineCliente(client))
  } else if (repair.clientId) {
    patch.cliente = {
      id: repair.clientId,
      nome: repair.clientName,
      codFiscale: '',
      partitaIva: '',
    }
    if (repair.clientAddress || repair.clientCity) {
      patch.intestatario = {
        indirizzo: repair.clientAddress || '',
        cap: repair.clientCap || '',
        citta: repair.clientCity || '',
        prov: repair.clientProvince || '',
        nazione: 'Italia',
      }
    }
  } else if (repair.clientName) {
    patch.cliente = {
      id: '',
      nome: repair.clientName,
      codFiscale: '',
      partitaIva: '',
    }
  }

  return patch
}
