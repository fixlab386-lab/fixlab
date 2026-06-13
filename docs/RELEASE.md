# Rilascio desktop FixLab (Electron + GitHub Releases)

Guida operativa per pubblicare aggiornamenti dell'app desktop Windows con **auto-update** tramite `electron-updater` e GitHub Releases.

---

## Panoramica

1. Sviluppi e testi le modifiche in locale.
2. Alzi la versione con un comando (`release:patch`, `release:minor` o `release:major`).
3. Lo script compila l'app e pubblica la release su GitHub (installer NSIS + `latest.yml`).
4. I clienti, alla riapertura dell'app installata, ricevono l'aggiornamento in background e possono riavviare per installarlo.

La versione dell'app è letta dal campo `"version"` in `package.json`.

---

## Prerequisiti (una tantum)

### 1. Repository GitHub

- Crea (o usa) un repository GitHub per il codice dell'app desktop.
- In `package.json`, sezione `build.publish`, verifica owner e repo GitHub:
  - Attualmente: `fixlab386` / `fixlab` — modifica se il repository desktop è diverso.

Esempio (se serve cambiare):

```json
"publish": [
  {
    "provider": "github",
    "owner": "fixlab386",
    "repo": "fixlab-desktop"
  }
]
```

### 2. Token GitHub (`GH_TOKEN`)

Per pubblicare le release serve un **Personal Access Token** con permesso di scrittura sul repository.

**Come crearlo:**

1. Vai su GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. Crea un token **Fine-grained** (consigliato) o **Classic**.
3. Permessi minimi:
   - Repository target: accesso al repo dell'app
   - **Contents**: Read and write (per creare release e caricare asset)
4. Copia il token generato (lo vedi una sola volta).

**Come impostarlo (Windows PowerShell, sessione corrente):**

```powershell
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
```

**Persistente per il tuo utente Windows (consigliato):**

1. Cerca "Variabili d'ambiente" nel menu Start.
2. Aggiungi una variabile utente:
   - Nome: `GH_TOKEN`
   - Valore: il token (senza virgolette nel pannello di sistema)
3. Riapri il terminale dopo il salvataggio.

> **Importante:** non committare mai token, certificati o password nel repository. Usa solo variabili d'ambiente.

### 3. Node.js e dipendenze

```powershell
cd C:\Users\samue\Desktop\fixlab\fixlab
npm install
```

---

## Workflow di rilascio

### Sviluppo desktop in locale

```powershell
npm run dev:desktop
```

Avvia Vite + Electron con hot reload. In dev **non** viene eseguito il check auto-update (`app.isPackaged = false`).

### Build locale (senza pubblicare)

Genera l'installer in `release/` senza upload su GitHub:

```powershell
npm run pack:desktop
```

Utile per verificare che l'installer NSIS si generi correttamente.

### Pubblicare un aggiornamento su GitHub

Scegli il tipo di bump semver:

| Comando | Effetto versione | Quando usarlo |
|---------|------------------|---------------|
| `npm run release:patch` | 1.0.0 → 1.0.1 | Bug fix, piccole correzioni |
| `npm run release:minor` | 1.0.0 → 1.1.0 | Nuove funzionalità compatibili |
| `npm run release:major` | 1.0.0 → 2.0.0 | Breaking change |

Ogni comando esegue in sequenza (via `scripts/release-desktop.mjs`):

1. Verifica che `GH_TOKEN` sia impostato
2. `npm version patch|minor|major` — aggiorna `package.json` e crea tag git
3. `npm run build:desktop` — build renderer + main/preload Electron (+ icona)
4. `electron-builder --win --publish always` — crea installer NSIS e pubblica su GitHub Releases

**Prima del primo rilascio**, assicurati che:

- `GH_TOKEN` sia impostato
- `build.publish.owner` e `build.publish.repo` siano corretti
- Il repository GitHub esista e tu abbia permessi di release

---

## Cosa viene pubblicato

`electron-builder` carica sulla GitHub Release:

- `FixLab-Setup-X.Y.Z.exe` — installer NSIS Windows
- `latest.yml` — metadati usati da `electron-updater` per trovare e scaricare l'aggiornamento

Senza `latest.yml` l'auto-update **non funziona**: non omettere la pubblicazione con `--publish always`.

---

## Comportamento auto-update (lato cliente)

All'avvio dell'app **installata** (build di produzione):

1. Dopo ~3 secondi, `autoUpdater.checkForUpdates()` controlla GitHub Releases.
2. Se c'è una versione più recente → download in background.
3. A download completato → dialog:
   - **«Riavvia ora»** → installa subito (`quitAndInstall`)
   - **«Più tardi»** → installa al prossimo riavvio (`autoInstallOnAppQuit`)
4. Se il check fallisce (offline, errore rete) → l'app continua normalmente, nessun dialog invadente; l'errore è solo nei log `[autoUpdater]`.

### Stato aggiornamento nel renderer

Il preload espone `window.fixlabDesktop` per la UI (es. Impostazioni → «Versione X.Y.Z»):

```typescript
const api = window.fixlabDesktop
if (api?.isElectron) {
  const version = await api.getAppVersion()
  const status = await api.getUpdateStatus()
  const unsubscribe = api.onUpdateStatusChanged((next) => {
    // next.state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | ...
    // next.progress: 0–100 durante il download
  })
  // api.installUpdate() — forza riavvio e installazione se update già scaricato
}
```

---

## Firma del codice Windows (opzionale, disattivata di default)

Senza certificato, Windows SmartScreen mostrerà **«Editore sconosciuto»** al primo install. L'auto-update **funziona comunque**; l'utente dovrà accettare l'avviso solo alla prima installazione (e eventualmente dopo certi aggiornamenti se SmartScreen segnala di nuovo).

### Quando avrai un certificato Code Signing

1. Ottieni un certificato Authenticode (.pfx) da una CA riconosciuta.
2. Salva il file **fuori dal repository** (es. `C:\secrets\fixlab-codesign.pfx`).
3. Imposta le variabili d'ambiente:

```powershell
$env:CSC_LINK = "C:\secrets\fixlab-codesign.pfx"
$env:CSC_KEY_PASSWORD = "password-del-certificato"
```

Oppure, per evitare path locali, puoi usare base64:

```powershell
# Genera una volta: [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\secrets\fixlab-codesign.pfx"))
$env:CSC_LINK = "base64-del-certificato..."
$env:CSC_KEY_PASSWORD = "password-del-certificato"
```

4. Rilascia normalmente con `npm run release:patch` (o minor/major).

`electron-builder` firma automaticamente l'installer quando `CSC_LINK` e `CSC_KEY_PASSWORD` sono presenti. In `package.json`, `win.forceCodeSigning` è `false`: senza certificato la build **non fallisce**.

> Non committare `.pfx`, password o base64 del certificato.

---

## Test end-to-end dell'auto-update

Procedura consigliata su una macchina Windows (o VM) con l'app **installata** via NSIS (non in dev).

### Passo 1 — Prima release (baseline)

1. Imposta `version` a `1.0.0` in `package.json` (se non già così).
2. Configura `build.publish` e `GH_TOKEN`.
3. Esegui:

```powershell
npm run release:patch
```

   Questo porterà la versione a `1.0.1` e pubblicherà la **prima** release utile per l'updater.

   **Alternativa per test pulito:** imposta manualmente `"version": "1.0.0"`, poi:

```powershell
npm run build:desktop
npx electron-builder --win --publish always
```

4. Scarica `FixLab-Setup-1.0.0.exe` dalla GitHub Release e **installalo** (Percorso tipico: `%LOCALAPPDATA%\Programs\FixLab` o cartella scelta in NSIS).

### Passo 2 — Verifica versione installata

1. Apri FixLab installato.
2. In DevTools (se abilitati) o via UI che legge `window.fixlabDesktop.getAppVersion()` → deve mostrare `1.0.0`.
3. Chiudi l'app.

### Passo 3 — Seconda release

1. Apporta una modifica visibile (es. titolo finestra o stringa in UI) per confermare l'update.
2. Esegui:

```powershell
npm run release:patch
```

   Versione diventa `1.0.1`, nuova release su GitHub con `latest.yml` aggiornato.

### Passo 4 — Verifica auto-update

1. Riapri l'app **1.0.0** già installata (non `npm run dev:desktop`).
2. Attendi qualche secondo: nei log (se avvii da shortcut con log) o in UI vedrai stato `checking` → `downloading`.
3. Al termine del download → dialog «Riavvia ora / Più tardi».
4. Scegli **Riavvia ora** → app si riavvia su **1.0.1** con la modifica visibile.

### Passo 5 — Test «Più tardi»

Ripeti con `1.0.2`: alla fine scegli **Più tardi**, usa l'app, poi chiudi e riapri → l'update deve essere applicato al riavvio successivo.

### Troubleshooting test

| Problema | Verifica |
|----------|----------|
| Nessun update rilevato | Release GitHub contiene `latest.yml`? Versione in `latest.yml` > versione installata? |
| `GH_TOKEN` / publish fallisce | Token valido, permessi Contents write, owner/repo corretti |
| Update solo in dev | L'auto-update gira solo con app installata (`app.isPackaged === true`) |
| SmartScreen blocca | Normale senza firma; usa «Ulteriori informazioni» → «Esegui comunque» |

Log utili: avvia l'exe installato da terminale per vedere `[autoUpdater]` in stdout, oppure controlla `%APPDATA%\FixLab\logs\` se abiliti log file in futuro.

---

## Comandi rapidi

```powershell
# Sviluppo desktop
npm run dev:desktop

# Installer locale (no upload)
npm run pack:desktop

# Rilascio produzione
npm run release:patch
npm run release:minor
npm run release:major
```

---

## Checklist pre-release

- [ ] `build.publish.owner` e `repo` compilati
- [ ] `GH_TOKEN` impostato nel terminale / variabili di sistema
- [ ] Modifiche testate con `npm run dev:desktop`
- [ ] `npm run pack:desktop` genera installer senza errori
- [ ] Versione semver coerente con le modifiche
- [ ] Release GitHub contiene `.exe` + `latest.yml`
- [ ] (Opzionale) `CSC_LINK` + `CSC_KEY_PASSWORD` per firma codice

---

## Note

- Il deploy **web** Firebase (`npm run deploy:hosting`) resta indipendente dal rilascio desktop.
- La PWA / service worker è disabilitata nella build desktop; l'aggiornamento desktop passa solo da `electron-updater`.
- Non eseguire `release:*` su CI senza aver configurato `GH_TOKEN` come secret della pipeline.
