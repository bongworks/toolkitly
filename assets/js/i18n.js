import { applySeoDocumentCopy } from './seo-copy.js';

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
    formatterComplete: 'Done. Copy the result or keep editing.', formatterCleared: 'Input cleared.', formatterCopied: 'Result copied to clipboard.', formatterCopyFailed: 'Copy failed. Select the result and copy it manually.',
    tools: 'Tools', privacyEyebrow: 'PRIVACY', privacyTitle: 'Privacy Policy', privacyLead: 'How Bongworks handles information when you use Toolkitly.',
    privacyOperatorTitle: 'Operator', privacyOperatorText: 'Toolkitly is operated by Bongworks, an individual operator.',
    privacyInputTitle: 'Tool input', privacyInputText: 'JSON and other values entered into currently available tools are processed only in your browser. Toolkitly does not upload, store, or sell that input.',
    privacyAnalyticsTitle: 'Analytics', privacyAnalyticsText: 'We use Google Analytics 4 (GA4) to understand site traffic and improve the service. Depending on your settings and consent, GA4 may process pages viewed, interactions, device and browser information, approximate location, cookies, and online identifiers. User-level and event-level data is retained for 14 months.',
    privacyAdsTitle: 'Advertising and cookies', privacyAdsText: 'We use Google AdSense and may show personalized ads. Google and other third-party vendors may use cookies or online identifiers to serve ads based on visits to this and other websites.',
    privacyGoogleTitle: 'Google and international processing', privacyGoogleText: 'GA4 and AdSense are provided by Google. Information handled by these services may be processed by Google and its affiliates outside your country.', privacyGoogleLink: 'Read how Google uses information from partner sites.',
    privacyChoicesTitle: 'Your choices', privacyChoicesText: 'Where required, a consent message lets you accept or manage analytics and advertising cookies. You can also manage personalized advertising through ', privacyAdsSettings: 'Google Ads Settings', privacyChoicesTail: ' and change cookie settings in your browser.',
    privacyContactTitle: 'Contact', privacyContactLead: 'For privacy questions, contact ', privacyPolicyUpdate: 'Effective date: September 18, 2026. We will update this policy before changing our data practices.'
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
    formatterComplete: '완료했습니다. 결과를 복사하거나 계속 수정하세요.', formatterCleared: '입력값을 지웠습니다.', formatterCopied: '결과를 클립보드에 복사했습니다.', formatterCopyFailed: '복사하지 못했습니다. 결과를 직접 선택해 복사하세요.',
    tools: '도구', privacyEyebrow: '개인정보처리방침', privacyTitle: '개인정보처리방침', privacyLead: 'Toolkitly 이용 시 Bongworks가 정보를 처리하는 방식을 안내합니다.',
    privacyOperatorTitle: '운영 주체', privacyOperatorText: 'Toolkitly는 개인 운영자인 Bongworks가 운영합니다.',
    privacyInputTitle: '도구 입력값', privacyInputText: '현재 제공되는 도구에 입력한 JSON과 기타 값은 브라우저 안에서만 처리됩니다. Toolkitly는 이 입력값을 업로드, 저장 또는 판매하지 않습니다.',
    privacyAnalyticsTitle: '분석', privacyAnalyticsText: 'Bongworks는 사이트 트래픽을 파악하고 서비스를 개선하기 위해 Google Analytics 4(GA4)를 사용합니다. 설정과 동의 여부에 따라 GA4는 조회한 페이지, 상호작용, 기기 및 브라우저 정보, 대략적인 위치, 쿠키, 온라인 식별자를 처리할 수 있습니다. 사용자 수준 및 이벤트 수준 데이터는 14개월 동안 보관합니다.',
    privacyAdsTitle: '광고 및 쿠키', privacyAdsText: 'Bongworks는 Google AdSense를 사용하며 개인 맞춤 광고를 표시할 수 있습니다. Google 및 기타 제3자 제공업체는 이 사이트와 다른 웹사이트 방문 기록을 바탕으로 광고를 제공하기 위해 쿠키 또는 온라인 식별자를 사용할 수 있습니다.',
    privacyGoogleTitle: 'Google 및 국외 처리', privacyGoogleText: 'GA4와 AdSense는 Google이 제공하는 서비스입니다. 이 서비스가 처리하는 정보는 Google 및 그 계열사에 의해 이용자의 국가 밖에서 처리될 수 있습니다.', privacyGoogleLink: 'Google이 파트너 사이트 정보를 사용하는 방법을 확인하세요.',
    privacyChoicesTitle: '이용자의 선택권', privacyChoicesText: '필요한 지역에서는 동의 메시지를 통해 분석 및 광고 쿠키를 수락하거나 관리할 수 있습니다. 개인 맞춤 광고는 ', privacyAdsSettings: 'Google 광고 설정', privacyChoicesTail: '에서 관리할 수 있으며, 브라우저에서도 쿠키 설정을 변경할 수 있습니다.',
    privacyContactTitle: '문의', privacyContactLead: '개인정보 관련 문의: ', privacyPolicyUpdate: '시행일: 2026년 9월 18일. 데이터 처리 방식이 변경되기 전에 이 방침을 업데이트합니다.'
  }
};

export function resolveLanguage(storedLanguage, deviceLanguages = []) {
  if (storedLanguage === 'ko' || storedLanguage === 'en') return storedLanguage;

  for (const language of deviceLanguages) {
    if (typeof language !== 'string') continue;
    if (language.toLowerCase().startsWith('ko')) return 'ko';
    if (language.toLowerCase().startsWith('en')) return 'en';
  }

  return 'en';
}

function deviceLanguages() {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export function getStoredLanguage() {
  let storedLanguage = null;
  try {
    storedLanguage = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Use the browser's language preference when storage is unavailable.
  }
  return resolveLanguage(storedLanguage, deviceLanguages());
}

export function setLanguage(language) {
  const nextLanguage = language === 'ko' ? 'ko' : 'en';
  try {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
  } catch {
    // The selected language remains active for this page even if it cannot persist.
  }
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

  applySeoDocumentCopy(document, language);
}
