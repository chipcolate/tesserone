import type { Strings } from './types';

const strongOpen = '<strong class="text-[var(--color-fg)]">';
const strongClose = '</strong>';
const linkOpen = (href: string) =>
  `<a href="${href}" class="text-[var(--color-accent)] hover:underline">`;
const linkClose = '</a>';
const prose = 'text-[var(--color-fg-muted)]';

export const de: Strings = {
  htmlLang: 'de',
  meta: {
    defaultTitle: 'Tesserone — Deine Kundenkarten auf deinem Handy',
    defaultDescription:
      'Ein einfacher, lokaler Kundenkarten-Manager. Keine Cloud, keine Konten, kein Tracking. Open Source.',
    privacyTitle: 'Datenschutzerklärung — Tesserone',
    privacyDescription:
      'Tesserone sammelt keine Daten. Diese Seite erklärt, was das bedeutet — in einfachen Worten und in den Formulierungen, die App-Stores verlangen.',
  },
  hero: {
    eyebrow: 'Tesserone',
    headlineLine1: 'Deine Kundenkarten.',
    headlineLine2: 'Auf deinem Handy.',
    headlineLine3: 'Mehr nicht.',
    subheading:
      'Ein einfacher Kundenkarten-Manager mit dem vertrauten Gefühl eines Kartenstapels. Keine Cloud, keine Konten, kein Tracking. Deine Karten bleiben auf deinem Gerät — wo sie hingehören.',
  },
  features: {
    headingLine1: 'Alles, was die Klassiker konnten.',
    headingLine2: 'Nichts, was sie falsch machten.',
    items: {
      localFirst: {
        title: 'Local-first',
        body: 'Deine Karten bleiben auf deinem Gerät. Kein Konto, keine Registrierung, keine Synchronisation.',
      },
      zeroCloud: {
        title: 'Keine Cloud',
        body: 'Es gibt keine Server. Kein Backend. Keine Datenbank, in der du stecken könntest.',
      },
      zeroTracking: {
        title: 'Kein Tracking',
        body: 'Keine Analytics. Keine Telemetrie. Keine Drittanbieter-SDKs. Die App macht keine einzige Netzwerkanfrage.',
      },
      instantCheckout: {
        title: 'Bereit an der Kasse',
        body: 'Tippe eine Karte an, um sie umzudrehen. Die Bildschirmhelligkeit springt automatisch auf Maximum, damit das Scannen zuverlässig klappt.',
      },
      familiarStack: {
        title: 'Ein vertrauter Kartenstapel',
        body: 'Karten, die sich blättern, öffnen und umdrehen lassen — genau wie du es erwartest. Keine Überraschungen, keine Lernkurve.',
      },
      allFormats: {
        title: 'Alle Formate',
        body: 'EAN-13, CODE-128, QR, Aztec, PDF417, DataMatrix — jeder Barcode, den deine Karten mitbringen.',
      },
      noLockIn: {
        title: 'Keine Bindung',
        body: 'Exportiere deine gesamte Sammlung in eine einfache JSON-Datei. Sichern, zwischen Geräten verschieben oder teilen — es sind deine Daten.',
      },
      openSource: {
        title: 'Open Source, für immer',
        body: 'Apache 2.0. Lies den Code. Prüfe ihn. Forke ihn. Bau deinen eigenen. So sieht der Deal aus.',
      },
    },
  },
  backstory: {
    eyebrow: 'Warum wir sie gebaut haben',
    headingLine1: 'Wir hatten einfache Apps.',
    headingLine2: 'Sie funktionierten.',
    p1: 'Jahrelang funktionierten Kundenkarten-Apps einfach. Du hast einen Barcode gescannt. Die App hat ihn gespeichert. An der Kasse hast du ihn hervorgeholt. Fertig.',
    p2: 'Dann wurden die Apps, auf die wir uns verlassen haben, aufgekauft. Die neuen Eigentümer haben sie „modernisiert". Plötzlich brauchten wir Konten. Dann eine Cloud-Synchronisation, um die niemand gebeten hatte. Dann Werbung. Dann eine Paywall für Funktionen, die früher gratis waren. Dann fingen unsere Karten an zu verschwinden, weil der Server von jemandem einen schlechten Tag hatte. Dann wollte die App unsere E-Mail-Adresse, nur um einen Barcode anzuzeigen.',
    p3: 'Wir hatten genug davon, zuzusehen, wie einfache Werkzeuge von Firmen kannibalisiert werden, die unsere Karten als Trichter behandelten statt als Funktion.',
    p4: 'Also haben wir eine neue gebaut — wie die alten. Ordentlich. Für uns und für alle, die sich die Zeit zurückwünschen, in der Apps eine Sache konnten und dein Gerät so sehr respektierten, dass sie aus der Cloud blieben.',
  },
  os: {
    eyebrow: 'Open Source, bewusst einfach',
    heading: 'Jede Zeile, überprüfbar.',
    body: 'Tesserone wird unter der Apache-2.0-Lizenz veröffentlicht. Das heißt, du kannst sie lesen, prüfen, forken oder deine eigene Version bauen. Keine Telemetrie, keine Analytics, keine Server — und nichts, was du uns aufs Wort glauben müsstest.',
    badgeLicense: 'Apache-2.0-Lizenz',
    badgeTelemetry: 'Keine Telemetrie',
    badgeServers: 'Keine Server',
    cta: 'Auf GitHub ansehen',
  },
  stores: {
    appleSup: 'Laden im',
    appleMain: 'App Store',
    appleAria: 'Laden im App Store',
    googleSup: 'Jetzt bei',
    googleMain: 'Google Play',
    googleAria: 'Jetzt bei Google Play',
  },
  footer: {
    copyright: 'Apache-2.0-lizenziert.',
    privacy: 'Datenschutz',
    github: 'GitHub',
    issues: 'Issues',
    languageLabel: 'Sprache',
  },
  themeToggle: {
    ariaLabel: 'Design umschalten',
  },
  privacy: {
    back: '← Zurück zu Tesserone',
    title: 'Datenschutzerklärung',
    effectiveDateLabel: 'Gültig ab',
    effectiveDate: '20. April 2026',
    sections: {
      oneSentence: {
        title: 'In einem Satz',
        body: `<p class="${prose}">Tesserone sammelt, überträgt oder teilt keine deiner Daten. Alles, was du eingibst, bleibt auf deinem Gerät.</p>`,
      },
      whatWeCollect: {
        title: 'Welche Daten wir erheben',
        body: `<p class="${prose}">${strongOpen}Keine.${strongClose} Tesserone erhebt keine persönlichen Informationen, Nutzungsdaten, Absturzberichte, Gerätekennungen oder sonstige Daten. Es gibt kein Konto, keine Registrierung und kein Profil. Die App kommuniziert mit keinem Server, den wir betreiben — weil wir keinen betreiben.</p>`,
      },
      whatAppStores: {
        title: 'Welche Daten die App speichert',
        body: `<p class="${prose}">Die Kundenkarten, die du hinzufügst (Name, Barcode, Notizen, gewähltes Logo oder gewählte Farbe, selbst hochgeladene Logos), werden ${strongOpen}lokal auf deinem Gerät${strongClose} über den Standard-Speicher des Betriebssystems gespeichert. Diese Daten verlassen dein Gerät nie, es sei denn, du exportierst sie ausdrücklich mit der Export-Funktion.</p>`,
      },
      permissions: {
        title: 'Berechtigungen, die wir anfordern',
        body: `<ul class="list-disc space-y-3 pl-6 ${prose} marker:text-[var(--color-accent)]"><li>${strongOpen}Kamera${strongClose} — wird nur verwendet, wenn du auf „Scannen" tippst, um einen Barcode zu lesen. Die Bilder werden auf dem Gerät verarbeitet und nie gespeichert oder übertragen.</li><li>${strongOpen}Fotomediathek${strongClose} — wird nur verwendet, wenn du ein eigenes Bild als Logo für eine Karte auswählst. Das Bild wird in den privaten Speicher der App kopiert; es findet kein Galeriezugriff im Hintergrund statt.</li></ul>`,
      },
      thirdParties: {
        title: 'Drittanbieter',
        body: `<p class="${prose}">Die App enthält ${strongOpen}keine Drittanbieter-SDKs, Werbenetzwerke, Analysedienste oder Tracking-Tools${strongClose}. Sie stellt im normalen Betrieb keine Netzwerkanfragen.</p>`,
      },
      children: {
        title: 'Datenschutz für Kinder',
        body: `<p class="${prose}">Tesserone sammelt wissentlich keine Informationen von irgendjemandem — auch nicht von Kindern unter 13 Jahren (oder dem entsprechenden Mindestalter in deiner Rechtsordnung). Da wir gar keine Daten sammeln, gibt es nichts zu löschen oder auf Anfrage zu exportieren.</p>`,
      },
      rights: {
        title: 'Deine Rechte (DSGVO, CCPA)',
        body: `<p class="${prose}">Vorschriften wie die DSGVO und die CCPA geben dir das Recht auf Auskunft, Berichtigung oder Löschung personenbezogener Daten über dich. Chipcolate verarbeitet keine personenbezogenen Daten über Tesserone-Nutzer — wir haben also nichts zu übermitteln oder zu löschen. Deine Daten liegen vollständig auf deinem Gerät unter deiner Kontrolle — du kannst eine Karte jederzeit löschen oder die App deinstallieren, um sie zu entfernen.</p>`,
      },
      changes: {
        title: 'Änderungen dieser Erklärung',
        body: `<p class="${prose}">Wenn sich diese Erklärung ändert, aktualisieren wir das Gültigkeitsdatum oben und vermerken die Änderung in den Release Notes der App. Da der Ansatz der App „nichts sammeln" lautet, würden wesentliche Änderungen nur bei einem signifikanten Redesign auftreten.</p>`,
      },
      contact: {
        title: 'Kontakt',
        body: `<p class="${prose}">Fragen zu dieser Erklärung? Am schnellsten geht es über ein Issue auf ${linkOpen('https://github.com/chipcolate/tesserone/issues')}github.com/chipcolate/tesserone/issues${linkClose}. Wenn du uns lieber per E-Mail erreichst, schreib an ${linkOpen('mailto:tesserone@chipcolate.com')}tesserone@chipcolate.com${linkClose}.</p>`,
      },
    },
  },
};
