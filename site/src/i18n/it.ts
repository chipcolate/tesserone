import type { Strings } from './types';

const strongOpen = '<strong class="text-[var(--color-fg)]">';
const strongClose = '</strong>';
const linkOpen = (href: string) =>
  `<a href="${href}" class="text-[var(--color-accent)] hover:underline">`;
const linkClose = '</a>';
const prose = 'text-[var(--color-fg-muted)]';

export const it: Strings = {
  htmlLang: 'it',
  meta: {
    defaultTitle: 'Tesserone — Le tue tessere fedeltà, sul telefono',
    defaultDescription:
      'Un gestore di tessere fedeltà semplice e local-first. Niente cloud, niente account, niente tracciamento. Open source.',
    privacyTitle: 'Informativa sulla privacy — Tesserone',
    privacyDescription:
      'Tesserone non raccoglie dati. Questa pagina spiega cosa significa, in parole semplici e nei termini richiesti dagli store.',
  },
  hero: {
    eyebrow: 'Tesserone',
    headlineLine1: 'Le tue tessere fedeltà.',
    headlineLine2: 'Sul tuo telefono.',
    headlineLine3: 'Tutto qui.',
    subheading:
      'Un semplice gestore di tessere fedeltà con la sensazione familiare di una pila di tessere. Niente cloud, niente account, niente tracciamento. Le tue tessere stanno sul tuo dispositivo — dove devono stare.',
  },
  features: {
    headingLine1: 'Tutto quello che sapevano fare i classici.',
    headingLine2: 'Niente di quello che sbagliavano.',
    items: {
      localFirst: {
        title: 'Local-first',
        body: 'Le tue tessere vivono sul tuo dispositivo. Nessun account, nessuna registrazione, nessuna sincronizzazione.',
      },
      zeroCloud: {
        title: 'Zero cloud',
        body: "Niente server. Niente backend. Non esiste un database in cui tu possa finire.",
      },
      zeroTracking: {
        title: 'Zero tracciamento',
        body: "Niente analytics. Niente telemetria. Nessun SDK di terze parti. L'app non fa alcuna chiamata di rete.",
      },
      instantCheckout: {
        title: 'Pronta alla cassa',
        body: 'Tocca una tessera per girarla: la luminosità dello schermo va al massimo da sola, per una scansione affidabile.',
      },
      familiarStack: {
        title: 'Una pila di tessere familiare',
        body: 'Tessere che scorrono, si espandono e si girano esattamente come ti aspetti. Zero sorprese, zero curva di apprendimento.',
      },
      allFormats: {
        title: 'Tutti i formati',
        body: 'EAN-13, CODE-128, QR, Aztec, PDF417, DataMatrix — qualunque codice a barre abbiano le tue tessere.',
      },
      noLockIn: {
        title: 'Nessun lock-in',
        body: 'Esporta tutta la tua collezione in un semplice file JSON. Fanne il backup, spostala tra dispositivi o condividila — i dati sono tuoi.',
      },
      openSource: {
        title: 'Open source, per sempre',
        body: 'Apache 2.0. Leggi il codice. Analizzalo. Fai un fork. Costruisci la tua versione. È questo il patto.',
      },
    },
  },
  backstory: {
    eyebrow: "Perché l'abbiamo fatta",
    headingLine1: 'Avevamo app semplici.',
    headingLine2: 'Funzionavano.',
    p1: 'Per anni, le app per le tessere fedeltà funzionavano e basta. Scansionavi un codice a barre. L\'app lo memorizzava. Alla cassa, lo tiravi fuori. Fatto.',
    p2: 'Poi le app su cui contavamo sono state acquisite. I nuovi proprietari le hanno «modernizzate». All\'improvviso servivano account. Poi sincronizzazione cloud che nessuno aveva chiesto. Poi pubblicità. Poi un abbonamento per funzioni che prima erano gratis. Poi le tessere hanno iniziato a sparire perché il server di qualcuno aveva avuto una brutta giornata. Poi l\'app voleva il nostro indirizzo email per mostrare un codice a barre.',
    p3: 'Ci siamo stancati di vedere strumenti semplici cannibalizzati da aziende che trattavano le nostre tessere come un canale di acquisizione anziché una funzionalità.',
    p4: 'Così ne abbiamo costruita una nuova, come le vecchie. Fatta bene. Per noi, e per chiunque rimpianga il tempo in cui le app facevano una cosa sola e rispettavano il tuo dispositivo abbastanza da stare fuori dal cloud.',
  },
  os: {
    eyebrow: 'Open source, semplice per scelta',
    heading: 'Ogni riga, verificabile.',
    body: 'Tesserone è rilasciata con licenza Apache 2.0. Significa che puoi leggerla, verificarla, farne un fork o costruirti la tua. Niente telemetria, niente analytics, niente server — e niente da credere solo sulla nostra parola.',
    badgeLicense: 'Licenza Apache 2.0',
    badgeTelemetry: 'Zero telemetria',
    badgeServers: 'Nessun server',
    cta: 'Vedi su GitHub',
  },
  stores: {
    appleSup: 'Scarica su',
    appleMain: 'App Store',
    appleAria: "Scarica sull'App Store",
    googleSup: 'Disponibile su',
    googleMain: 'Google Play',
    googleAria: 'Disponibile su Google Play',
  },
  footer: {
    copyright: 'Licenza Apache 2.0.',
    privacy: 'Privacy',
    github: 'GitHub',
    issues: 'Segnalazioni',
    languageLabel: 'Lingua',
  },
  themeToggle: {
    ariaLabel: 'Cambia tema',
  },
  privacy: {
    back: '← Torna a Tesserone',
    title: 'Informativa sulla privacy',
    effectiveDateLabel: 'Data di entrata in vigore',
    effectiveDate: '20 aprile 2026',
    sections: {
      oneSentence: {
        title: 'In una frase',
        body: `<p class="${prose}">Tesserone non raccoglie, trasmette o condivide nessuno dei tuoi dati. Tutto quello che inserisci resta sul tuo dispositivo.</p>`,
      },
      whatWeCollect: {
        title: 'Quali dati raccogliamo',
        body: `<p class="${prose}">${strongOpen}Nessuno.${strongClose} Tesserone non raccoglie informazioni personali, analytics d'uso, report sui crash, identificatori del dispositivo o qualsiasi altro dato. Non esistono account, registrazioni o profili. L'app non comunica con alcun server che gestiamo — perché non ne gestiamo nessuno.</p>`,
      },
      whatAppStores: {
        title: "Quali dati memorizza l'app",
        body: `<p class="${prose}">Le tessere fedeltà che aggiungi (nome, codice a barre, note, logo o colore scelto, loghi personalizzati caricati) sono memorizzate ${strongOpen}localmente sul tuo dispositivo${strongClose} usando lo spazio di archiviazione standard del sistema operativo. Questi dati non lasciano mai il tuo dispositivo a meno che tu non li esporti esplicitamente con la funzione Esporta.</p>`,
      },
      permissions: {
        title: 'Permessi che richiediamo',
        body: `<ul class="list-disc space-y-3 pl-6 ${prose} marker:text-[var(--color-accent)]"><li>${strongOpen}Fotocamera${strongClose} — usata solo quando tocchi "Scansiona" per leggere un codice a barre. I fotogrammi vengono elaborati sul dispositivo e non sono mai salvati o trasmessi.</li><li>${strongOpen}Galleria foto${strongClose} — usata solo quando scegli un'immagine personalizzata come logo di una tessera. L'immagine viene copiata nello spazio privato dell'app; non c'è alcun accesso alla galleria in background.</li></ul>`,
      },
      thirdParties: {
        title: 'Terze parti',
        body: `<p class="${prose}">L'app non contiene ${strongOpen}alcun SDK di terze parti, rete pubblicitaria, servizio di analytics o strumento di tracciamento${strongClose}. Non effettua richieste di rete in condizioni normali.</p>`,
      },
      children: {
        title: 'Privacy dei minori',
        body: `<p class="${prose}">Tesserone non raccoglie consapevolmente informazioni da nessuno — inclusi i minori di 13 anni (o l'età minima equivalente nella tua giurisdizione). Dato che non raccogliamo alcun dato, non c'è nulla da cancellare o esportare su richiesta.</p>`,
      },
      rights: {
        title: 'I tuoi diritti (GDPR, CCPA)',
        body: `<p class="${prose}">Normative come il GDPR e il CCPA ti danno il diritto di accedere, correggere o cancellare i dati personali che ti riguardano. Chipcolate non detiene alcun dato personale degli utenti di Tesserone, quindi non abbiamo nulla da fornire o cancellare. I tuoi dati risiedono interamente sul tuo dispositivo, sotto il tuo controllo — puoi eliminare una tessera o disinstallare l'app in qualsiasi momento per rimuoverli.</p>`,
      },
      changes: {
        title: 'Modifiche a questa informativa',
        body: `<p class="${prose}">Se questa informativa cambia, aggiorneremo la data qui sopra e segnaleremo la modifica nelle note di rilascio dell'app. Dato che l'approccio dell'app è "non raccogliere nulla", cambiamenti sostanziali avverrebbero solo con una riprogettazione significativa.</p>`,
      },
      contact: {
        title: 'Contatti',
        body: `<p class="${prose}">Domande su questa informativa? Il modo più veloce è aprire una segnalazione su ${linkOpen('https://github.com/chipcolate/tesserone/issues')}github.com/chipcolate/tesserone/issues${linkClose}. Se preferisci l'email, scrivici a ${linkOpen('mailto:tesserone@chipcolate.com')}tesserone@chipcolate.com${linkClose}.</p>`,
      },
    },
  },
};
