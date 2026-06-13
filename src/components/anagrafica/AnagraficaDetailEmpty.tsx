type Props = {
  entityLabel: string
}

export default function AnagraficaDetailEmpty({ entityLabel }: Props) {
  return (
    <div className="gestionale-detail-panel gestionale-detail-panel--empty">
      <div className="gestionale-detail-panel__empty-msg">
        <strong>Nessun {entityLabel} selezionato</strong>
        <p>Clicca una riga nella tabella per visualizzare l’anagrafica.</p>
      </div>
    </div>
  )
}
