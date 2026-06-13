# FIXLab Gestionale — Riferimento UI enterprise

> **Scope:** gestione commerciale, magazzino, documenti (non fiscali), pagamenti e vendita al banco.  
> **Escluso:** fatturazione elettronica, SDI, XML FatturaPA, liquidazione IVA, home banking reale.

Documento interno di riferimento funzionale e layout (Fase 0).

---

## 1. Visione prodotto

gestionale enterprise Enterprise è un gestionale desktop Windows monoutente/multiutente (LAN) orientato a PMI italiane. L'interfaccia è densa, stile applicazione Windows classica: toolbar superiore con sezioni, elenco master a sinistra, scheda dettaglio a destra con TabControl, barra azioni inferiore a due blocchi (immissione / utilità).

Il ciclo operativo tipico:

```
Anagrafiche (Clienti/Fornitori/Prodotti)
    → Documenti vendita/acquisto (preventivo → ordine → DDT → …)
    → Magazzino (carico/scarico/impegno automatico)
    → Scadenzario/Pagamenti (scadenze da documenti, prima nota)
    → Analisi/Start (KPI reali)
```

Ogni sezione condivide lo stesso pattern **elenco + scheda + Raggruppa/Filtra/Colonne/Selezione**.

---

## 2. Struttura navigazione (Enterprise)

| Sezione FIXLab | Route fixlab attuale | Note |
|---|---|---|
| **Start** | `/` | Dashboard con riepiloghi |
| **Clienti** | `/clienti` | Anagrafica clienti |
| **Fornitori** | `/fornitori` | Anagrafica fornitori (Pro/Enterprise) |
| **Prodotti** | `/magazzino` (attuale) | Catalogo + listini; in FIXLab è sezione distinta da Magazzino |
| **Documenti** | `/documenti` | Sotto-sezioni per tipo documento |
| **Pagamenti** | `/pagamenti` | Scadenzario + prima nota + saldi |
| **Magazzino** | `/movimenti` | Situazione scorte, movimenti, inventario |
| **Strumenti** | parziale in Impostazioni | Agenti, listini globali, opzioni |
| Riparazioni/Cassa/Dispositivi | fixlab-specific | **Non** in FIXLab; restano feature fixlab |

In FIXLab Enterprise aggiuntivi: **Agenti e provvigioni**, **Magazzini multipli**, **Taglie/colori**, **Lotti/seriali**, **Distinta base**, **Vendita al banco + Touch**.

---

## 3. Moduli funzionali

### 3.1 Start / Dashboard

Pannello iniziale con accesso rapido e riepiloghi reali:

- Vendite del periodo (giorno/mese/anno)
- Scadenze imminenti (incassi/pagamenti)
- Prodotti sotto scorta / esauriti / da ordinare
- Ordini clienti aperti
- Promemoria/agenda (opzionale fase 2)
- Link rapidi alle sezioni (Nuovo documento, Nuovo cliente, ecc.)

Tutti i valori devono derivare da Firestore (documenti, prodotti, pagamenti), non da mock.

---

### 3.2 Clienti e Fornitori

**Pattern UI:** split asimmetrico elenco (sx) + scheda (dx).

#### Tab scheda cliente (FIXLab)

| Tab | Contenuto |
|---|---|
| **Anagrafica** | Codice (univoco progressivo condiviso clienti+fornitori), Denominazione (obbligatoria), P.IVA, Cod.fiscale, Indirizzo, CAP, Città, Prov., Nazione, Tel., Cell., Fax, E-mail, PEC, Web, Referente, Cod. destinatario, Aliquota Iva predefinita, Campi liberi 1–6 (rinominabili), Sede legale / sedi amministrative / sedi extra, Contatti multipli |
| **Rapporti commerciali** | Listino predefinito, Sconto % (anche progressivo es. 5+10%), Pagamento predefinito, Fido, Agente, Coordinate bancarie (IBAN assistito), Dichiarazione d'intento, Note automatiche in documento |
| **Note** | Annotazioni libere (in fixlab attuale tab "Varie") |
| **Situazione contabile** | Estratto conto: saldo, elenco scadenze/pagamenti collegati, accesso da pulsante "Pagamenti" in barra inferiore |

#### Tab scheda fornitore

Analogo al cliente (stessa struttura anagrafica, rapporti commerciali lato acquisti).

#### Elenco — funzioni condivise (cap. "Lavorare con gli elenchi")

- **Raggruppa** per: Agente, CAP, Città, Codice, Nazione, Provincia, Regione, Sconto, Tipologia, Pagamento, …
- **Filtra** excel-like per colonna: valori con checkbox, Tutti/Personalizzato/Vuote/Non vuote
- **Colonne** attivabili/disattivabili
- **Selezione** multipla
- **Ricerca** testuale
- **Ordinamento** per colonna
- **Stampa:** Scheda cliente/fornitore, Elenco, Etichette

#### Validazioni

- Denominazione obbligatoria
- Codice univoco (progressivo automatico opzionale)
- Cliente e fornitore non possono condividere lo stesso codice

#### Azioni barra inferiore

Nuovo, Duplica, Elimina, Stampa (sottomenu), Elenco doc., Pagamenti, Comunicazioni (e-mail/WhatsApp simulati), Utilità.

---

### 3.3 Prodotti

#### Tab scheda prodotto

| Tab | Contenuto |
|---|---|
| **Caratteristiche** | Codice (obbligatorio se magazzino), Descrizione, Tipologia, Categoria/sottocategoria (albero), U.m., Codice a barre, Fornitore, Produttore, Aliquota Iva, Classe provvigione, Campi liberi 1–4, Link URL/file, Foto |
| **Dimensioni e peso** | Peso netto/lordo, Dimensioni nette/lorde (opzione attivabile) |
| **Dettagli** | Note, allegati, testi estesi |
| **Magazzino** | Solo se tipologia con magazzino: Scorta minima, Riordino (gg), Ordina multipli di, Ubicazione, Giacenza, Impegnata, Disponibile, In arrivo, Stato scorte, Statistiche (vendita media, stime) |

#### Tipologie prodotto

| Tipologia FIXLab | Comportamento |
|---|---|
| Servizio | Non fisico, niente magazzino |
| Articolo | Fisico senza magazzino |
| Art. con magazzino | Carico/scarico automatico |
| Art. con magazzino (lotti) | + tracciabilità lotto |
| Art. con magazzino (lotti/scadenze) | + data scadenza |
| Art. con magazzino (seriali) | + seriale univoco |
| Art. con magazzino (taglie/colori) | + varianti (alternativa a lotti/seriali) |

Taglie/colori e tracciabilità lotti/seriali sono **mutuamente alternative** in FIXLab.

#### Listini (10 prezzi per prodotto)

- **9 listini vendita** + **1 prezzo acquisto (fornitore)**
- Nomi personalizzabili (Privati, VIP, Negozianti, …)
- Modalità **Manuale** o **Dinamica** (formula: listino sorgente ± % ± importo fisso, arrotondamento, aggiornamento automatico)
- Listino predefinito globale (Opzioni > Prodotti) e per cliente (Rapporti commerciali) — priorità cliente
- **Aggiorna listini** su selezione/filtro prodotti

#### Categorie

Albero multilivello (categoria » sottocategoria » …), path completo visualizzato.

---

### 3.4 Documenti

#### Tipi documento IN SCOPE (non fiscali / gestionali)

**Vendite:**
- Preventivo
- Ordine cliente
- DDT (Documento di trasporto)
- Rapporto d'intervento
- Vendita al banco
- Nota di credito interna (gestionale, **non** elettronica)

**Acquisti:**
- Richiesta d'offerta / Preventivo fornitore
- Ordine fornitore
- Arrivo merce

**Esclusi o solo stub UI:**
- Fattura, Fattura accompagnatoria, Fattura d'acconto, Fattura pro-forma, Ricevuta fiscale, Parcella, Avviso di parcella, Autofatture, Registrazione fattura fornitore elettronica → **non implementati** (o voce disabilitata con messaggio "Non disponibile — escluso fatturazione elettronica")

#### Finestra documento — struttura

- **Intestazione:** Data, Numerazione (+ sezionale /A, /B), Soggetto (cliente/fornitore), Agente, Listino, Pagamento
- **Flag:** Doc. annullato, Seguirà doc. di vendita (includibilità)
- **Tab:** Righe, Destinazione/Indirizzi, Pagamento, Trasporto (DDT), Note, Opzioni, Allegati, Provvigioni (Enterprise)
- **Barra inferiore:** Aggiungi riga (Prodotto / Codice / Barcode / Manuale), Includi doc., Genera doc., Stampa, Utilità, Scontrino (vendita banco — simulato)

#### Righe documento — colonne principali

Cod., Descrizione, Taglia/Colore, Q.tà, U.m., Prezzo (netto o ivato), Sconto %, IVA, Importo, Impegna magazzino, Prezzo acquisto, Guadagno/Margine/Ricarico

#### Calcoli (prezzi ivati — requisito fixlab)

Modalità **prezzi ivati** (tipica retail):

```
Importo riga = Q.tà × Prezzo ivato × (1 − sconto%)
Totale doc   = Σ importi righe (+ spese trasporto)
Tot. netto   = Totale / (1 + aliquota)   [per aliquota omogenea o ripartizione per riga]
IVA          = Totale − Tot. netto
```

**Verifica obbligatoria IVA 22%:**
| Righe | Netto | IVA | Totale |
|---|---|---|---|
| 1×20,00 | 16,39 | 3,61 | 20,00 |
| +1×211,00 | 189,34 | 41,66 | 231,00 |

Formato `it-IT`, € con virgola, arrotondamento 2 decimali per riga e totali.

Sconto totale documento: % su tutte le righe (colonna Sconti) o riga manuale negativa; in vendita al banco anche Utilità > Sconto su totale.

#### Inclusioni e trasformazioni

**Inclusione** (nel documento destinazione → Includi doc.):
- Trasferisce righe da documenti origine dello **stesso soggetto**
- Tipi: Dettagliata | Raggruppata | Sintetica
- Opzionale: riporta pagamento, note, info trasporto

**Generazione** (dal documento origine → Genera doc.):
- Solo modalità dettagliata
- Es.: Preventivo → Ordine cliente → DDT → …

**Genera da…** (batch da elenco documenti):
- Es. genera fatture da DDT del mese → nel clone: genera **documento riepilogativo interno** o DDT consolidato, **non** fattura elettronica

#### Catene inclusione principali (semplificate, senza fatture)

```
Preventivo → Ordine cliente → DDT → Vendita al banco
Preventivo fornitore → Ordine fornitore → Arrivo merce
Ordine cliente → DDT (Concludi ordine, evasione parziale)
Rapporto d'intervento → DDT
```

#### Stati ordine cliente

Da confermare → Confermato → Parzialmente concluso → Concluso / Annullato

Ordini "Da confermare" non includibili.

#### Magazzino da documenti

| Documento | Effetto magazzino |
|---|---|
| Ordine cliente (Impegna magazzino) | +impegnato |
| DDT / Vendita al banco / Rapporto (evaso) | −giacenza (scarico) |
| Arrivo merce / Ordine fornitore (in arrivo) | +in arrivo, poi +giacenza |
| Preventivo | nessuno |
| Nota credito interna | +giacenza (reso) |

**Disponibile = Giacenza − Impegnata + Ordinata** (FIXLab: disponibile = giacenza − impegnato; "in arrivo" separato ma usato per stati scorte)

Anomalie magazzino: avviso se q.tà richiesta > giacenza disponibile.

#### Numerazione

Progressiva per tipo/anno/sezionale; modificabile dall'utente; opzioni numerazioni multiple.

---

### 3.5 Vendita al banco

Documento dedicato attivabile in Opzioni > Documenti.

- Creazione classica (come altri documenti) **o** interfaccia **Touch** (Enterprise)
- Collegamento registratore di cassa → **simulato** in web: dialog "Nessun registratore rilevato", stampa PDF/scontrino a schermo
- Scanner barcode → input tastiera + dialog fedele se assente
- Scarico magazzino automatico
- Carte fedeltà (Enterprise) — opzionale fase 2
- Trasformazione in altri documenti (es. fattura gestionale interna esclusa)

Tab tipici: Righe, Destinazione, Pagamento, Note, Opzioni.

---

### 3.6 Magazzino (sezione)

Distinta da Prodotti in FIXLab; in fixlab attuale `/movimenti`.

#### Situazione scorte

Vista tempo reale per prodotto:

| Campo | Significato |
|---|---|
| Giacenza | Carichi − scarichi |
| Impegnata | Ordini clienti confermati non conclusi |
| Disponibile | Giacenza − Impegnata |
| In arrivo | Ordini fornitore non conclusi |
| Scorta minima | Soglia utente |
| Stato | Regolare / In arrivo / Da ordinare / Sotto scorta / Esaurito |

#### Movimenti

Tipi: Carico, Scarico, Rettifica, Impegno, Spostamento (multi-magazzino)

Storico per prodotto, cliente, fornitore, data.

#### Inventario

Allineamento giacenze a data X; rettifica massiva.

#### Magazzini multipli (Enterprise)

Selezione magazzino attivo in elenco prodotti; spostamento tra magazzini; scorta minima/ubicazione per magazzino.

---

### 3.7 Pagamenti / Scadenzario / Prima nota

Sezione **Pagamenti** unificata:

| Vista | Descrizione |
|---|---|
| **Tutti** | Prima nota completa |
| **Entrate / Uscite** | Filtrate per segno |
| **Da saldare / Saldati** | Scadenzario |
| **Da saldare al** | Saldi storici a data (es. 31/12) |

#### Campi pagamento/scadenza

Data, Risorsa (Cassa contanti, Banca, POS, …), Soggetto, Descrizione, Importo entrata/uscita, **Saldo** (spunta = saldato + data saldo), Collegamento documento, Agente (Enterprise), Note

#### Risorse e saldo progressivo

- Saldo iniziale risorsa (modificabile)
- Giroconto tra risorse (cassa → banca)
- Saldo visualizzato in basso a dx filtrando per risorsa/periodo

#### Generazione scadenze

Da documento: rate/scadenze in base a condizioni pagamento (es. R.B. 30-60-90).

#### Escluso

- Home banking Ri.Ba./SDD/bonifici reali → UI presente, export file simulato o messaggio esplicativo

---

### 3.8 Agenti e provvigioni (Enterprise)

- Anagrafica agenti (Strumenti > Agenti)
- Associazione agente ↔ cliente (Rapporti commerciali)
- Classe provvigione ↔ prodotto
- % provvigione per agente × listino × classe
- Calcolo su righe documenti vendita
- Liquida provvigioni: selezione, stampa, data liquidazione
- Insoluti per agente (colonna Doc: Agente in Pagamenti)

App Order Sender esterna → **non** integrata; eventuale export CSV.

---

## 4. Estetica UI — "Windows desktop classico"

### Token colore

| Token | Valore | Uso |
|---|---|---|
| `--gestionale-bg` | `#F0F0F0` | Sfondo applicazione |
| `--gestionale-panel` | `#FFFFFF` | Pannelli/scheda |
| `--gestionale-selection` | `#0078D7` | Selezione (testo bianco) |
| `--gestionale-header` | `#E6E6E6` | Header colonne (bordo `#D0D0D0`) |
| `--gestionale-group-row` | `#E6F2FF` | Righe gruppo |
| `--gestionale-text` | `#000` / `#222` | Testo |
| `--gestionale-border` | `#CCC` | Bordi |
| `--gestionale-cell-border` | `#E0E0E0` | Griglia |
| `--gestionale-link` | `#0056B3` | Link |
| `--gestionale-tab-inactive` | `#E1E1E1` | Tab (testo `#666`) |

### Tipografia e densità

- Font: Segoe UI, Tahoma, sans-serif
- Dati: 12px | Etichette: 11px | Titoli gruppo: 13px bold
- `border-radius: 0` (≈2px solo pulsanti barra inferiore)
- Padding celle: 2–4px
- Righe griglia: 22px | Righe gruppo: 26px
- Nessuna zebra striping

### Layout sezione tipo gestionale

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar sezioni + Nuovo ▼                                   │
├──────────────────────────┬──────────────────────────────────┤
│ Elenco (master)          │ Scheda dettaglio (TabControl)    │
│ [Raggruppa|Filtra|...]   │                                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│ [Nuovo][Duplica][Elimina]...     [Stampa▼][Utilità▼]...      │
└─────────────────────────────────────────────────────────────┘
```

### Controlli

- ComboBox: freccia ▼ nera a destra
- Date: icona calendario
- Ricerca: lente verde
- Pulsanti barra: icona colorata + testo bold, ▼ se sottomenu

---

## 5. Integrazioni hardware — simulazione web

| Integrazione FIXLab | Comportamento fixlab |
|---|---|
| Registratore di cassa | Dialog configurazione; stampa scontrino → PDF/anteprima; commento `// SIMULATED_HARDWARE` |
| Scanner | "Nessuno scanner rilevato" + upload immagine alternativo |
| Lettore barcode | Input da tastiera ( wedge ) → ricerca prodotto reale |
| Stampa | PDF reale (jsPDF/html2canvas già in progetto) |
| E-mail / WhatsApp | `mailto:` / link wa.me con PDF allegato o download |
| POS digitale TS Pay | Dialog "Non disponibile in web" |
| Terminalini barcode | UI fedele, import file CSV simulato |

---

## 6. Modello dati Firestore (proposta)

### Convenzione

Il progetto fixlab usa già collezioni **inglesi** con `studioId` (multi-archivio). Manteniamo retrocompatibilità; la UI resta in italiano FIXLab.

| Collezione esistente | Entità FIXLab | Estensioni necessarie |
|---|---|---|
| `clients` | Clienti | Campi FIXLab completi (liberi, fido, agente, listino, extraData) |
| `suppliers` | Fornitori | Allineamento campi a clients |
| `products` | Prodotti | 9 listini + formula, tipologia estesa, varianti/lotti |
| `categories` | Categorie prodotto | OK |
| `documents` | Tutti i documenti | inclusioni, stati ordine, flags, warehouseId |
| `stockMovements` | Movimenti magazzino | tipi impegno/in_arrivo/spostamento |
| `payments` | Scadenze + prima nota | già presente, estendere scadenze rate |
| `paymentResources` | Risorse cassa/banca | OK |
| `agents` | **NUOVO** — Agenti | nome, codice, provvigioni per listino/classe |
| `warehouses` | **NUOVO** — Magazzini | nome, predefinito |
| `priceLists` | **NUOVO** — Config listini | id, nome, ordine, predefinitoVendita, predefinitoBanco |
| `studios/{id}/settings` | Opzioni FIXLab | numerazioni, listini attivi, magazzino on/off |

### Relazioni cross-modulo (obbligatorie)

```
Prodotto ──→ righe documento (lookup codice/barcode)
Cliente  ──→ intestazione documento + condizioni commerciali
Documento emit ──→ stockMovements + aggiornamento products.stock
Documento emit ──→ payments (scadenze)
Ordine cliente ──→ impegnato magazzino
Inclusione ──→ copia righe + link includedFrom[]
```

### Indici Firestore suggeriti

- `documents`: `(studioId, type, date desc)`, `(studioId, subjectId, type)`
- `products`: `(studioId, code)`, `(studioId, barcode)`
- `payments`: `(studioId, settled, date)`, `(studioId, subjectId, date)`
- `stockMovements`: `(studioId, productId, date desc)`

---

## 7. Logica di business pura (lib/)

| Modulo | Funzioni |
|---|---|
| `documentTotals.ts` | Calcolo righe ivate/nette, sconti, totali per aliquota |
| `documentInclusion.ts` | Dettagliata/raggruppata/sintetica, validazione stesso soggetto |
| `documentTransform.ts` | Genera doc., concludi ordine, stati |
| `stockAvailability.ts` | Giacenza, impegnato, ordinato, disponibile, stati scorta |
| `stockCommit.ts` | Scarico/carico/impegno su emissione documento |
| `paymentSchedule.ts` | Generazione rate da condizioni pagamento |
| `priceListFormula.ts` | Listini dinamici (ricarico, arrotondamento) |
| `validators.ts` | Denominazione, codici univoci, q.tà positive |
| `formatters.ts` | `formatEuro(it-IT)`, date, percentuali |

---

## 8. Esclusioni fiscali/elettroniche (checklist)

- [ ] Nessun invio SDI / codice destinatario obbligatorio per FE
- [ ] Nessun XML FatturaPA generato
- [ ] Nessuna ricevuta/NSO/conservazione
- [ ] Nessuna liquidazione IVA / registri IVA / esterometro
- [ ] Nessun bollo automatico obbligatorio per legge (opzionale come prodotto)
- [ ] Voci menu fattura elettronica nascoste o disabilitate con tooltip
- [ ] "Nota di credito" = documento gestionale interno, non NC elettronica

---

## 9. Ordine implementazione (Fase 1–6)

1. **Primitivi condivisi** — DataGrid, ComboBox, Modal, TabControl, Toolbar, SectionLayout, formatters
2. **Prodotti** — tipi, repo, listini, categorie, scheda completa
3. **Clienti + Fornitori** — anagrafica completa, stesso motore elenco
4. **Documenti + Vendita al banco** — CRUD, righe, calcoli, inclusioni, magazzino
5. **Magazzino** — situazione, movimenti, inventario, multi-magazzino
6. **Pagamenti / Scadenzario / Prima nota** — scadenze, saldi, giroconto
7. **Dashboard Start** — KPI da dati reali
8. **Agenti + listini globali** — Enterprise extras

---

## 10. Riferimenti

- [Caratteristiche Easyfatt](https://fixlab.app/software/easyfatt/caratteristiche)
- [Anagrafica clienti/fornitori](https://fixlab.app/help/easyfatt/html/Tab_Anagrafica.htm)
- [Prodotti](https://fixlab.app/help/easyfatt/html/Tab_Articoli.htm)
- [Listini](https://fixlab.app/help/easyfatt/html/Listini.htm)
- [Inclusione documenti](https://fixlab.app/help/easyfatt/html/Crea_Documento_-_Includere_documento.htm)
- [Gestione magazzino](https://fixlab.app/help/easyfatt/html/Gestire_il_magazzino.htm)
- [Terminologia magazzino](https://fixlab.app/help/easyfatt/Terminologia_magazzino.htm)
- [Prezzi ivati](https://fixlab.app/help/easyfatt/Lavorare_con_i_prezzi_Ivati.htm)
- [Vendita al banco](https://fixlab.app/help/easyfatt/Stampa_dello_scontrino_tramite_la_vendita_al_banco.htm)
- [Agenti](https://fixlab.app/help/easyfatt/Gestione_agenti.htm)

---

*Documento prodotto in Fase 0 — base per implementazione modulo `/src/gestionale/` in fixlab-app.*
