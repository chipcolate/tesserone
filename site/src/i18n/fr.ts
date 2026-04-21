import type { Strings } from './types';

const strongOpen = '<strong class="text-[var(--color-fg)]">';
const strongClose = '</strong>';
const linkOpen = (href: string) =>
  `<a href="${href}" class="text-[var(--color-accent)] hover:underline">`;
const linkClose = '</a>';
const prose = 'text-[var(--color-fg-muted)]';

export const fr: Strings = {
  htmlLang: 'fr',
  meta: {
    defaultTitle: 'Tesserone — Tes cartes de fidélité, sur ton téléphone',
    defaultDescription:
      "Un gestionnaire de cartes de fidélité simple et local-first. Pas de cloud, pas de compte, pas de pistage. Open source.",
    privacyTitle: 'Politique de confidentialité — Tesserone',
    privacyDescription:
      "Tesserone ne collecte aucune donnée. Cette page explique ce que ça veut dire, en termes simples et dans les formulations exigées par les stores.",
  },
  hero: {
    eyebrow: 'Tesserone',
    headlineLine1: 'Tes cartes de fidélité.',
    headlineLine2: 'Sur ton téléphone.',
    headlineLine3: "Point.",
    subheading:
      "Un gestionnaire de cartes de fidélité simple, avec la sensation familière d'un paquet de cartes. Pas de cloud, pas de compte, pas de pistage. Tes cartes restent sur ton appareil — là où elles doivent être.",
  },
  features: {
    headingLine1: 'Tout ce que les classiques faisaient.',
    headingLine2: "Rien de ce qu'ils rataient.",
    items: {
      localFirst: {
        title: 'Local-first',
        body: 'Tes cartes vivent sur ton appareil. Pas de compte, pas d\'inscription, pas de synchro.',
      },
      zeroCloud: {
        title: 'Zéro cloud',
        body: "Pas de serveurs. Pas de backend. Il n'y a pas de base de données dans laquelle tu pourrais te retrouver.",
      },
      zeroTracking: {
        title: 'Zéro pistage',
        body: "Pas d'analytics. Pas de télémétrie. Aucun SDK tiers. L'app ne fait aucune requête réseau.",
      },
      instantCheckout: {
        title: 'Prêt à la caisse',
        body: "Touche une carte pour la retourner. La luminosité de l'écran passe au maximum automatiquement, pour une lecture fiable.",
      },
      familiarStack: {
        title: 'Un paquet de cartes familier',
        body: "Des cartes qui défilent, s'ouvrent et se retournent exactement comme tu l'attends. Pas de surprise, pas d'apprentissage.",
      },
      allFormats: {
        title: 'Tous les formats',
        body: 'EAN-13, CODE-128, QR, Aztec, PDF417, DataMatrix — tous les codes-barres de tes cartes.',
      },
      noLockIn: {
        title: 'Pas de verrou',
        body: "Exporte toute ta collection dans un simple fichier JSON. Sauvegarde-la, transfère-la, partage-la — ce sont tes données.",
      },
      openSource: {
        title: 'Open source, pour toujours',
        body: "Apache 2.0. Lis le code. Audite-le. Fais un fork. Construis le tien. C'est le deal.",
      },
    },
  },
  backstory: {
    eyebrow: "Pourquoi on l'a faite",
    headingLine1: 'On avait des apps simples.',
    headingLine2: 'Elles marchaient.',
    p1: "Pendant des années, les apps de cartes de fidélité, ça marchait, tout simplement. Tu scannais un code-barres. L'app le gardait. À la caisse, tu le ressortais. Fin.",
    p2: "Puis les apps qu'on utilisait ont été rachetées. Les nouveaux propriétaires les ont « modernisées ». D'un coup, il fallait un compte. Puis une synchro cloud que personne n'avait demandée. Puis des pubs. Puis un abonnement pour des fonctions qui étaient gratuites avant. Puis nos cartes ont commencé à disparaître parce que le serveur de quelqu'un avait passé une mauvaise journée. Puis l'app voulait notre adresse e-mail pour afficher un code-barres.",
    p3: "On en a eu marre de voir des outils simples se faire cannibaliser par des boîtes qui traitaient nos cartes comme un entonnoir plutôt que comme une fonctionnalité.",
    p4: "Alors on en a fait une nouvelle, comme celles d'avant. Bien faite. Pour nous, et pour tous ceux qui regrettent l'époque où les apps faisaient une chose et respectaient assez ton appareil pour rester en dehors du cloud.",
  },
  os: {
    eyebrow: 'Open source, simple par choix',
    heading: 'Chaque ligne, vérifiable.',
    body: "Tesserone est publiée sous licence Apache 2.0. Ça veut dire que tu peux la lire, l'auditer, la forker ou construire la tienne. Pas de télémétrie, pas d'analytics, pas de serveurs — et rien qu'il faille nous croire sur parole.",
    badgeLicense: 'Licence Apache 2.0',
    badgeTelemetry: 'Zéro télémétrie',
    badgeServers: 'Aucun serveur',
    cta: 'Voir sur GitHub',
  },
  stores: {
    appleSup: 'Télécharger dans l\'',
    appleMain: 'App Store',
    appleAria: "Télécharger dans l'App Store",
    googleSup: 'Disponible sur',
    googleMain: 'Google Play',
    googleAria: 'Disponible sur Google Play',
  },
  footer: {
    copyright: 'Sous licence Apache 2.0.',
    privacy: 'Confidentialité',
    github: 'GitHub',
    issues: 'Signalements',
    languageLabel: 'Langue',
  },
  themeToggle: {
    ariaLabel: 'Changer de thème',
  },
  privacy: {
    back: '← Retour à Tesserone',
    title: 'Politique de confidentialité',
    effectiveDateLabel: "Date d'entrée en vigueur",
    effectiveDate: '20 avril 2026',
    sections: {
      oneSentence: {
        title: 'En une phrase',
        body: `<p class="${prose}">Tesserone ne collecte, ne transmet, ni ne partage aucune de tes données. Tout ce que tu saisis reste sur ton appareil.</p>`,
      },
      whatWeCollect: {
        title: 'Quelles données nous collectons',
        body: `<p class="${prose}">${strongOpen}Aucune.${strongClose} Tesserone ne collecte aucune information personnelle, analytics d'usage, rapport de crash, identifiant d'appareil ou toute autre donnée. Il n'y a ni compte, ni inscription, ni profil. L'app ne communique avec aucun serveur qu'on opère — parce qu'on n'en opère aucun.</p>`,
      },
      whatAppStores: {
        title: "Quelles données l'app stocke",
        body: `<p class="${prose}">Les cartes de fidélité que tu ajoutes (nom, code-barres, notes, logo ou couleur choisis, logos personnalisés importés) sont stockées ${strongOpen}localement sur ton appareil${strongClose} via le stockage standard du système d'exploitation. Ces données ne quittent jamais ton appareil, sauf si tu les exportes toi-même avec la fonction Exporter.</p>`,
      },
      permissions: {
        title: 'Les permissions que nous demandons',
        body: `<ul class="list-disc space-y-3 pl-6 ${prose} marker:text-[var(--color-accent)]"><li>${strongOpen}Caméra${strongClose} — utilisée uniquement quand tu touches « Scanner » pour lire un code-barres. Les images sont traitées sur l'appareil et ne sont jamais enregistrées ni transmises.</li><li>${strongOpen}Bibliothèque photo${strongClose} — utilisée uniquement quand tu choisis une image personnalisée comme logo pour une carte. L'image est copiée dans l'espace privé de l'app ; aucun accès à la galerie ne se fait en arrière-plan.</li></ul>`,
      },
      thirdParties: {
        title: 'Tiers',
        body: `<p class="${prose}">L'app ne contient ${strongOpen}aucun SDK tiers, réseau publicitaire, service d'analytics ou outil de pistage${strongClose}. Elle n'effectue aucune requête réseau en usage normal.</p>`,
      },
      children: {
        title: 'Vie privée des enfants',
        body: `<p class="${prose}">Tesserone ne collecte sciemment aucune information sur qui que ce soit — y compris les enfants de moins de 13 ans (ou l'âge minimum équivalent dans ta juridiction). Comme nous ne collectons aucune donnée, il n'y a rien à supprimer ou à exporter sur demande.</p>`,
      },
      rights: {
        title: 'Tes droits (RGPD, CCPA)',
        body: `<p class="${prose}">Des règlements comme le RGPD et le CCPA te donnent le droit d'accéder, de corriger ou de supprimer les données personnelles te concernant. Chipcolate ne détient aucune donnée personnelle sur les utilisateurs de Tesserone, donc il n'y a rien à te fournir ni à effacer. Tes données résident entièrement sur ton appareil, sous ton contrôle — tu peux supprimer une carte ou désinstaller l'app à tout moment pour t'en débarrasser.</p>`,
      },
      changes: {
        title: 'Modifications de cette politique',
        body: `<p class="${prose}">Si cette politique change, on mettra à jour la date ci-dessus et on notera le changement dans les notes de version de l'app. Comme l'approche est « ne rien collecter », des modifications importantes n'arriveraient qu'avec une refonte significative.</p>`,
      },
      contact: {
        title: 'Contact',
        body: `<p class="${prose}">Des questions sur cette politique ? Le plus rapide est d'ouvrir un ticket sur ${linkOpen('https://github.com/chipcolate/tesserone/issues')}github.com/chipcolate/tesserone/issues${linkClose}. Si tu préfères l'e-mail, écris-nous à ${linkOpen('mailto:tesserone@chipcolate.com')}tesserone@chipcolate.com${linkClose}.</p>`,
      },
    },
  },
};
