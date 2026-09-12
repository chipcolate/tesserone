import enJson from '../../../shared/i18n/en.json';

export const en = enJson;

export type Translations = {
  [K in keyof typeof en]: { [K2 in keyof (typeof en)[K]]: string };
};
