import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { resolvePresetClient } from './resolvePresetClient'
import { clientToVenditaBancoSeed } from '../features/vendita-banco/utils'
import type { DocumentMenuActionId } from '../../components/navigation/documentMenuConfig'
import type { DocRecord } from '../../types'
import { isActiveDocumentoClienteModalType } from '../features/documento-cliente/constants'
import { isActiveDocumentoFornitoreModalType } from '../features/documento-fornitore/constants'
import { isActiveDocumentType, isPurchaseDocumentType } from '../features/documenti/constants'
import type { ActiveDocumentType } from '../features/documenti/constants'

export function useOpenDocumentFlow() {
  const navigate = useNavigate()
  const { studioId } = useActiveStudio()
  const {
    openOrdineCliente,
    openOrdineClienteEdit,
    openOrdineFornitore,
    openOrdineFornitoreEdit,
    openVenditaBanco,
    openVenditaBancoEdit,
    openDocumentoClienteNew,
    openDocumentoClienteEdit,
    openDocumentoFornitoreNew,
    openDocumentoFornitoreEdit,
  } = useAppWindows()

  const openList = useCallback(
    (type: ActiveDocumentType) => {
      navigate(`/documenti/tipo/${type}`)
    },
    [navigate],
  )

  const openNew = useCallback(
    (type: ActiveDocumentType, options?: { clientId?: string; supplierId?: string }) => {
      if (type === 'ordine_cliente') {
        openOrdineCliente(options?.clientId ? { clientId: options.clientId } : undefined)
        return
      }
      if (type === 'ordine_fornitore') {
        openOrdineFornitore(options?.supplierId ? { supplierId: options.supplierId } : undefined)
        return
      }
      if (type === 'vendita_banco') {
        if (options?.clientId && studioId) {
          void resolvePresetClient(options.clientId, []).then(client => {
            openVenditaBanco(client ? clientToVenditaBancoSeed(client) : undefined)
          })
        } else {
          openVenditaBanco()
        }
        return
      }
      if (isActiveDocumentoClienteModalType(type)) {
        openDocumentoClienteNew(
          type,
          options?.clientId ? { clientId: options.clientId } : undefined,
        )
        return
      }
      if (isActiveDocumentoFornitoreModalType(type)) {
        openDocumentoFornitoreNew(
          type,
          options?.supplierId ? { supplierId: options.supplierId } : undefined,
        )
        return
      }
      if (isPurchaseDocumentType(type)) {
        const base = `/documenti/nuovo?type=${type}`
        const subjectParam = options?.supplierId
          ? `&subjectId=${options.supplierId}&subjectType=supplier`
          : options?.clientId
            ? `&subjectId=${options.clientId}&subjectType=client`
            : ''
        navigate(base + subjectParam)
        return
      }
      navigate(`/documenti/nuovo?type=${type}`)
    },
    [navigate, studioId, openDocumentoClienteNew, openDocumentoFornitoreNew, openOrdineCliente, openOrdineFornitore, openVenditaBanco],
  )

  const openEdit = useCallback(
    (doc: DocRecord) => {
      if (doc.type === 'ordine_cliente') {
        openOrdineClienteEdit(doc.id)
        return
      }
      if (doc.type === 'ordine_fornitore') {
        openOrdineFornitoreEdit(doc.id)
        return
      }
      if (doc.type === 'vendita_banco') {
        openVenditaBancoEdit(doc.id)
        return
      }
      if (isActiveDocumentoClienteModalType(doc.type)) {
        openDocumentoClienteEdit(doc.id)
        return
      }
      if (isActiveDocumentoFornitoreModalType(doc.type)) {
        openDocumentoFornitoreEdit(doc.id)
        return
      }
      navigate(`/documenti/${doc.id}`)
    },
    [navigate, openDocumentoClienteEdit, openDocumentoFornitoreEdit, openOrdineClienteEdit, openOrdineFornitoreEdit, openVenditaBancoEdit],
  )

  const openFromMenu = useCallback(
    (actionId: DocumentMenuActionId) => {
      if (actionId === 'fattura') {
        navigate('/documenti/tipo/fattura')
        return
      }
      if (actionId === 'reg_fatture_fornitore') {
        navigate('/documenti/tipo/reg_fattura_fornitore')
        return
      }
      if (actionId === 'reg_spese_fuori_iva') {
        navigate('/pagamenti')
        return
      }
      if (actionId === 'altri_tipi') {
        navigate('/documenti')
        return
      }
      if (isActiveDocumentType(actionId)) {
        navigate(`/documenti/tipo/${actionId}`)
      }
    },
    [navigate],
  )

  return { openList, openNew, openEdit, openFromMenu }
}
