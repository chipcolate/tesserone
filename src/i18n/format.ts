import { i18n } from './index';

export function formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(i18n.language || 'en', options).format(date);
}
