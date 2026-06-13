import { LegalPageShell } from '../components/LegalPageShell'
import { PLATFORM_PROVIDER_CONTACT, platformProviderMailto } from '../legal/platformContact'

const linkStyle = { color: 'var(--accent)' } as const

export default function PrivacyPolicy() {
  const C = PLATFORM_PROVIDER_CONTACT
  return (
    <LegalPageShell
      title="Informativa privacy"
      subtitle="Qui trovi come sono trattati i dati nell’app, chi è titolare rispetto ai clienti del laboratorio e come esercitare i diritti."
      siblingNav={{ to: '/cookie', label: 'Cookie policy' }}
    >
      <p>
        La presente informativa descrive come viene trattato il dato personale nell&apos;ambito dell&apos;applicazione web FIXLab (di
        seguito &quot;App&quot;), in linea di massima con il Regolamento (UE) 2016/679 (&quot;GDPR&quot;) e la normativa italiana in
        materia di privacy, incluso l&apos;approccio al consenso per strumenti non strettamente necessari.
      </p>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          padding: '16px 18px',
          marginTop: '16px',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Contatti fornitore piattaforma</div>
        <div>
          <strong>{C.displayName}</strong>
        </div>
        <div style={{ marginTop: '6px' }}>
          Email:{' '}
          <a href={platformProviderMailto} style={linkStyle}>
            {C.email}
          </a>
        </div>
        <div style={{ marginTop: '4px' }}>
          Telefono:{' '}
          <a href={C.phoneHref} style={linkStyle}>
            {C.phoneDisplay}
          </a>
        </div>
      </div>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>1. Chi tratta i dati (ruoli)</h2>
      <p>
        Per evitare equivoci tra <strong>chi offre lo strumento</strong> e <strong>chi lo usa in laboratorio</strong>, si distinguono due
        profili:
      </p>
      <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
        <li>
          <strong>Fornitore della piattaforma FIXLab</strong> (proprietario / gestore dell&apos;applicazione, dell&apos;accesso e
          dell&apos;infrastruttura tecnica): <strong>{C.displayName}</strong>, titolare del trattamento dei dati strettamente necessari a
          far funzionare il servizio (es. account di accesso, log tecnici del servizio, comunicazioni relative all&apos;App). Avviare il
          servizio con <strong>un solo professionista</strong> che usa il gestionale non richiede di per sé una particolare forma societaria
          o P.IVA <em>per questa informativa</em>; restano validi gli obblighi fiscali e professionali che la legge impone alla tua
          situazione reale.
        </li>
        <li>
          <strong>Professionista che utilizza il gestionale</strong> (oggi: <strong>un solo utilizzatore</strong>): è il{' '}
          <strong>titolare del trattamento</strong> dei dati che inserisce per la propria attività — in particolare i dati dei{' '}
          <em>clienti del laboratorio</em>, riparazioni, documenti, magazzino, pagamenti, ecc. Se sei anche tu l&apos;unico utilizzatore, i
          due ruoli coincidono nella stessa persona; se il professionista è un altro soggetto, egli resta titolare dei dati dei propri
          clienti trattati tramite l&apos;App.
        </li>
      </ul>
      <p>
        <strong>Contatti per i diritti dei clienti del laboratorio</strong> (accesso, rettifica, cancellazione, ecc.): vanno esercitati
        verso il <strong>professionista che usa FIXLab</strong>, con i recapiti che egli renda noti (email, telefono, sportello). Il
        fornitore della piattaforma può intervenire su richiesta per aspetti puramente tecnici nei limiti del rapporto con
        l&apos;utilizzatore. Per molte esigenze il professionista ha strumenti <strong>self-service</strong> in{' '}
        <strong>Impostazioni → Account</strong>: <strong>scarico di una copia dei dati</strong> (file JSON o archivio ZIP con JSON e, ove
        possibile, copia dei file su storage), e <strong>eliminazione dell&apos;account e di tutti i dati</strong> collegati allo studio, previa
        conferma nell&apos;App.
      </p>
      <p>
        Quando il servizio crescerà (più studi / più account) o quando avrai ragione sociale o P.IVA da indicare per la tua attività di
        fornitore, aggiorna questa sezione e i recapiti.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>2. Tipologie di dati trattati</h2>
      <p>
        Attraverso l&apos;App possono essere trattati, a seconda delle funzioni usate: dati identificativi e di contatto di utenti del
        gestionale; dati anagrafici e di contatto di clienti e fornitori; dati relativi a riparazioni, dispositivi, documenti, pagamenti,
        magazzino; contenuti caricati (es. foto, allegati); log tecnici generati dai servizi di hosting e autenticazione.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>3. Finalità e basi giuridiche</h2>
      <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
        <li>
          <strong>Erogazione del servizio software</strong> (account, sicurezza, sincronizzazione dati): esecuzione del contratto / misure
          precontrattuali; in parte obblighi legali (conservazione documentale dove applicabile).
        </li>
        <li>
          <strong>Comunicazioni operative</strong> (es. notifiche in app): legittimo interesse dell&apos;utilizzatore del gestionale o del
          fornitore della piattaforma, secondo il contesto, salvo opposizione dove previsto.
        </li>
        <li>
          <strong>Preferenze facoltative</strong> (es. tema grafico salvato in locale): consenso, revocabile in ogni momento tramite le
          preferenze cookie nell&apos;App.
        </li>
        <li>
          <strong>Statistiche / analytics</strong> se attivati in futuro: consenso, salvo diversa configurazione tecnica conforme alla legge.
        </li>
      </ul>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>4. Sottotrattamento e trasferimenti</h2>
      <p>
        L&apos;App utilizza servizi cloud di <strong>Google Firebase</strong> (hosting, database, autenticazione, storage file) con
        infrastruttura distribuita. Google opera in qualità di responsabile/sub-fornitore tecnico secondo le modalità contrattuali (es.
        SCC / DPA) previste da Google. Chi gestisce il progetto Firebase (fornitore della piattaforma) deve verificare in console le
        impostazioni di sicurezza; i dati operativi caricati dall&apos;utilizzatore restano sotto la sua responsabilità di titolare rispetto
        ai propri clienti.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>5. Conservazione</h2>
      <p>
        I dati sono conservati per il tempo necessario alle finalità indicate e agli obblighi di legge (es. contabilità, fatturazione). I
        tempi effettivi dipendono dall&apos;utilizzatore del gestionale e dalle cancellazioni effettuate tramite l&apos;App.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>6. Diritti dell&apos;interessato</h2>
      <p>
        Ai sensi degli artt. 15–22 GDPR, l&apos;interessato può esercitare i diritti di accesso, rettifica, cancellazione, limitazione,
        portabilità (ove applicabile) e opposizione, nonché proporre reclamo all&apos;Autorità Garante (
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
          www.garanteprivacy.it
        </a>
        ). I <strong>clienti del laboratorio</strong> si rivolgono al <strong>professionista che utilizza FIXLab</strong>. Se una richiesta
        riguarda invece solo l&apos;account o il funzionamento della piattaforma, può essere gestita dal fornitore dello strumento (
        <a href={platformProviderMailto} style={linkStyle}>
          {C.email}
        </a>
        , {C.phoneDisplay}) nei limiti del caso.
      </p>
      <p>
        Il <strong>professionista utilizzatore</strong> può, dall&apos;area <strong>Impostazioni → Account</strong>,{' '}
        <strong>scaricare una copia strutturata</strong> dei dati del proprio studio (export JSON o archivio ZIP con copia dei file da
        storage, entro i limiti tecnici mostrati in App); può inoltre avviare l&apos;
        <strong>eliminazione definitiva dell&apos;account e dei dati</strong> associati, previa conferma e reimmissione della password
        nell&apos;App. Tale cancellazione è <strong>irreversibile</strong>.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>7. Minori</h2>
      <p>L&apos;App non è destinata al trattamento sistematico di dati di minori di 14 anni senza titolo idoneo.</p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>8. Modifiche</h2>
      <p>
        Fornitore della piattaforma e utilizzatore del gestionale possono aggiornare le rispettive informative; per modifiche rilevanti
        sull&apos;App si può incrementare la versione delle preferenze cookie per richiedere una nuova scelta informativa.
      </p>
    </LegalPageShell>
  )
}
