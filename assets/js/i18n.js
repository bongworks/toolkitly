const STORAGE_KEY = 'toolkitly-language';

export const COPY = {
  en: {
    searchLabel: 'Search tools', searchPlaceholder: 'Search tools...', eyebrow: 'BROWSER-LOCAL UTILITIES',
    title: 'Useful tools. No account needed.', subtitle: 'Fast utilities for links, data, time, and design work. Your input stays in your browser.',
    allTools: 'All tools', toolCount: '{count} tools available', emptyState: 'No matching tools found.', privacy: 'Privacy',
    comingSoon: 'Coming soon', languageLabel: 'Switch language', themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme'
  },
  ko: {
    searchLabel: '도구 검색', searchPlaceholder: '도구 검색...', eyebrow: '브라우저 내 처리 도구',
    title: '필요한 도구를, 로그인 없이.', subtitle: '링크, 데이터, 시간, 디자인 작업을 빠르게 처리합니다. 입력값은 브라우저 안에 머뭅니다.',
    allTools: '전체 도구', toolCount: '{count}개 도구 사용 가능', emptyState: '일치하는 도구가 없습니다.', privacy: '개인정보처리방침',
    comingSoon: '준비 중', languageLabel: '언어 전환', themeToLight: '라이트 테마로 전환', themeToDark: '다크 테마로 전환'
  }
};

export function getStoredLanguage() {
  const language = localStorage.getItem(STORAGE_KEY);
  return language === 'ko' ? 'ko' : 'en';
}

export function setLanguage(language) {
  const nextLanguage = language === 'ko' ? 'ko' : 'en';
  localStorage.setItem(STORAGE_KEY, nextLanguage);
  document.documentElement.lang = nextLanguage;
  return nextLanguage;
}

export function getCopy(language, key, replacements = {}) {
  const text = COPY[language]?.[key] ?? COPY.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, replacementKey) => replacements[replacementKey] ?? `{${replacementKey}}`);
}

export function translateStaticContent(language) {
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = getCopy(language, element.dataset.i18n);
  }

  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = getCopy(language, element.dataset.i18nPlaceholder);
  }
}
