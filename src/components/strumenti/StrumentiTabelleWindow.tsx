import { useAppWindows } from '../../contexts/AppWindowsContext'
import { useStudioTables } from '../../contexts/StudioTablesContext'
import AliquoteIvaModal from './AliquoteIvaModal'
import TipiPagamentoModal from './TipiPagamentoModal'
import ContiAcquistoModal from './ContiAcquistoModal'

export default function StrumentiTabelleWindow() {
  const { strumentiTabella, closeStrumentiTabella } = useAppWindows()
  const { tables, saveAliquoteIva, saveTipiPagamento, saveContiAcquisto } = useStudioTables()

  if (!strumentiTabella) return null

  if (strumentiTabella === 'aliquote') {
    return (
      <AliquoteIvaModal
        aliquote={tables.aliquoteIva}
        onSave={saveAliquoteIva}
        onClose={closeStrumentiTabella}
      />
    )
  }

  if (strumentiTabella === 'pagamenti') {
    return (
      <TipiPagamentoModal
        tipi={tables.tipiPagamento}
        onSave={saveTipiPagamento}
        onClose={closeStrumentiTabella}
      />
    )
  }

  return (
    <ContiAcquistoModal
      conti={tables.contiAcquisto}
      onSave={saveContiAcquisto}
      onClose={closeStrumentiTabella}
    />
  )
}
