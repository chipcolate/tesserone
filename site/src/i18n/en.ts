import type { Strings } from './types';

const strongOpen = '<strong class="text-[var(--color-fg)]">';
const strongClose = '</strong>';
const linkOpen = (href: string) =>
  `<a href="${href}" class="text-[var(--color-accent)] hover:underline">`;
const linkClose = '</a>';
const prose = 'text-[var(--color-fg-muted)]';

export const en: Strings = {
  htmlLang: 'en',
  meta: {
    defaultTitle: 'Tesserone — Your loyalty cards, on your phone',
    defaultDescription:
      'A simple, local-first loyalty card manager. No cloud, no accounts, no tracking. Open source.',
    privacyTitle: 'Privacy Policy — Tesserone',
    privacyDescription:
      'Tesserone collects no data. This page explains what that means, in plain language and in the formal terms app stores ask for.',
  },
  hero: {
    eyebrow: 'Tesserone',
    headlineLine1: 'Your loyalty cards.',
    headlineLine2: 'On your phone.',
    headlineLine3: "That's it.",
    subheading:
      'A simple loyalty card manager with a familiar card-stack feel. No cloud, no accounts, no tracking. Your cards live on your device — where they belong.',
  },
  features: {
    headingLine1: 'Everything the classics did.',
    headingLine2: 'Nothing they got wrong.',
    items: {
      localFirst: {
        title: 'Local-first',
        body: 'Your cards live on your device. No accounts, no sign-up, no sync required.',
      },
      zeroCloud: {
        title: 'Zero cloud',
        body: "There are no servers. There is no backend. We don't have a database you could be in.",
      },
      zeroTracking: {
        title: 'Zero tracking',
        body: 'No analytics. No telemetry. No third-party SDKs. The app makes zero network calls.',
      },
      instantCheckout: {
        title: 'Instant at checkout',
        body: 'Tap a card to flip it. Screen brightness maxes automatically for reliable scanning.',
      },
      familiarStack: {
        title: 'A familiar card stack',
        body: "Cards that scroll, expand, and flip exactly like you'd expect. No surprises, no learning curve.",
      },
      allFormats: {
        title: 'All the formats',
        body: 'EAN-13, CODE-128, QR, Aztec, PDF417, DataMatrix — every barcode your cards come in.',
      },
      noLockIn: {
        title: 'No lock-in',
        body: "Export your whole collection to a plain JSON file. Back it up, move it between devices, or share it — it's your data.",
      },
      openSource: {
        title: 'Open source, forever',
        body: "Apache 2.0. Read the code. Audit it. Fork it. Build your own. That's the deal.",
      },
    },
  },
  backstory: {
    eyebrow: 'Why we built this',
    headingLine1: 'We had simple apps.',
    headingLine2: 'They worked.',
    p1: 'For years, loyalty card apps just… worked. You scanned a barcode. The app stored it. At the register, you pulled it up. Done.',
    p2: 'Then the apps we relied on got acquired. The new owners "modernised" them. Suddenly we needed accounts. Then cloud sync we never asked for. Then ads. Then a paywall to use features that used to be free. Then our cards started disappearing because someone\'s server had a bad day. Then the app wanted our email address to display a barcode.',
    p3: 'We got tired of watching simple tools get cannibalised by companies that treated our cards as a funnel instead of a feature.',
    p4: 'So we built a new one, like the old ones. Properly. For ourselves, and for anyone else who misses when apps did one thing and respected your device enough to stay out of the cloud.',
  },
  os: {
    eyebrow: 'Open source, simple by design',
    heading: 'Every line, auditable.',
    body: 'Tesserone is released under the Apache 2.0 licence. That means you can read it, audit it, fork it, or build your own. No telemetry, no analytics, no servers — and nothing to take our word on.',
    badgeLicense: 'Apache 2.0 Licence',
    badgeTelemetry: 'Zero telemetry',
    badgeServers: 'No servers',
    cta: 'View on GitHub',
  },
  stores: {
    appleSup: 'Download on the',
    appleMain: 'App Store',
    appleAria: 'Download on the App Store',
    googleSup: 'Get it on',
    googleMain: 'Google Play',
    googleAria: 'Get it on Google Play',
  },
  footer: {
    copyright: 'Apache 2.0 licensed.',
    privacy: 'Privacy',
    github: 'GitHub',
    issues: 'Issues',
    languageLabel: 'Language',
  },
  themeToggle: {
    ariaLabel: 'Toggle color theme',
  },
  privacy: {
    back: '← Back to Tesserone',
    title: 'Privacy Policy',
    effectiveDateLabel: 'Effective date',
    effectiveDate: 'April 20, 2026',
    sections: {
      oneSentence: {
        title: 'In one sentence',
        body: `<p class="${prose}">Tesserone does not collect, transmit, or share any of your data. Everything you enter stays on your device.</p>`,
      },
      whatWeCollect: {
        title: 'What data we collect',
        body: `<p class="${prose}">${strongOpen}None.${strongClose} Tesserone does not collect any personal information, usage analytics, crash reports, device identifiers, or any other data. There is no account, no sign-up, and no profile. The app does not communicate with any server we operate — because we don't operate any.</p>`,
      },
      whatAppStores: {
        title: 'What data the app stores',
        body: `<p class="${prose}">The loyalty cards you add (name, barcode, notes, chosen logo or colour, custom uploaded logos) are stored ${strongOpen}locally on your device${strongClose} using the operating system's standard storage. This data never leaves your device unless you explicitly export it yourself using the Export feature.</p>`,
      },
      permissions: {
        title: 'Permissions we request',
        body: `<ul class="list-disc space-y-3 pl-6 ${prose} marker:text-[var(--color-accent)]"><li>${strongOpen}Camera${strongClose} — used only when you tap "Scan" to read a barcode. Frames are processed on-device and are never saved or transmitted.</li><li>${strongOpen}Photo library${strongClose} — used only when you pick a custom logo image for a card. The image is copied into the app's private storage; no gallery access happens in the background.</li></ul>`,
      },
      thirdParties: {
        title: 'Third parties',
        body: `<p class="${prose}">The app contains ${strongOpen}no third-party SDKs, advertising networks, analytics services, or tracking tools${strongClose}. It makes no network requests in normal use.</p>`,
      },
      children: {
        title: "Children's privacy",
        body: `<p class="${prose}">Tesserone does not knowingly collect information from anyone — including children under 13 (or the equivalent minimum age in your jurisdiction). Because we collect no data at all, there is nothing to delete or export on request.</p>`,
      },
      rights: {
        title: 'Your rights (GDPR, CCPA)',
        body: `<p class="${prose}">Regulations such as the GDPR and CCPA give you rights to access, correct, or delete personal data held about you. Chipcolate holds no personal data about Tesserone users, so there is nothing for us to provide or erase. Your data resides entirely on your device, under your control — you can delete a card or uninstall the app at any time to remove it.</p>`,
      },
      changes: {
        title: 'Changes to this policy',
        body: `<p class="${prose}">If this policy changes, we will update the effective date above and note the change in the app's release notes. Because the app's approach is "collect nothing," material changes would only occur alongside a significant redesign.</p>`,
      },
      contact: {
        title: 'Contact',
        body: `<p class="${prose}">Questions about this policy? The fastest way is to open an issue at ${linkOpen('https://github.com/chipcolate/tesserone/issues')}github.com/chipcolate/tesserone/issues${linkClose}. If you'd rather reach us by email, write to ${linkOpen('mailto:tesserone@chipcolate.com')}tesserone@chipcolate.com${linkClose}.</p>`,
      },
    },
  },
};
