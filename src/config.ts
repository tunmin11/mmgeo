let globalLanguage: 'en' | 'mm' = 'en';

export type Language = 'en' | 'mm';

export const configure = (options: { language?: Language }) => {
  if (options.language) {
    globalLanguage = options.language;
  }
};

export const getCurrentLanguage = (): Language => globalLanguage;
