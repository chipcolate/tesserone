export const SITE_LOCALES = ['en', 'it', 'fr', 'es'] as const;
export type Locale = (typeof SITE_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
  es: 'Español',
};

export type PrivacySection = {
  title: string;
  /** Body HTML; rendered via set:html. Trusted, static content. */
  body: string;
};

export type Feature = {
  title: string;
  body: string;
};

export type Strings = {
  htmlLang: string;
  meta: {
    defaultTitle: string;
    defaultDescription: string;
    privacyTitle: string;
    privacyDescription: string;
  };
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineLine2: string;
    headlineLine3: string;
    subheading: string;
  };
  features: {
    headingLine1: string;
    headingLine2: string;
    items: {
      localFirst: Feature;
      zeroCloud: Feature;
      zeroTracking: Feature;
      instantCheckout: Feature;
      familiarStack: Feature;
      allFormats: Feature;
      noLockIn: Feature;
      openSource: Feature;
    };
  };
  backstory: {
    eyebrow: string;
    headingLine1: string;
    headingLine2: string;
    p1: string;
    p2: string;
    p3: string;
    p4: string;
  };
  os: {
    eyebrow: string;
    heading: string;
    body: string;
    badgeLicense: string;
    badgeTelemetry: string;
    badgeServers: string;
    cta: string;
  };
  stores: {
    appleSup: string;
    appleMain: string;
    appleAria: string;
    googleSup: string;
    googleMain: string;
    googleAria: string;
  };
  footer: {
    copyright: string;
    privacy: string;
    github: string;
    issues: string;
    languageLabel: string;
  };
  themeToggle: {
    ariaLabel: string;
  };
  privacy: {
    back: string;
    title: string;
    effectiveDateLabel: string;
    effectiveDate: string;
    sections: {
      oneSentence: PrivacySection;
      whatWeCollect: PrivacySection;
      whatAppStores: PrivacySection;
      permissions: PrivacySection;
      thirdParties: PrivacySection;
      children: PrivacySection;
      rights: PrivacySection;
      changes: PrivacySection;
      contact: PrivacySection;
    };
  };
};
