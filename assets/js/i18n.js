const STORAGE_KEY = 'toolkitly-language';

export const COPY = {
  en: {
    searchLabel: 'Search tools', searchPlaceholder: 'Search tools...', eyebrow: 'BROWSER-LOCAL UTILITIES',
    title: 'Useful tools. No account needed.', subtitle: 'Fast utilities for links, data, time, and design work. Your input stays in your browser.',
    allTools: 'All tools', toolCount: '{count} tools available', emptyState: 'No matching tools found.', privacy: 'Privacy',
    comingSoon: 'Coming soon', languageLabel: 'Switch language', themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme',
    formatterCategory: 'Data & developer', formatterTitle: 'JSON Formatter', formatterSubtitle: 'Format, validate, and minify JSON. Everything runs in your browser.',
    formatterIndent: 'Indentation', formatterInput: 'Input', formatterOutput: 'Output', formatterPaste: 'paste JSON', formatterFormat: 'Format JSON',
    formatterMinify: 'Minify', formatterTree: 'Tree view', formatterDownload: 'Download', formatterClear: 'Clear', formatterCopy: 'Copy result', formatterInitialStatus: 'Paste JSON, then choose Format JSON or Minify.',
    formatterPlaceholder: '{"project":"Toolkitly","private":true}', formatterPrivacyTitle: 'Private by default.', formatterPrivacyText: 'Your JSON is processed only in this browser and is never uploaded by this tool.',
    formatterComplete: 'Done. Copy the result or keep editing.', formatterCleared: 'Input cleared.', formatterCopied: 'Result copied to clipboard.', formatterCopyFailed: 'Copy failed. Select the result and copy it manually.'
  },
  ko: {
    searchLabel: '도구 검색', searchPlaceholder: '도구 검색...', eyebrow: '브라우저 내 처리 도구',
    title: '필요한 도구를, 로그인 없이.', subtitle: '링크, 데이터, 시간, 디자인 작업을 빠르게 처리합니다. 입력값은 브라우저 안에 머뭅니다.',
    allTools: '전체 도구', toolCount: '{count}개 도구 사용 가능', emptyState: '일치하는 도구가 없습니다.', privacy: '개인정보처리방침',
    comingSoon: '준비 중', languageLabel: '언어 전환', themeToLight: '라이트 테마로 전환', themeToDark: '다크 테마로 전환',
    formatterCategory: '데이터·개발', formatterTitle: 'JSON 포매터', formatterSubtitle: 'JSON을 포맷·검증·압축합니다. 모든 처리는 브라우저 안에서 실행됩니다.',
    formatterIndent: '들여쓰기', formatterInput: '입력', formatterOutput: '결과', formatterPaste: 'JSON 붙여넣기', formatterFormat: 'JSON 포맷',
    formatterMinify: '압축', formatterTree: '트리 보기', formatterDownload: '다운로드', formatterClear: '지우기', formatterCopy: '결과 복사', formatterInitialStatus: 'JSON을 붙여넣고 JSON 포맷 또는 압축을 선택하세요.',
    formatterPlaceholder: '{"project":"Toolkitly","private":true}', formatterPrivacyTitle: '기본값은 비공개입니다.', formatterPrivacyText: '이 도구는 JSON을 이 브라우저 안에서만 처리하며 업로드하지 않습니다.',
    formatterComplete: '완료했습니다. 결과를 복사하거나 계속 수정하세요.', formatterCleared: '입력값을 지웠습니다.', formatterCopied: '결과를 클립보드에 복사했습니다.', formatterCopyFailed: '복사하지 못했습니다. 결과를 직접 선택해 복사하세요.'
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
