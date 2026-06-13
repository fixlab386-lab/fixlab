import type { TabVenditaBancoId } from './types'

export const VENDITA_BANCO_TABS: { id: TabVenditaBancoId; label: string }[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

/** Voci esatte del dropdown Tipo pagamento (ordine FIXLab). */
export const TIPI_PAGAMENTO_VENDITA_BANCO = [
  'Assegno',
  'Assegno circolare',
  'Bancomat',
  'Bonifico 30 gg F.M.',
  'Bonifico 60 gg F.M.',
  'Bonifico vista fattura',
  'Carta di credito',
  'Contanti',
  'Contrassegno',
  'Incasso corrispettivi',
  'Pagato come da relativi documenti sopra indicati',
  'PayPal',
  'RIBA 30 gg F.M.',
  'RIBA 30-60 gg F.M.',
  'RIBA 30-60-90 gg F.M.',
] as const

export const LISTINI = ['Privati', 'Aziende', 'Convenzionati', 'VIP'] as const

export const AGENTI = ['(Nessuno)', 'Agente 1', 'Agente 2', 'Agente 3'] as const

export const NUMERAZIONI = ['', 'A', 'B', 'C', 'D', 'E'] as const

export const NAZIONI = ['Italia', 'San Marino', 'Svizzera', 'Francia', 'Germania', 'Altro'] as const

export const RINNOVO_MESI = [1, 3, 6, 12, 24, 36] as const

export const STAMPA_MODELLI = [
  'Vendita a pubblico (docum.)',
  'Vendita al pubblico (silver)',
  'Vendita al pubblico (completo)',
  'Ricevuta fiscale',
  'Documento interno',
] as const

export const STAMPA_STAMPANTI = ['(Predefinita)', 'Canon TS3100 series', 'Microsoft Print to PDF', 'HP LaserJet'] as const

export const STAMPA_SORGENTI_CARTA = ['(Automatico)', 'Vassoio 1', 'Vassoio 2', 'Alimentazione manuale'] as const

export const NOTA_MENU_ITEMS = [
  'Subtotale',
  'Calcola INPS 4%',
  'Contributo integrativo 4%',
  'Spese di trasporto',
  'Pagamento in contrassegno 2%',
  'Personalizza…',
] as const

export const GRUPPI_MENU_ITEMS = ['(Nessuna voce)', 'Personalizza…'] as const

export const CAMPI_FE_ITEMS = [
  '2.1.1.11',
  '2.2.1.3',
  '2.2.2.3',
  '2.3.1.1',
  '2.3.2.1',
  '2.4.1.1',
  '2.4.2.1',
  'Personalizza…',
] as const

export const TIPI_SPESE = [
  '(Nessuna)',
  'Spese di spedizione',
  'Spese di imballo',
  'Spese bancarie',
  'Spese di trasporto',
  'Altro',
] as const

export const IVA_ALIQUOTE = [0, 4, 5, 10, 22] as const

export const COMMENTI_INTERNI_PREDEFINITI = [
  'Urgente',
  'Da verificare',
  'Cliente abituale',
  'Personalizza…',
] as const

export const UTILITA_MENU_ITEMS = [
  'Scorpora totale',
  'Ruota totale a…',
  'Confronta con ultimi prezzi applicati',
  'Copia righe da altro documento',
  'Importa da terminale lettore',
  'Esporta con Excel/OpenOffice/LibreOffice',
  'Importa con Excel/OpenOffice/LibreOffice',
] as const

export const REGISTRATORE_CASSA_AVVISO =
  'Per stampare scontrini è necessario prima configurare il collegamento col registratore di cassa:\n' +
  '• Uscire dalla finestra attuale ed andare nelle \'Opzioni\' generali (tasto in alto a destra della finestra principale di Easyfatt)\n' +
  '• Nella sezione \'Negozio\' abilitare l\'opzione \'Registratore di cassa\'\n' +
  '• Dal relativo bottone \'Configura…\' selezionare il modello di registratore di cassa collegato al PC e le corrette opzioni di collegamento'
