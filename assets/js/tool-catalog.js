export const CATEGORIES = [
  { id: 'all', label: { en: 'All tools', ko: '전체 도구' } },
  { id: 'link', label: { en: 'Links & marketing', ko: '링크·마케팅' } },
  { id: 'data', label: { en: 'Data & developer', ko: '데이터·개발' } },
  { id: 'time', label: { en: 'Time', ko: '시간' } },
  { id: 'design', label: { en: 'Design', ko: '디자인' } }
];

export const TOOLS = [
  {
    id: 'utm-builder', href: 'tools/utm-builder.html', category: 'link', icon: '↗',
    name: { en: 'UTM Builder', ko: 'UTM 링크 생성기' },
    description: { en: 'Create campaign URLs with clean tracking parameters.', ko: '추적 파라미터가 포함된 캠페인 URL을 만듭니다.' }
  },
  {
    id: 'url-parser', href: 'tools/url-parser.html', category: 'link', icon: '⌁',
    name: { en: 'URL Parser', ko: 'URL 파서·쿼리 편집기' },
    description: { en: 'Inspect, edit, and rebuild URL query parameters.', ko: 'URL 쿼리 파라미터를 확인·수정·재조합합니다.' }
  },
  {
    id: 'url-codec', href: 'tools/url-codec.html', category: 'link', icon: '%',
    name: { en: 'URL Encoder & Decoder', ko: 'URL 인코더·디코더' },
    description: { en: 'Encode and decode URL-safe text locally.', ko: 'URL 안전 문자열을 브라우저에서 인코딩·디코딩합니다.' }
  },
  {
    id: 'json-formatter', href: 'tools/json-formatter.html', category: 'data', icon: '{}',
    name: { en: 'JSON Formatter', ko: 'JSON 포매터' },
    description: { en: 'Format, validate, and minify JSON locally.', ko: 'JSON을 브라우저에서 포맷·검증·압축합니다.' }
  },
  {
    id: 'json-diff', href: 'tools/json-diff.html', category: 'data', icon: '≠',
    name: { en: 'JSON Diff', ko: 'JSON 비교기' },
    description: { en: 'Compare JSON values and find meaningful changes.', ko: '두 JSON 값의 의미 있는 차이를 찾습니다.' }
  },
  {
    id: 'json-converter', href: 'tools/json-converter.html', category: 'data', icon: '⇄',
    name: { en: 'JSON Converter', ko: 'JSON 변환기' },
    description: { en: 'Convert JSON to CSV or YAML and back.', ko: 'JSON, CSV, YAML 형식을 서로 변환합니다.' }
  },
  {
    id: 'base64-codec', href: 'tools/base64-codec.html', category: 'data', icon: '64',
    name: { en: 'Base64 Encoder & Decoder', ko: 'Base64 인코더·디코더' },
    description: { en: 'Encode and decode UTF-8 text in your browser.', ko: 'UTF-8 텍스트를 브라우저에서 인코딩·디코딩합니다.' }
  },
  {
    id: 'timestamp-converter', href: 'tools/timestamp-converter.html', category: 'time', icon: '◷',
    name: { en: 'Timestamp Converter', ko: 'Unix Timestamp 변환기' },
    description: { en: 'Convert Unix timestamps into readable dates.', ko: 'Unix timestamp를 읽기 쉬운 날짜로 바꿉니다.' }
  },
  {
    id: 'timezone-planner', href: 'tools/timezone-planner.html', category: 'time', icon: '◉',
    name: { en: 'Timezone Planner', ko: 'Timezone 회의 시간 변환기' },
    description: { en: 'Compare meeting times across time zones.', ko: '여러 시간대의 회의 시간을 비교합니다.' }
  },
  {
    id: 'qr-generator', href: 'tools/qr-generator.html', category: 'link', icon: '▦',
    name: { en: 'QR Code Generator', ko: 'QR 코드 생성기' },
    description: { en: 'Generate downloadable QR codes from text or links.', ko: '텍스트나 링크로 QR 코드를 만들어 내려받습니다.' }
  },
  {
    id: 'contrast-checker', href: 'tools/contrast-checker.html', category: 'design', icon: '◐',
    name: { en: 'Contrast Checker', ko: '색상 대비 검사기' },
    description: { en: 'Check WCAG contrast for foreground and background colors.', ko: '전경·배경색의 WCAG 대비를 확인합니다.' }
  },
  {
    id: 'color-converter', href: 'tools/color-converter.html', category: 'design', icon: '◈',
    name: { en: 'Color Converter', ko: '색상 변환기' },
    description: { en: 'Convert between HEX, RGB, and HSL values.', ko: 'HEX, RGB, HSL 색상 값을 변환합니다.' }
  }
];
