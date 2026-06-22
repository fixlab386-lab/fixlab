"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIREBIRD_UNAVAILABLE_MESSAGE = exports.EFT_READ_ERROR_MESSAGE = exports.BEF_PROPRIETARY_MESSAGE = void 0;
exports.BEF_PROPRIETARY_MESSAGE = 'Il file .bef è una copia di sicurezza compressa di Danea Easyfatt e non si può aprire direttamente.\n\n' +
    'Per importare i dati:\n' +
    '1. Esporta da Danea gli elenchi in Excel (Clienti, Fornitori, Prodotti, Documenti) e caricali qui, oppure\n' +
    '2. Carica il file .eft dalla cartella Documenti\\Danea Easyfatt\\Archivi (non il .bef).\n' +
    '   In Danea: Gestione archivi → Recupera copia → l’archivio .eft compare in Archivi.';
exports.EFT_READ_ERROR_MESSAGE = 'Non riesco ad aprire l’archivio Easyfatt (.eft).\n\n' +
    'Usa il file .eft dalla cartella Documenti\\Danea Easyfatt\\Archivi, oppure esporta gli Excel da Danea.';
exports.FIREBIRD_UNAVAILABLE_MESSAGE = 'Il server database non è disponibile per l’import .bef. Esporta gli elenchi in Excel da Danea Easyfatt e importali qui.';
//# sourceMappingURL=importErrors.js.map