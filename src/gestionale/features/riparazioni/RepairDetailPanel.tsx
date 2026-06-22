import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { DetailPanel, DetailPanelFields, ToolButton, type DetailPanelField } from '../../../components/ui'
import type { Repair } from '../../../types'
import ClientLinkedDocumentsPanel from '../shared/ClientLinkedDocumentsPanel'
import { formatRepairDate, repairStatusLabel } from './utils'
import { openOrdineForRepair } from './openOrdineForRepair'

export type RepairDetailTab = 'riepilogo' | 'cliente' | 'dispositivo' | 'lavorazione' | 'documenti'

type Props = {
  repair: Repair
  activeTab: RepairDetailTab
  onTabChange: (tab: RepairDetailTab) => void
  onAdvanceStatus: () => void
  onRapportoIntervento: () => void
  onIncassa?: () => void
  canAdvance: boolean
  isReady: boolean
}

function summaryFields(repair: Repair): DetailPanelField[] {
  return [
    { label: 'Stato', value: repairStatusLabel(repair.status) },
    { label: 'Cliente', value: repair.clientName },
    { label: 'Telefono', value: repair.clientPhone },
    { label: 'Dispositivo', value: `${repair.deviceBrand} ${repair.deviceModel}`.trim() },
    { label: 'Problema', value: repair.problem, span: 2 },
    { label: 'Totale', value: `€ ${(repair.totalCost || 0).toFixed(2)}` },
    { label: 'Apertura', value: formatRepairDate(repair.createdAt) },
    ...(repair.diagnosis ? [{ label: 'Diagnosi', value: repair.diagnosis, span: 2 as const }] : []),
    ...(repair.linkedDocumentId
      ? [{ label: 'Ordine cliente', value: 'Collegato — apri dalla tab Documenti o con doppio clic sul ticket', span: 2 as const }]
      : [{ label: 'Ordine cliente', value: 'Non collegato — usa «Ordine cliente» per creare/aprire', span: 2 as const }]),
  ]
}

export default function RepairDetailPanel({
  repair,
  activeTab,
  onTabChange,
  onAdvanceStatus,
  onRapportoIntervento,
  onIncassa,
  canAdvance,
  isReady,
}: Props) {
  const navigate = useNavigate()
  const { openOrdineCliente, openOrdineClienteEdit } = useAppWindows()

  const openOrdine = useCallback(() => {
    openOrdineForRepair(repair, openOrdineCliente, openOrdineClienteEdit)
  }, [repair, openOrdineCliente, openOrdineClienteEdit])

  const clienteContent = useMemo(
    () => (
      <div className="gestionale-detail-edit-stack">
        <DetailPanelFields
          fields={[
            { label: 'Nome', value: repair.clientName },
            { label: 'Telefono', value: repair.clientPhone },
            { label: 'Email', value: repair.clientEmail },
            {
              label: 'Indirizzo',
              value: [repair.clientAddress, repair.clientCap, repair.clientCity, repair.clientProvince]
                .filter(Boolean)
                .join(' '),
              span: 2,
            },
          ]}
        />
        <div className="gestionale-detail-panel__link-row">
          {repair.clientId ? (
            <button type="button" className="gestionale-link-btn" onClick={() => navigate('/clienti')}>
              Apri scheda cliente
            </button>
          ) : null}
          <button type="button" className="gestionale-link-btn" onClick={openOrdine}>
            {repair.linkedDocumentId ? 'Apri ordine cliente' : 'Nuovo ordine cliente'}
          </button>
        </div>
      </div>
    ),
    [repair, navigate, openOrdine],
  )

  const dispositivoContent = useMemo(
    () => (
      <div className="gestionale-detail-edit-stack">
        <DetailPanelFields
          fields={[
            { label: 'Tipo', value: repair.deviceType },
            { label: 'Marca', value: repair.deviceBrand },
            { label: 'Modello', value: repair.deviceModel },
            { label: 'Colore', value: repair.deviceColor },
            { label: 'IMEI / S.N.', value: repair.imei },
            { label: 'Condizioni', value: repair.deviceCondition, span: 2 },
          ]}
        />
        <p className="gestionale-detail-panel__empty-msg" style={{ fontSize: 12, margin: 0 }}>
          Le note dispositivo e la conferma d&apos;ordine si gestiscono nell&apos;ordine cliente collegato (tab Dispositivo).
        </p>
        <div className="gestionale-detail-panel__link-row">
          <button type="button" className="gestionale-link-btn" onClick={openOrdine}>
            {repair.linkedDocumentId ? 'Apri ordine cliente' : 'Crea ordine con note dispositivo'}
          </button>
        </div>
      </div>
    ),
    [repair, openOrdine],
  )

  const lavorazioneContent = useMemo(
    () => (
      <DetailPanelFields
        fields={[
          { label: 'Problema segnalato', value: repair.problem, span: 2 },
          { label: 'Diagnosi', value: repair.diagnosis, span: 2 },
          { label: 'Note officina', value: repair.notes, span: 2 },
          { label: 'Manodopera', value: `€ ${(repair.laborCost || 0).toFixed(2)}` },
          { label: 'Acconto', value: `€ ${(repair.deposit || 0).toFixed(2)}` },
          { label: 'Tempo stimato', value: repair.estimatedTime },
          { label: 'Scadenza', value: repair.deadline || '—' },
          { label: 'Assegnato a', value: repair.assignedTo || '—' },
          { label: 'Righe prodotti', value: repair.products?.length ? `${repair.products.length} voci` : '—' },
        ]}
      />
    ),
    [repair],
  )

  const documentiContent = useMemo(
    () => (
      <div className="gestionale-detail-edit-stack">
        <div className="gestionale-detail-panel__link-row">
          <button type="button" className="gestionale-link-btn" onClick={openOrdine}>
            {repair.linkedDocumentId ? 'Apri ordine cliente collegato' : 'Crea ordine cliente da ticket'}
          </button>
        </div>
        <ClientLinkedDocumentsPanel
          clientId={repair.clientId}
          clientName={repair.clientName}
          documentType="ordine_cliente"
          highlightDocumentId={repair.linkedDocumentId}
          emptyHint="Nessun ordine cliente per questo ticket. Usa il pulsante sopra per crearne uno con le note dispositivo."
        />
      </div>
    ),
    [repair, openOrdine],
  )

  const tabs = [
    { id: 'riepilogo' as const, label: 'Riepilogo', content: null },
    { id: 'cliente' as const, label: 'Cliente', content: clienteContent },
    { id: 'dispositivo' as const, label: 'Dispositivo', content: dispositivoContent },
    { id: 'lavorazione' as const, label: 'Lavorazione', content: lavorazioneContent },
    { id: 'documenti' as const, label: 'Documenti', content: documentiContent },
  ]

  return (
    <DetailPanel
      title={repair.ticketNumber ? `Ticket ${repair.ticketNumber}` : 'Ticket riparazione'}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={id => onTabChange(id as RepairDetailTab)}
      fields={activeTab === 'riepilogo' ? summaryFields(repair) : undefined}
      footer={
        <>
          {isReady && onIncassa ? <ToolButton label="Incassa" icon="💰" onClick={onIncassa} /> : null}
          {canAdvance ? <ToolButton label="Avanti stato" icon="▶" onClick={onAdvanceStatus} /> : null}
          <ToolButton label="Rapporto d'intervento" icon="📄" onClick={onRapportoIntervento} />
          <ToolButton
            label={repair.linkedDocumentId ? 'Ordine cliente' : 'Crea ordine'}
            icon="📦"
            onClick={openOrdine}
          />
        </>
      }
    />
  )
}
