import type { DriveStep } from 'driver.js'
import { getPageStepsForPath } from './tutorialPageSteps'

function normalizePath(pathname: string): string {
  let p = pathname.split('?')[0].replace(/\/$/, '')
  if (!p) p = '/'
  return p
}

/** Intro + elementi fissi dell’app (menu, ricerca, avvisi, pulsante Guida). */
function commonChrome(): DriveStep[] {
  return [
    {
      popover: {
        title: 'Guida passo passo',
        description:
          'Ti mostriamo come usare questa schermata: evidenze colorate, testi brevi, Avanti / Indietro. Puoi chiudere in qualsiasi momento con la X e riaprire da «Guida» in alto a destra.',
        side: 'over',
        align: 'center',
      },
    },
    {
      element: '[data-tutorial="layout-nav"]',
      popover: {
        title: 'Menu laterale',
        description:
          'Spostati tra Dashboard, Clienti, Fornitori, Magazzino, Riparazioni, Documenti, Pagamenti, Movimenti magazzino, Cassa e Impostazioni. La voce evidenziata è la pagina attiva.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="layout-search"]',
      popover: {
        title: 'Ricerca globale',
        description:
          'Cerca in tutto il gestionale: riparazioni, prodotti, clienti. Scegli un risultato per aprirlo nella pagina giusta.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tutorial="layout-alerts"]',
      popover: {
        title: 'Avvisi magazzino',
        description:
          'Elenco prodotti in esaurimento o con scorte basse. Clicca una riga per aprire il magazzino sul prodotto.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tutorial="layout-tutorial-btn"]',
      popover: {
        title: 'Pulsante Guida',
        description:
          'Ogni pagina ha una guida dedicata: dopo il tour puoi ripeterla quando vuoi, anche dopo aver caricato dati o cambiato vista (es. carrello cassa).',
        side: 'bottom',
        align: 'end',
      },
    },
  ]
}

function mergePage(steps: DriveStep[]): DriveStep[] {
  return [...commonChrome(), ...steps]
}

export function getTutorialSteps(pathname: string): DriveStep[] {
  const path = normalizePath(pathname)
  return mergePage(getPageStepsForPath(path))
}
