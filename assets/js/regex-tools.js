import { initializeToolPage, setStatus } from './tool-page.js';

function nextIndex(source, index, unicode) {
  if (!unicode || index >= source.length) return index + 1;
  const codePoint = source.codePointAt(index);
  return index + (codePoint > 0xffff ? 2 : 1);
}

export function testRegex(pattern, flags, source) {
  try {
    if (typeof pattern !== 'string' || typeof flags !== 'string' || typeof source !== 'string') throw new Error('Pattern, flags, and text must be strings.');
    new RegExp(pattern, flags);
    const iterator = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
    const matches = [];
    let match;
    while ((match = iterator.exec(source)) !== null) {
      matches.push({ text: match[0], start: match.index, end: match.index + match[0].length, captures: match.slice(1) });
      if (!flags.includes('g')) break;
      if (match[0] === '') iterator.lastIndex = nextIndex(source, iterator.lastIndex, flags.includes('u') || flags.includes('v'));
    }
    return { ok: true, value: { matches, count: matches.length } };
  } catch (error) {
    return { ok: false, message: `Invalid regular expression: ${error.message}` };
  }
}

function initializeRegexTester() {
  const getLanguage = initializeToolPage();
  const pattern = document.querySelector('#regex-pattern');
  const flags = document.querySelector('#regex-flags');
  const source = document.querySelector('#regex-source');
  const run = document.querySelector('#regex-run');
  const resultOutput = document.querySelector('#regex-output');
  const countOutput = document.querySelector('#regex-count');
  const status = document.querySelector('#regex-status');
  if (!pattern || !flags || !source || !run || !resultOutput || !countOutput || !status) return;
  const language = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const translateLabels = () => {
    const current = language();
    for (const element of document.querySelectorAll('[data-en][data-ko]')) element.textContent = element.dataset[current];
  };
  translateLabels();
  new MutationObserver(translateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  run.addEventListener('click', () => {
    const result = testRegex(pattern.value, flags.value, source.value);
    if (!result.ok) {
      resultOutput.replaceChildren();
      countOutput.textContent = '0';
      setStatus(status, { language: getLanguage(), type: 'error', text: result.message });
      return;
    }
    resultOutput.replaceChildren();
    for (const [index, match] of result.value.matches.entries()) {
      const row = document.createElement('tr');
      for (const value of [index + 1, match.text, `${match.start}–${match.end}`, match.captures.map((capture) => capture ?? 'undefined').join(' | ') || '—']) {
        const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
      }
      resultOutput.append(row);
    }
    countOutput.textContent = String(result.value.count);
    setStatus(status, { language: getLanguage(), type: 'success', text: language() === 'ko' ? '일치 결과를 표시했습니다.' : 'Matches are ready.' });
  });
  for (const example of document.querySelectorAll('[data-regex-example]')) {
    example.addEventListener('click', () => {
      pattern.value = example.dataset.regexPattern ?? '';
      flags.value = example.dataset.regexFlags ?? '';
      source.value = example.dataset.regexSource ?? '';
      run.click();
    });
  }
}

if (typeof document !== 'undefined') initializeRegexTester();
