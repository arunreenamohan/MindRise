import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { SupportedLanguage, Translations } from './types';
import { en } from './en';
import { ml } from './ml';

export interface LocalizationContextValue {
  language: SupportedLanguage;
  t: Translations;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
}

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

const translationsMap: Record<SupportedLanguage, Translations> = {
  en,
  ml,
};

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ml' : 'en'));
  };

  const value = useMemo<LocalizationContextValue>(() => {
    return {
      language,
      t: translationsMap[language],
      setLanguage,
      toggleLanguage,
    };
  }, [language]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

export const useLocalization = (): LocalizationContextValue => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
