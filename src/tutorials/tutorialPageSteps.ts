import type { DriveStep } from 'driver.js'

/** Passi specifici della pagina (senza chrome comune menu/ricerca/guida). */
export function getPageStepsForPath(path: string): DriveStep[] {
  if (path === '/' || path === '') {
    return [
      {
        element: '[data-tutorial="page-dashboard"]',
        popover: {
          title: 'Benvenuto in Dashboard',
          description:
            'Qui hai la fotografia del laboratorio: saluto, data, e subito sotto i numeri che contano oggi. Usa questa pagina ogni mattina per capire cosa è aperto, cosa incassare e cosa riordinare.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-kpis"]',
        popover: {
          title: 'Indicatori rapidi (KPI)',
          description:
            'Quattro riquadri: riparazioni ancora da chiudere, fatturato delle completate oggi, prodotti esauriti, numero clienti. Ti dicono dove intervenire per primo.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-recent"]',
        popover: {
          title: 'Ultime riparazioni',
          description:
            'Elenco sintetico con cliente, dispositivo, stato e importo. Clicca una riga per aprire subito la scheda della riparazione e aggiornarla.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-low-stock"]',
        popover: {
          title: 'Scorte basse',
          description:
            'Prodotti sotto soglia o finiti. Clicca per andare al Magazzino con lo stesso contesto. Da lì puoi ordinare, caricare stock o modificare il minimo.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-analytics"]',
        popover: {
          title: 'Andamento nel periodo',
          description:
            'Sezione analitica: cambia periodo (settimana / mese / anno) per vedere fatturato, mix di stati, dispositivi più frequenti e prodotti più usati nelle riparazioni.',
          side: 'top',
        },
      },
      {
        element: '[data-tutorial="dashboard-period"]',
        popover: {
          title: 'Cambia periodo',
          description:
            'I tre pulsanti filtrano tutti i grafici e i totali sottostanti. Confronta ad esempio mese corrente vs anno per capire stagionalità o crescita.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-period-metrics"]',
        popover: {
          title: 'Totali del periodo',
          description:
            'Fatturato nel periodo scelto, numero ticket, completate e valore medio. Utile per obiettivi di banco e per stimare il carico di lavoro.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="dashboard-charts"]',
        popover: {
          title: 'Grafici e classifiche',
          description:
            'Distribuzione per stato, dispositivi più visti e prodotti più montati nelle riparazioni. Ti aiuta a tenere listino e magazzino allineati alla domanda reale.',
          side: 'top',
        },
      },
    ]
  }

  if (path === '/clienti') {
    return [
      {
        element: '[data-tutorial="page-clienti"]',
        popover: {
          title: 'Pagina Clienti',
          description:
            'Layout a due colonne: a sinistra l’elenco con ricerca e raggruppamenti; a destra il dettaglio del cliente selezionato. Su schermi stretti le colonne si impilano.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="clienti-toolbar"]',
        popover: {
          title: 'Nuovo cliente',
          description:
            '«+ Nuovo» apre il pannello destro in modalità inserimento. Compila anagrafica e salva: il codice cliente viene gestito dall’app.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="clienti-search"]',
        popover: {
          title: 'Cerca e filtra',
          description:
            'Cerca per nome, telefono, P.IVA, città. Il menu provincia riduce l’elenco; «Raggruppa» organizza le righe per provincia per vedere la copertura territoriale.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="clienti-list"]',
        popover: {
          title: 'Elenco e selezione',
          description:
            'Clicca una riga della tabella per selezionare il cliente: si evidenzia e il pannello destro mostra contatti, storico riparazioni e totali spesi.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="clienti-detail"]',
        popover: {
          title: 'Dettaglio cliente',
          description:
            'Da qui modifichi i dati, vedi le riparazioni collegate e le statistiche. Salva dopo ogni modifica. Per creare un ticket nuovo usa il menu Riparazioni.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/fornitori') {
    return [
      {
        element: '[data-tutorial="page-fornitori"]',
        popover: {
          title: 'Pagina Fornitori',
          description:
            'Stessa logica dei Clienti: lista a sinistra, dettaglio o modulo a destra. Gestisci chi ti fornisce merce per DDT, fatture d’acquisto e riferimenti contabili.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="fornitori-toolbar"]',
        popover: {
          title: 'Aggiungi fornitore',
          description:
            '«+ Nuovo» apre il modulo nel pannello destro. Salva per restare sul record; la lista a sinistra si aggiorna.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="fornitori-search"]',
        popover: {
          title: 'Ricerca rapida',
          description:
            'Filtra per denominazione o dati che hai inserito. Svuota con la X nel campo quando vuoi tornare all’elenco completo.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="fornitori-list"]',
        popover: {
          title: 'Selezione',
          description:
            'Clicca una riga per caricare il fornitore nel pannello destro: dati fiscali, indirizzo e note per i documenti.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="fornitori-detail"]',
        popover: {
          title: 'Modulo dettaglio',
          description:
            'Modifica i campi e salva. Il pulsante di chiusura (×) nasconde il modulo senza eliminare il fornitore dal database.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/magazzino') {
    return [
      {
        element: '[data-tutorial="page-magazzino"]',
        popover: {
          title: 'Magazzino — panoramica',
          description:
            'Tre zone: categorie a sinistra, griglia centrale con ricerca e prodotti, scheda dettaglio a destra. È il centro per prezzi, stock e movimenti.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="magazzino-categories"]',
        popover: {
          title: 'Albero categorie',
          description:
            '«Tutti i prodotti» mostra l’intero catalogo. Apri le cartelle per filtrare; «+ Nuova» crea sottocategorie. Il conteggio accanto indica quanti articoli sono in quella cartella.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="magazzino-toolbar"]',
        popover: {
          title: 'Azioni rapide',
          description:
            'Scansiona codice a barre, attiva selezione multipla (per spostare o mandare in carrello più righe), «+ Nuovo prodotto» apre l’anagrafica articolo.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="magazzino-search"]',
        popover: {
          title: 'Ricerca intelligente',
          description:
            'Digita nome, marca, modello o barcode: compaiono suggerimenti su categorie e marche. Scegli un suggerimento per applicare il filtro in un click.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="magazzino-chips"]',
        popover: {
          title: 'Filtri a chip',
          description:
            'Marca attiva, stato scorte (disponibile / basse / esaurito), reset filtri. I chip si combinano con la categoria selezionata nella sidebar.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="magazzino-table"]',
        popover: {
          title: 'Tabella prodotti',
          description:
            'Clicca una riga per aprire la scheda a destra (prodotto, caratteristiche, magazzino). In modalità multi-selezione usa le checkbox e la barra arancione per Sposta o Carrello.',
          side: 'top',
        },
      },
      {
        element: '[data-tutorial="magazzino-center"]',
        popover: {
          title: 'Colonna centrale',
          description:
            'Qui lavori tutto il giorno: filtri, tabella e azioni di vendita (icona carrello sulla riga quando non sei in multi-select).',
          side: 'left',
        },
      },
      {
        element: '[data-tutorial="magazzino-detail"]',
        popover: {
          title: 'Scheda prodotto',
          description:
            'Tab Prodotto / Caratteristiche / Magazzino, pulsanti Sposta, Modifica, Elimina. Da qui capisci giacenza, minimo e margine.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/riparazioni') {
    return [
      {
        element: '[data-tutorial="page-riparazioni"]',
        popover: {
          title: 'Centro riparazioni',
          description:
            'Qui segui il flusso laboratorio: filtri a sinistra (su desktop) o chip in alto su mobile, poi tabella centrale con tutti i ticket. Stato, priorità, Cassa e Avanti sono sulla riga.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazioni-explorer"]',
        popover: {
          title: 'Esplora (scorciatoie)',
          description:
            'Voci per «tutte», per stato, completate e link diretto alla Cassa per i ticket già pronti all’incasso.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="riparazioni-toolbar"]',
        popover: {
          title: 'Conteggi e nuovo ticket',
          description:
            'Vedi quante riparazioni sono ancora attive e quante completate; «+ Nuovo ticket» apre la scheda di accettazione.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazioni-search"]',
        popover: {
          title: 'Ricerca ticket',
          description:
            'Filtra per cliente, modello, numero ticket o testo nel problema. Utile in banco quando il cliente telefona.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazioni-filters"]',
        popover: {
          title: 'Chip di stato (mobile)',
          description:
            'Su schermo stretto i filtri per stato sono qui in orizzontale. Su desktop usi la colonna «Stato ticket» a sinistra. Il menu a tendina nella barra ricerca filtra la priorità.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazioni-board"]',
        popover: {
          title: 'Tabella ticket',
          description:
            'Clic su una riga apre il dettaglio. «Avanti» sposta lo stato nel flusso senza aprire la scheda; se è Pronta, usa Cassa per incassare. In basso vedi conteggio righe e valore totale filtrato.',
          side: 'top',
        },
      },
    ]
  }

  if (path === '/riparazioni/nuova' || /^\/riparazioni\/[^/]+$/.test(path)) {
    const isNew = path === '/riparazioni/nuova'
    return [
      {
        element: '[data-tutorial="page-riparazione-form"]',
        popover: {
          title: isNew ? 'Nuova riparazione' : 'Modifica riparazione',
          description: isNew
            ? 'Flusso guidato a schede: cliente, dispositivo, intervento, prodotti usati, foto. Compila in ordine o salta dove hai già i dati; salva per creare il ticket.'
            : 'Stessa interfaccia in modifica: aggiorna stato, costi, prodotti e note. Il totale in basso si ricalcola automaticamente.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazione-header"]',
        popover: {
          title: 'Intestazione e azioni',
          description:
            'Torna alla lista, numero ticket, priorità, pulsanti QR/PDF e WhatsApp (se pronta e con telefono). Riepilogo cliente e dispositivo sempre visibile.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazione-tabs"]',
        popover: {
          title: 'Schede (tab)',
          description:
            'Cliente: scelta o creazione anagrafica. Dispositivo: modello, IMEI, codici. Riparazione: stato, priorità, costi manodopera. Prodotti: ricambi dal magazzino. Foto: prima/dopo.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="riparazione-tab-body"]',
        popover: {
          title: 'Area contenuti',
          description:
            'Qui compaiono i campi del tab attivo. Usa «Avanti» nel tour solo dopo aver letto; puoi poi cliccare le tab nell’ordine che preferisci.',
          side: 'top',
        },
      },
      {
        element: '[data-tutorial="riparazione-footer"]',
        popover: {
          title: 'Totali e salvataggio',
          description:
            'Riepilogo prodotti selezionati, manodopera, totale €. «Aggiorna» o «Salva scheda» registra su Firestore; «Chiudi» torna all’elenco senza salvare modifiche non salvate.',
          side: 'top',
        },
      },
    ]
  }

  if (path === '/documenti') {
    return [
      {
        element: '[data-tutorial="page-documenti"]',
        popover: {
          title: 'Archivio documenti',
          description:
            'Preventivi, fatture, DDT, note vendita: tutto in un elenco filtrabile. Da qui apri il dettaglio o crei un nuovo documento.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documenti-toolbar"]',
        popover: {
          title: 'Nuovo documento',
          description:
            'Menu a tendina: scegli il tipo (cliente vs fornitore) e il modello. Il documento si apre nell’editor con la testata già impostata.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documenti-search"]',
        popover: {
          title: 'Ricerca',
          description:
            'Filtra per soggetto, numero documento o note interne. Combinabile con i chip di tipo sotto.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documenti-type-filters"]',
        popover: {
          title: 'Tipo documento',
          description:
            'Restringi a fattura, preventivo, ecc.; «Tutti» rimuove il filtro. Su mobile questa barra può apparire sotto la tabella.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/documenti/nuovo' || /^\/documenti\/[^/]+$/.test(path)) {
    return [
      {
        element: '[data-tutorial="page-documento"]',
        popover: {
          title: 'Editor documento',
          description:
            'Composer completo: testata con cliente/fornitore, righe, IVA, totali, stampa, allegati e generazione documenti successivi.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documento-testata"]',
        popover: {
          title: 'Testata',
          description:
            'Cerca il soggetto, scegli listino (privati/aziende/…), agente, data e numerazione. Il numero può essere adattato alle tue serie.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documento-tabs"]',
        popover: {
          title: 'Sezioni documento',
          description:
            'Righe: prodotti/servizi. Pagamento: condizioni. Note, indirizzi di consegna, opzioni. Passa tra le tab senza perdere i dati già inseriti.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="documento-tab-body"]',
        popover: {
          title: 'Righe e calcoli',
          description:
            'Aggiungi righe manuali o dal magazzino («Prodotti»). Modifica quantità, prezzo, sconto, IVA: l’importo riga e il totale si aggiornano. Rimuovi con ×.',
          side: 'top',
        },
      },
      {
        element: '[data-tutorial="documento-azioni"]',
        popover: {
          title: 'Stampa, scontrino, salva',
          description:
            'Scontrino (se tipo banco), stampa PDF, etichette, allegati, genera documento collegato. «Conferma» registra definitivo; «Bozza» salva senza chiudere il lavoro.',
          side: 'top',
        },
      },
    ]
  }

  if (path === '/cassa') {
    return [
      {
        element: '[data-tutorial="page-cassa"]',
        popover: {
          title: 'Cassa',
          description:
            'Vendita al banco: aggiungi prodotti dal Magazzino (pulsante carrello sulle righe) oppure importa una riparazione «Pronta» dal pannello a destra o con link /cassa?repairId=…',
          side: 'bottom',
        },
      },
      {
        popover: {
          title: 'Due schermate possibili',
          description:
            'Con carrello vuoto vedi il messaggio centrale, i link a Magazzino o Riparazioni e, se ci sono ticket pronti, l’elenco «Da laboratorio» a destra: un clic importa riparazione in cassa. Con articoli nel carrello compaiono a sinistra le righe modificabili e il blocco Cliente, a destra metodi di pagamento e sconti. Rilancia «Guida» dopo aver aggiunto articoli se vuoi un tour anche su quella vista.',
          side: 'over',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Cliente e quantità',
          description:
            'Cerca il cliente o creane uno al volo. Modifica le quantità con i pulsanti circolari + e −; il totale si aggiorna in tempo reale. «Aggiungi altri» torna al magazzino senza perdere il carrello.',
          side: 'over',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Chiusura vendita',
          description:
            'Scegli il metodo di pagamento (contanti con resto, carta con conferma, bonifico/misto), applica eventuale sconto, poi completa la vendita. Se hai configurato la stampante RT in Impostazioni, puoi emettere lo scontrino fiscale.',
          side: 'over',
          align: 'center',
        },
      },
    ]
  }

  if (path === '/pagamenti') {
    return [
      {
        element: '[data-tutorial="page-pagamenti"]',
        popover: {
          title: 'Registro pagamenti',
          description:
            'Tutte le entrate e uscite: cassa, banco, POS. Collega le operazioni alle descrizioni e filtra per periodo o risorsa.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="pagamenti-toolbar"]',
        popover: {
          title: 'Nuova registrazione',
          description:
            '«+ Entrata» e «+ Uscita» aprono il modulo rapido: data, importo, descrizione, risorsa (cassa/banca/POS). Salva per vedere la riga in tabella.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="pagamenti-search"]',
        popover: {
          title: 'Ricerca testuale',
          description:
            'Filtra per parole nella descrizione o nel nome del soggetto collegato.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="pagamenti-filters"]',
        popover: {
          title: 'Filtri laterali',
          description:
            'Periodo preimpostato o date libere, stato saldato, risorsa. Il riquadro «Saldo» in basso ricalcola i totali sul subset filtrato.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/movimenti') {
    return [
      {
        element: '[data-tutorial="page-movimenti"]',
        popover: {
          title: 'Movimenti di magazzino',
          description:
            'Storico di carichi, scarichi, impegni verso riparazioni e merce in arrivo. Utile per audit e per capire perché una giacenza è cambiata.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="movimenti-toolbar"]',
        popover: {
          title: 'Registra movimento',
          description:
            '«+ Carica» e «- Scarica» aprono il wizard: scegli prodotto, quantità, causale e soggetto. Da lì puoi anche passare a tipi «impegno» o «in arrivo».',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="movimenti-search"]',
        popover: {
          title: 'Ricerca',
          description:
            'Filtra per nome prodotto, cliente/fornitore o testo nella causale.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tutorial="movimenti-filters"]',
        popover: {
          title: 'Filtri e totali',
          description:
            'Periodo, tipo movimento, singolo articolo. I totali in fondo alla pagina si riferiscono solo alle righe visibili dopo i filtri.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/impostazioni') {
    return [
      {
        element: '[data-tutorial="page-impostazioni"]',
        popover: {
          title: 'Impostazioni dello studio',
          description:
            'Configurazione in schede: Negozio, Stampa/PDF, WhatsApp, Registratore, Verifica (checklist stampabile per collaudo) e Account con export ed eliminazione dati.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="impostazioni-sidebar"]',
        popover: {
          title: 'Menu sezioni',
          description:
            'Passa tra le voci a sinistra. Le schede con campi si salvano con «Salva impostazioni» in fondo; la scheda Verifica è solo lettura e serve come promemoria operativo.',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="impostazioni-tab-verifica"]',
        popover: {
          title: 'Checklist Verifica',
          description:
            'Apri Verifica per un elenco per ruolo (admin, tecnico, magazzino, cassa) da seguire in laboratorio. Puoi stamparla o salvarla in PDF dal browser (Ctrl+P / ⌘+P).',
          side: 'right',
        },
      },
      {
        element: '[data-tutorial="impostazioni-content"]',
        popover: {
          title: 'Pannello principale',
          description:
            'Compila i campi della sezione scelta e premi «Salva impostazioni» in fondo (non compare sulla scheda Verifica). In Account trovi export JSON/ZIP e la zona pericolosa per eliminare l’account.',
          side: 'left',
        },
      },
    ]
  }

  if (path === '/impostazioni/whatsapp') {
    return [
      {
        element: '[data-tutorial="page-whatsapp"]',
        popover: {
          title: 'Collegamento WhatsApp',
          description:
            'Integrazione Evolution API: genera il QR, aprilo da WhatsApp sul telefono del laboratorio e attendi la conferma. Serve per messaggi «riparazione pronta» dalla scheda ticket.',
          side: 'bottom',
        },
      },
    ]
  }

  return [
    {
      element: '[data-tutorial="layout-main"]',
      popover: {
        title: 'Guida in arrivo',
        description:
          'Questa schermata non ha ancora passi dedicati nel tour. Usa il menu a sinistra e il pulsante Guida sulle altre pagine: lì trovi spiegazioni passo passo.',
        side: 'top',
      },
    },
  ]
}
