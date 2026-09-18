function parseJson(source) {
  try {
    return { ok: true, parsed: JSON.parse(source) };
  } catch (error) {
    return { ok: false, message: `Invalid JSON: ${error.message}` };
  }
}

export function formatJson(source, indent = 2) {
  const result = parseJson(source);
  return result.ok
    ? { ok: true, value: JSON.stringify(result.parsed, null, indent) }
    : result;
}

export function minifyJson(source) {
  const result = parseJson(source);
  return result.ok
    ? { ok: true, value: JSON.stringify(result.parsed) }
    : result;
}

export function applyFormatterAction({ source, action, indent = 2 }) {
  return action === 'minify' ? minifyJson(source) : formatJson(source, indent);
}

function resultMessage(language, result) {
  if (result.ok) return language === 'ko' ? '완료했습니다. 결과를 복사하거나 계속 수정하세요.' : 'Done. Copy the result or keep editing.';
  return language === 'ko' ? `오류: ${result.message}` : result.message;
}

function updateFormatterUi(result, output, status, language) {
  output.textContent = result.ok ? result.value : '';
  output.parentElement.dataset.state = result.ok ? 'success' : 'error';
  status.textContent = resultMessage(language, result);
}

function initializeFormatterPage() {
  const source = document.querySelector('#json-source');
  const output = document.querySelector('#json-output');
  const status = document.querySelector('#formatter-status');
  const indent = document.querySelector('#indent-size');
  const actions = document.querySelector('#formatter-actions');
  const copyButton = document.querySelector('#copy-result');
  const clearButton = document.querySelector('#clear-json');

  if (!source || !output || !status || !indent || !actions || !copyButton || !clearButton) return;

  function language() { return document.documentElement.lang === 'ko' ? 'ko' : 'en'; }
  function run(action) {
    const result = applyFormatterAction({ source: source.value, action, indent: Number(indent.value) });
    updateFormatterUi(result, output, status, language());
  }

  actions.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) run(button.dataset.action);
  });

  clearButton.addEventListener('click', () => {
    source.value = '';
    output.textContent = '';
    output.parentElement.dataset.state = 'idle';
    status.textContent = language() === 'ko' ? '입력값을 지웠습니다.' : 'Input cleared.';
    source.focus();
  });

  copyButton.addEventListener('click', async () => {
    if (!output.textContent) return;
    try {
      await navigator.clipboard.writeText(output.textContent);
      status.textContent = language() === 'ko' ? '결과를 클립보드에 복사했습니다.' : 'Result copied to clipboard.';
    } catch {
      status.textContent = language() === 'ko' ? '복사하지 못했습니다. 결과를 직접 선택해 복사하세요.' : 'Copy failed. Select the result and copy it manually.';
    }
  });
}

if (typeof document !== 'undefined') {
  initializeFormatterPage();
}
