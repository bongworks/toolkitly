import { getCopy, getStoredLanguage, setLanguage, translateStaticContent } from './i18n.js';
import { initializeTheme, toggleTheme } from './theme.js';

export function formatLocalizedStatus(language, type) {
  const copy = {
    en: { success: 'Done. Your result is ready.', error: 'Something needs attention.' },
    ko: { success: '완료했습니다. 결과를 확인하세요.', error: '확인이 필요한 내용이 있습니다.' }
  };
  return copy[language === 'ko' ? 'ko' : 'en'][type] ?? '';
}

export function setStatus(element, { language, type = 'idle', text }) {
  element.dataset.status = type;
  element.textContent = text || formatLocalizedStatus(language, type);
}

export function initializeToolPage() {
  if (typeof document === 'undefined') return;
  const languageButton = document.querySelector('[data-page-language]');
  const themeButton = document.querySelector('[data-page-theme]');
  let language = setLanguage(getStoredLanguage());
  initializeTheme();

  function render() {
    translateStaticContent(language);
    if (languageButton) {
      languageButton.textContent = language.toUpperCase();
      languageButton.setAttribute('aria-label', getCopy(language, 'languageLabel'));
    }
    if (themeButton) {
      const key = document.documentElement.dataset.theme === 'dark' ? 'themeToLight' : 'themeToDark';
      themeButton.setAttribute('aria-label', getCopy(language, key));
    }
  }

  languageButton?.addEventListener('click', () => {
    language = setLanguage(language === 'en' ? 'ko' : 'en');
    render();
  });
  themeButton?.addEventListener('click', () => {
    toggleTheme();
    render();
  });
  render();
  return () => language;
}
