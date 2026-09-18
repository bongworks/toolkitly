export function buildUtmUrl(sourceUrl, values = {}) {
  let url;
  try {
    url = new URL(String(sourceUrl).trim());
  } catch {
    return { ok: false, message: 'Please enter a valid URL including https://.' };
  }

  const mapping = {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    term: 'utm_term',
    content: 'utm_content'
  };
  for (const [key, parameter] of Object.entries(mapping)) {
    const value = values[key] == null ? '' : String(values[key]).trim();
    if (value) url.searchParams.set(parameter, value);
  }
  return { ok: true, value: url.toString() };
}

export function parseUrl(sourceUrl) {
  let url;
  try {
    url = new URL(String(sourceUrl).trim());
  } catch {
    return { ok: false, message: 'Please enter a valid URL including https://.' };
  }

  const query = {};
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
    else query[key] = value;
  }
  return {
    ok: true,
    value: {
      href: url.href,
      protocol: url.protocol.replace(':', ''),
      origin: url.origin,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      query,
      hash: url.hash.replace(/^#/, '')
    }
  };
}

export function encodeUrlComponent(value) {
  try {
    return { ok: true, value: encodeURIComponent(String(value)) };
  } catch {
    return { ok: false, message: 'Unable to encode this value.' };
  }
}

export function decodeUrlComponent(value) {
  try {
    return { ok: true, value: decodeURIComponent(String(value)) };
  } catch {
    return { ok: false, message: 'Unable to decode this value. Check for an incomplete % sequence.' };
  }
}

function currentLanguage() {
  return document.documentElement.lang === 'ko' ? 'ko' : 'en';
}

function localized(element) {
  return element?.dataset[currentLanguage()] || element?.dataset.en || '';
}

function resultMessage(result, language) {
  if (result.ok) return language === 'ko' ? '완료했습니다. 결과를 확인하세요.' : 'Done. Your result is ready.';
  return language === 'ko' ? `오류: ${result.message}` : result.message;
}

function renderPageText() {
  for (const element of document.querySelectorAll('[data-en][data-ko]')) element.textContent = localized(element);
  for (const element of document.querySelectorAll('[data-placeholder-en][data-placeholder-ko]')) element.placeholder = currentLanguage() === 'ko' ? element.dataset.placeholderKo : element.dataset.placeholderEn;
}

function bindCopy(button, output, status) {
  button?.addEventListener('click', async () => {
    if (!output.textContent) return;
    try {
      await navigator.clipboard.writeText(output.textContent);
      status.textContent = currentLanguage() === 'ko' ? '결과를 클립보드에 복사했습니다.' : 'Result copied to clipboard.';
    } catch {
      status.textContent = currentLanguage() === 'ko' ? '복사하지 못했습니다. 결과를 직접 선택해 복사하세요.' : 'Copy failed. Select the result and copy it manually.';
    }
  });
}

function initUtm() {
  const form = document.querySelector('#utm-form');
  const output = document.querySelector('#utm-output');
  const status = document.querySelector('#utm-status');
  if (!form || !output || !status) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = Object.fromEntries([...form.elements].filter((element) => element.name).map((element) => [element.name, element.value]));
    const result = buildUtmUrl(fields.url, fields);
    output.textContent = result.ok ? result.value : '';
    status.textContent = resultMessage(result, currentLanguage());
    status.dataset.status = result.ok ? 'success' : 'error';
  });
  form.querySelector('[data-clear]')?.addEventListener('click', () => {
    form.reset(); output.textContent = ''; status.textContent = currentLanguage() === 'ko' ? '입력값을 지웠습니다.' : 'Input cleared.'; status.dataset.status = 'idle';
  });
  bindCopy(document.querySelector('#utm-copy'), output, status);
}

function initParser() {
  const form = document.querySelector('#url-parser-form');
  const output = document.querySelector('#url-parser-output');
  const status = document.querySelector('#url-parser-status');
  if (!form || !output || !status) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = parseUrl(form.elements.url.value);
    output.textContent = result.ok ? JSON.stringify(result.value, null, 2) : '';
    status.textContent = resultMessage(result, currentLanguage());
    status.dataset.status = result.ok ? 'success' : 'error';
  });
  form.querySelector('[data-clear]')?.addEventListener('click', () => { form.reset(); output.textContent = ''; status.textContent = currentLanguage() === 'ko' ? '입력값을 지웠습니다.' : 'Input cleared.'; status.dataset.status = 'idle'; });
  bindCopy(document.querySelector('#url-parser-copy'), output, status);
}

function initCodec() {
  const form = document.querySelector('#url-codec-form');
  const output = document.querySelector('#url-codec-output');
  const status = document.querySelector('#url-codec-status');
  if (!form || !output || !status) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const action = form.elements.action.value;
    const result = action === 'decode' ? decodeUrlComponent(form.elements.value.value) : encodeUrlComponent(form.elements.value.value);
    output.textContent = result.ok ? result.value : '';
    status.textContent = resultMessage(result, currentLanguage());
    status.dataset.status = result.ok ? 'success' : 'error';
  });
  form.querySelector('[data-clear]')?.addEventListener('click', () => { form.reset(); output.textContent = ''; status.textContent = currentLanguage() === 'ko' ? '입력값을 지웠습니다.' : 'Input cleared.'; status.dataset.status = 'idle'; });
  bindCopy(document.querySelector('#url-codec-copy'), output, status);
}

if (typeof document !== 'undefined') {
  renderPageText();
  document.querySelector('[data-page-language]')?.addEventListener('click', () => setTimeout(renderPageText, 0));
  initUtm();
  initParser();
  initCodec();
}
