import * as SecureStore from 'expo-secure-store';

import i18n, { SUPPORTED_LANGUAGES, type Language } from './index';

const LANGUAGE_KEY = 'app_language';

/** Apply the user's previously chosen language, if any. Call once at startup. */
export async function loadStoredLanguage(): Promise<void> {
  const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    await i18n.changeLanguage(stored);
  }
}

/** Switch language and remember the choice across launches. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}
