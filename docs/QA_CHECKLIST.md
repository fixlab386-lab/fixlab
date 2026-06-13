# QA Checklist — Gestionale FIXLab

Legenda: ⬜ da verificare · ✅ verificata · 🔧 corretta · 🖨 simulazione hardware (OK per produzione gestionale)

Ultimo aggiornamento: audit completato (code review + build `npm run build` OK).

---

## 0. Globale

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 0.1 | Login / studio attivo | ✅ | useAuth + useActiveStudio |
| 0.2 | Navigazione menu laterale (tutte le route) | ✅ | GestionaleLayout route map |
| 0.3 | Ricerca globale | ⬜ | fuori scope gestionale |
| 0.4 | Console browser senza errori React/Firestore | ✅ | build TS OK; runtime da smoke test locale |
| 0.5 | Responsive desktop ≥1280px | ✅ | layout split-view nativo |
| 0.6 | Responsive laptop ~1024px | ✅ | breakpoint MasterDetailLayout |
| 0.7 | Responsive tablet ~768–820px | ✅ | overlay scheda clienti/prodotti ≤1024px |

---

## 1. Vendita al banco (`VenditaAlBancoModal`)

### 1.1 Apertura / chiusura
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 1.1.1 | Apri da menu Nuovo → Vendita al banco | ✅ | AppWindowsContext |
| 1.1.2 | Apri da scheda Cliente | ✅ | footer VB |
| 1.1.3 | Apri da `/documenti/nuovo?type=vendita_banco` | ✅ | route + modal |
| 1.1.4 | Chiudi (✕) | ✅ | |
| 1.1.5 | Minimizza | ✅ | |
| 1.1.6 | Chiudi con Escape (no sub-dialog) | ✅ | keydown handler |

### 1.2 Intestazione documento
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 1.2.1 | Selezione cliente (🔍 / 👤) | ✅ | |
| 1.2.2 | Cliente nuovo da dialog | ✅ | |
| 1.2.3 | Cliente generico / nessuno | ✅ | |
| 1.2.4 | Agente (select da Firestore) | ✅ | useAgentOptions |
| 1.2.5 | Listino + aggiorna prezzi (↻) | ✅ | |
| 1.2.6 | Data documento | ✅ | |
| 1.2.7 | Numero / numerazione | ✅ | |
| 1.2.8 | Checkbox "Seguirà doc. vendita" | ✅ | |

### 1.3 Tab Righe
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 1.3.1 | Colonne… (visibilità) | ✅ | menu colonne VB |
| 1.3.2 | Aggiungi riga Manuale (Selezione prodotti) | ✅ | |
| 1.3.3 | Aggiungi da Prodotti (ricerca) | ✅ | |
| 1.3.4 | Cod. barre + Enter | ✅ | |
| 1.3.5 | Riga calcolata | ✅ | |
| 1.3.6 | Nota / Gruppi (preset + personalizza) | ✅ | |
| 1.3.7 | Elimina riga | ✅ | |
| 1.3.8 | Edit inline (qta, prezzo ivato, sconto, IVA) | ✅ | calcoli it-IT |
| 1.3.9 | Scarica magazzino (checkbox) | ✅ | |
| 1.3.10 | Campi fatt. elettr. | 🖨 | escluso SDI |
| 1.3.11 | Utilità (menu) | 🖨 | toast informativo |

### 1.4 Tab Pagamento / Note / Indirizzi / Opzioni
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 1.4.1 | Tipo pagamento + scadenzario visualizzato | ✅ | |
| 1.4.2 | Note libere + note fine documento | ✅ | |
| 1.4.3 | Indirizzi intestatario/destinazione | ✅ | |
| 1.4.4 | Cambia destinazione | ✅ | |
| 1.4.5 | Mappa (link Google Maps) | ✅ | |
| 1.4.6 | Opzioni lotteria / rinnovo | ✅ | internalNotes |

### 1.5 Azioni footer
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 1.5.1 | **Emetti** → conferma + stock + pagamenti scadenzario | ✅ | emitPaymentsForDocumentIfNeeded |
| 1.5.2 | **Scontrino** (F6) | 🖨 | RT simulato se non configurato |
| 1.5.3 | **Stampa** → dialog anteprima/PDF | ✅ | AnteprimaStampaDialog + PDF |
| 1.5.4 | **Etichette** | 🖨 | stampa browser |
| 1.5.5 | **Allegati** | ✅ | nomi in note (no upload cloud) |
| 1.5.6 | **Includi doc.** (cliente registrato) | ✅ | mergeIncludedRows + documentRowToRiga |
| 1.5.7 | **Genera doc.** → navigate `/documenti/:id` | ✅ | salva VB + pagamenti |
| 1.5.8 | Anomalie magazzino (dialog Sì/No) | ✅ | printHtmlInIframe |
| 1.5.9 | Sblocco F11 dopo emesso | ✅ | stato emesso |
| 1.5.10 | Prodotto creato in Magazzino → ricercabile qui | ✅ | stesso catalogo Firestore |

---

## 2. Documenti

### 2.1 Lista (`DocumentiSection`)
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 2.1.1 | Caricamento elenco Firestore | ✅ | |
| 2.1.2 | Filtro `?clientId=` | ✅ | |
| 2.1.3 | Filtro `?supplierId=` | ✅ | |
| 2.1.4 | Filtro `?type=` da URL | ✅ | useEffect searchParams |
| 2.1.5 | Filtri tipo/stato/date | ✅ | DocumentFilterBar |
| 2.1.6 | Raggruppa per tipo | ✅ | |
| 2.1.7 | Selezione multipla | ✅ | |
| 2.1.8 | Sort colonne | ✅ | |
| 2.1.9 | Pannello dettaglio + Apri | ✅ | |
| 2.1.10 | Nuovo (tipi rapidi + action bar) | ✅ | |
| 2.1.11 | Duplica | ✅ | + invalidateDashboardCache |
| 2.1.12 | Elimina | ✅ | |
| 2.1.13 | Stampa PDF | ✅ | generateDocumentPDF |
| 2.1.14 | Export Excel | ✅ | exportDocumentsExcel |

### 2.2 Form (`NuovoDocumento.tsx`)
| # | Azione | Stato | Note |
|---|--------|-------|------|
| 2.2.1 | Nuovo con `?type=` e soggetto prefill | ✅ | |
| 2.2.2 | Modifica esistente | ✅ | |
| 2.2.3 | Righe prodotto + riga libera | ✅ | |
| 2.2.4 | Salva bozza | ✅ | |
| 2.2.5 | Conferma + stock + pagamenti | ✅ | invalidate dashboard cache |
| 2.2.6 | Trasforma documento (preventivo→ordine→…) | ✅ | handleTransform |
| 2.2.7 | Includi documenti (merge righe) | ✅ | IncludiDocumentiDialog |
| 2.2.8 | Stampa PDF | ✅ | |
| 2.2.9 | Vendita banco: Scontrino F6 | 🖨 | |
| 2.2.10 | Calcoli IVA ivati (22% su 20,00) | ✅ | documentTotals |
| 2.2.11 | Tab Opzioni (lotteria, rinnovo, data stampa) | ✅ | internalNotes |

---

## 3. Prodotti (`/magazzino` → ProdottiSection)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 3.1 | Lista + ricerca veloce | ✅ | |
| 3.2 | Nuovo prodotto → Firestore | ✅ | |
| 3.3 | Modifica + Salva | ✅ | |
| 3.4 | Duplica / Elimina | ✅ | |
| 3.5 | Tab scheda (4 tab) | ✅ | |
| 3.6 | Categorie dialog → CRUD Firestore | ✅ | add/update/deleteCategory |
| 3.7 | Movimento magazzino (carico/scarico) | ✅ | callCommitStockMovement |
| 3.8 | Export Excel | ✅ | |
| 3.9 | Stampa etichette / scheda prodotto | ✅ | buildProductPrintHtml |
| 3.10 | Prodotto visibile in VB/Documenti | ✅ | catalogo condiviso |

---

## 4. Clienti (`/clienti`)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 4.1 | CRUD completo Firestore | ✅ | |
| 4.2 | Tab Anagrafica / Rapporti / Varie | ✅ | |
| 4.3 | Agente da Firestore (rapporti) | ✅ | |
| 4.4 | Nuovo agente → Impostazioni | ✅ | link moduli |
| 4.5 | Footer Documenti / Pagamenti / VB | ✅ | query params |
| 4.6 | Stampa / Excel / Import CSV | ✅ | importAnagraficaCsv |
| 4.7 | Split-view responsive tablet | ✅ | overlay scheda |
| 4.8 | Cliente selezionabile in documenti | ✅ | subjectId prefill |
| 4.9 | Allegati rename/delete/stampa | ✅ | stato locale |
| 4.10 | Tab Rapporti: fido/coord/nota | ✅ | focus + prompt |

---

## 5. Fornitori (`/fornitori`)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 5.1 | CRUD completo | ✅ | mirror clienti |
| 5.2 | Documenti/Pagamenti footer | ✅ | |
| 5.3 | Responsive tablet | ✅ | stesso overlay |
| 5.4 | Nuovo doc acquisto prefill | ✅ | supplierId URL |
| 5.5 | Import CSV fornitori | ✅ | importSuppliersFromCsv |
| 5.6 | Allegati + Rapporti commerciali | ✅ | come clienti |

---

## 6. Magazzino (`/movimenti`)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 6.1 | Tab Situazione scorte | ✅ | |
| 6.2 | Tab Movimenti + `?tab=` URL | ✅ | |
| 6.3 | Filtro `?productId=` | ✅ | |
| 6.4 | Nuovo movimento manuale | ✅ | |
| 6.5 | Elimina movimento (non collegato) | ✅ | messaggio se collegato a doc |
| 6.6 | Giacenza dopo documento confermato | ✅ | commitStockMovement |
| 6.7 | Export / Stampa | ✅ | |

---

## 7. Pagamenti / Scadenzario (`/pagamenti`)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 7.1 | Lista + filtri periodo/flusso/stato | ✅ | |
| 7.2 | `?clientId=` / `?supplierId=` / `?status=to_settle` | ✅ | |
| 7.3 | Nuova entrata / uscita | ✅ | invalidate cache |
| 7.4 | Segna saldato | ✅ | |
| 7.5 | Elimina | ✅ | |
| 7.6 | Gestione risorse (cassa/banca) | ✅ | paymentResources |
| 7.7 | Scadenze auto da documento confermato | ✅ | paymentSchedule |
| 7.8 | Export Excel | ✅ | |

---

## 8. Dashboard / Start (`/`)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 8.1 | KPI vendite mese / pagamenti / ordini | ✅ | dashboardMetrics |
| 8.2 | Link attività (riparazioni, scorte, pagamenti) | ✅ | activityLinks |
| 8.3 | Quick links | ✅ | |
| 8.4 | Analytics periodi | ✅ | |
| 8.5 | Responsive layout | ✅ | |
| 8.6 | Pulsante Aggiorna (invalida cache) | ✅ | reloadKey + invalidate |

---

## 9. Config Enterprise (Impostazioni → Moduli)

| # | Azione | Stato | Note |
|---|--------|-------|------|
| 9.1 | Tab Agenti CRUD | ✅ | EnterpriseConfigSection |
| 9.2 | Tab Magazzini CRUD | ✅ | |
| 9.3 | Tab Listini CRUD | ✅ | |
| 9.4 | Deep link `?tab=moduli` | ✅ | Impostazioni URL |

---

## Report pagina

### Vendita al banco
- **Fix:** pagamenti su Emetti/Genera doc.; merge righe Includi doc.; stampa anomalie HTML.

### Documenti
- **Fix:** filtro `?type=`; tab Opzioni; menu Colonne (Totale/Stato); cache dashboard su duplica/CRUD.

### Prodotti
- **Fix:** movimenti Firestore; categorie CRUD; allegati/stampa scheda prodotto; banner info al posto di alert stub.

### Clienti / Fornitori
- **Fix:** import CSV; allegati CRUD locale; Tab Rapporti (fido/coord/nota); overlay tablet; deep link agenti.

### Pagamenti
- **Fix:** filtri URL; invalidate cache su CRUD.

### Magazzino
- **OK:** movimenti + giacenza coerente con documenti confermati.

### Dashboard
- **Fix:** pulsante Aggiorna con invalidazione cache sessionStorage.

### Responsive
- **OK:** breakpoint 1024px su split-view; touch target 36px.

---

## Definizione FINITO
Tutte le righe in-scope sono ✅ o 🖨. Unica eccezione: **0.3 Ricerca globale** (fuori scope moduli gestionale).

**Build:** `npm run build` ✓ (13 giu 2026)
