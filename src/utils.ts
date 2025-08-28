import { getCurrentLanguage, Language } from './config';

export const getName = (item: { en: string, mm: string }): string => {
  return getCurrentLanguage() === 'mm' ? item.mm : item.en;
};
