function parseJson(source) {
  try { return { ok: true, value: JSON.parse(source) }; }
  catch (error) { return { ok: false, message: `Invalid JSON: ${error.message}` }; }
}

export function diffJson(beforeSource, afterSource) {
  const before = parseJson(beforeSource);
  if (!before.ok) return before;
  const after = parseJson(afterSource);
  if (!after.ok) return after;
  const changes = [];
  function walk(left, right, path) {
    if (Object.is(left, right)) return;
    const leftObject = left && typeof left === 'object';
    const rightObject = right && typeof right === 'object';
    if (leftObject && rightObject && !Array.isArray(left) && !Array.isArray(right)) {
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
      for (const key of keys) {
        const next = `${path}.${key}`;
        if (!(key in left)) changes.push({ path: next, type: 'added', after: right[key] });
        else if (!(key in right)) changes.push({ path: next, type: 'removed', before: left[key] });
        else walk(left[key], right[key], next);
      }
      return;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        const next = `${path}[${index}]`;
        if (index >= left.length) changes.push({ path: next, type: 'added', after: right[index] });
        else if (index >= right.length) changes.push({ path: next, type: 'removed', before: left[index] });
        else walk(left[index], right[index], next);
      }
      return;
    }
    changes.push({ path, type: 'changed', before: left, after: right });
  }
  walk(before.value, after.value, '$');
  return { ok: true, value: changes };
}

function normalizeTextLine(line, options) {
  let normalized = line;
  if (options.ignoreWhitespace) normalized = normalized.replace(/\s+/g, '');
  if (options.ignoreCase) normalized = normalized.toLocaleLowerCase();
  return normalized;
}

function prepareTextLines(source, options) {
  return source.split(/\r?\n/)
    .map((text, index) => ({ text, normalized: normalizeTextLine(text, options), line: index + 1 }))
    .filter((item) => !options.ignoreBlankLines || item.normalized.trim() !== '');
}

export function diffText(beforeSource, afterSource, options = {}) {
  const beforeLines = prepareTextLines(String(beforeSource), options);
  const afterLines = prepareTextLines(String(afterSource), options);
  if (beforeLines.length * afterLines.length > 1_000_000) {
    return { ok: false, message: 'Text comparison is too large. Compare fewer than 1,000,000 line pairs.' };
  }
  const comparedLines = Math.max(beforeLines.length, afterLines.length);
  const lengths = Array.from({ length: beforeLines.length + 1 }, () => Array(afterLines.length + 1).fill(0));
  for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
      lengths[beforeIndex][afterIndex] = beforeLines[beforeIndex].normalized === afterLines[afterIndex].normalized
        ? lengths[beforeIndex + 1][afterIndex + 1] + 1
        : Math.max(lengths[beforeIndex + 1][afterIndex], lengths[beforeIndex][afterIndex + 1]);
    }
  }

  const matches = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex].normalized === afterLines[afterIndex].normalized) {
      matches.push({ beforeIndex, afterIndex });
      beforeIndex += 1;
      afterIndex += 1;
    } else if (lengths[beforeIndex + 1][afterIndex] >= lengths[beforeIndex][afterIndex + 1]) beforeIndex += 1;
    else afterIndex += 1;
  }

  const changes = [];
  const anchors = [{ beforeIndex: -1, afterIndex: -1 }, ...matches, { beforeIndex: beforeLines.length, afterIndex: afterLines.length }];
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    const beforeChanges = beforeLines.slice(previous.beforeIndex + 1, current.beforeIndex);
    const afterChanges = afterLines.slice(previous.afterIndex + 1, current.afterIndex);
    const changedCount = Math.min(beforeChanges.length, afterChanges.length);
    for (let changeIndex = 0; changeIndex < changedCount; changeIndex += 1) {
      const before = beforeChanges[changeIndex];
      const after = afterChanges[changeIndex];
      changes.push({ line: Math.max(before.line, after.line), type: 'changed', before: before.text, after: after.text });
    }
    for (const before of beforeChanges.slice(changedCount)) changes.push({ line: before.line, type: 'removed', before: before.text });
    for (const after of afterChanges.slice(changedCount)) changes.push({ line: after.line, type: 'added', after: after.text });
  }

  return { ok: true, value: { changes, comparedLines } };
}

export function compareDiffSources(beforeSource, afterSource, mode = 'auto', options = {}) {
  if (!['auto', 'json', 'text'].includes(mode)) return { ok: false, message: 'Choose a valid comparison mode.' };
  if (mode === 'text') {
    const textResult = diffText(beforeSource, afterSource, options);
    return textResult.ok ? { ok: true, value: { kind: 'text', ...textResult.value } } : textResult;
  }

  const jsonResult = diffJson(beforeSource, afterSource);
  if (jsonResult.ok) return { ok: true, value: { kind: 'json', changes: jsonResult.value } };
  if (mode === 'json') return jsonResult;

  const textResult = diffText(beforeSource, afterSource, options);
  return textResult.ok ? { ok: true, value: { kind: 'text', ...textResult.value } } : textResult;
}

function csvEscape(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function jsonToCsv(source) {
  const parsed = parseJson(source);
  if (!parsed.ok) return parsed;
  if (!Array.isArray(parsed.value) || parsed.value.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    return { ok: false, message: 'JSON must be an array of objects to convert to CSV.' };
  }
  const keys = [...new Set(parsed.value.flatMap((row) => Object.keys(row)))];
  const rows = [keys.map(csvEscape).join(',')];
  for (const row of parsed.value) rows.push(keys.map((key) => csvEscape(row[key] ?? '')).join(','));
  return { ok: true, value: rows.join('\n') };
}

function parseCsv(source) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((item) => item !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) return { ok: false, message: 'Invalid CSV: unterminated quoted field.' };
  if (cell !== '' || row.length) { row.push(cell); if (row.some((item) => item !== '')) rows.push(row); }
  return { ok: true, value: rows };
}

function inferCsvValue(value) {
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function csvToJson(source) {
  const parsed = parseCsv(source);
  if (!parsed.ok) return parsed;
  if (!parsed.value.length || parsed.value[0].some((header) => !header.trim())) return { ok: false, message: 'CSV must include a non-empty header row.' };
  const [headers, ...rows] = parsed.value;
  if (rows.some((row) => row.length !== headers.length)) return { ok: false, message: 'Invalid CSV: rows must have the same number of columns as the header.' };
  return { ok: true, value: rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, inferCsvValue(row[index])]))) };
}

function yamlScalar(value) {
  if (value === '{}') return {};
  if (value === '[]') return [];
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1).replaceAll('\\"', '"');
  return value;
}

function yamlString(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (/^[A-Za-z0-9 _./-]+$/.test(value) && !/^(?:true|false|null|~|-?\d+(?:\.\d+)?)$/.test(value)) return value;
  return JSON.stringify(value);
}

export function jsonToYaml(source) {
  const parsed = parseJson(source);
  if (!parsed.ok) return parsed;
  function render(value, indent) {
    const pad = ' '.repeat(indent);
    if (value === null || typeof value !== 'object') return yamlString(value);
    const entries = Array.isArray(value) ? value.map((item) => [null, item]) : Object.entries(value);
    if (!entries.length) return Array.isArray(value) ? '[]' : '{}';
    return entries.map(([key, item]) => {
      const prefix = Array.isArray(value) ? `${pad}-` : `${pad}${key}:`;
      if (item && typeof item === 'object') return `${prefix}\n${render(item, indent + 2)}`;
      return `${prefix} ${yamlString(item)}`;
    }).join('\n');
  }
  try { return { ok: true, value: render(parsed.value, 0) }; }
  catch { return { ok: false, message: 'Unsupported JSON structure.' }; }
}

export function yamlToJson(source) {
  const lines = source.split(/\r?\n/).filter((line) => line.trim() && !line.trimStart().startsWith('#'));
  if (!lines.length) return { ok: false, message: 'YAML input is empty.' };
  if (lines.length === 1 && !lines[0].includes(':') && !lines[0].trimStart().startsWith('-')) return { ok: true, value: yamlScalar(lines[0].trim()) };
  if (lines.some((line) => { const leading = line.match(/^ */)[0].length; return leading % 2 !== 0; })) return { ok: false, message: 'Unsupported YAML indentation. Use two spaces.' };
  function parseBlock(start, indent) {
    const isList = lines[start].startsWith(' '.repeat(indent) + '-');
    const result = isList ? [] : {};
    let index = start;
    while (index < lines.length) {
      const line = lines[index];
      const spaces = line.match(/^ */)[0].length;
      if (spaces < indent) break;
      if (spaces !== indent) throw new Error('Unsupported YAML structure.');
      const content = line.slice(indent);
      if (isList) {
        if (!content.startsWith('-')) throw new Error('Mixed YAML sequence and mapping.');
        const item = content.slice(1).trim();
        if (!item) {
          if (index + 1 >= lines.length) throw new Error('Missing YAML sequence value.');
          const nested = parseBlock(index + 1, indent + 2); result.push(nested.value); index = nested.next; continue;
        }
        result.push(yamlScalar(item)); index += 1; continue;
      }
      const separator = content.indexOf(':');
      if (separator < 1) throw new Error('Unsupported YAML mapping.');
      const key = content.slice(0, separator).trim();
      const raw = content.slice(separator + 1).trim();
      if (raw) result[key] = yamlScalar(raw);
      else {
        if (index + 1 >= lines.length) result[key] = null;
        else { const nested = parseBlock(index + 1, indent + 2); result[key] = nested.value; index = nested.next; continue; }
      }
      index += 1;
    }
    return { value: result, next: index };
  }
  try { return { ok: true, value: parseBlock(0, lines[0].match(/^ */)[0].length).value }; }
  catch (error) { return { ok: false, message: `Invalid YAML: ${error.message}` }; }
}

export function base64Encode(source) {
  try {
    const bytes = new TextEncoder().encode(source);
    let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return { ok: true, value: typeof btoa === 'function' ? btoa(binary) : Buffer.from(bytes).toString('base64') };
  } catch (error) { return { ok: false, message: `Encoding failed: ${error.message}` }; }
}

export function base64Decode(source) {
  try {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source)) throw new Error('Input is not valid Base64.');
    const binary = typeof atob === 'function' ? atob(source) : Buffer.from(source, 'base64').toString('binary');
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch (error) { return { ok: false, message: `Decoding failed: ${error.message}` }; }
}

if (typeof document !== 'undefined') {
  // Page controllers are intentionally kept below the pure functions so Node can import and test them.
  const currentLanguage = () => document.documentElement.lang === 'ko' ? 'ko' : 'en';
  const copy = (en, ko) => currentLanguage() === 'ko' ? ko : en;
  function translateDataLabels() {
    const language = currentLanguage();
    for (const element of document.querySelectorAll('[data-en][data-ko]')) element.textContent = element.dataset[language];
    for (const element of document.querySelectorAll('[data-placeholder-en][data-placeholder-ko]')) element.placeholder = element.dataset[`placeholder${language === 'ko' ? 'Ko' : 'En'}`];
    for (const element of document.querySelectorAll('[data-aria-label-en][data-aria-label-ko]')) element.setAttribute('aria-label', element.dataset[`ariaLabel${language === 'ko' ? 'Ko' : 'En'}`]);
  }
  translateDataLabels();
  new MutationObserver(translateDataLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const copyResult = async (output, status) => { if (!output.textContent) return; try { await navigator.clipboard.writeText(output.textContent); status.textContent = copy('Copied to clipboard.', '클립보드에 복사했습니다.'); } catch { status.textContent = copy('Copy failed.', '복사하지 못했습니다.'); } };
  function wire(config) {
    const input = document.querySelector(config.input); const output = document.querySelector(config.output); const status = document.querySelector(config.status);
    if (!input || !output || !status) return;
    document.querySelector(config.run)?.addEventListener('click', () => { const result = config.transform(input.value, document.querySelector(config.second)?.value); output.textContent = result.ok ? config.render(result.value) : ''; status.textContent = result.ok ? copy('Done. Result is ready.', '완료했습니다. 결과를 확인하세요.') : result.message; output.parentElement.dataset.state = result.ok ? 'success' : 'error'; config.afterRender?.(result); });
    document.querySelector(config.copy)?.addEventListener('click', () => copyResult(output, status));
    document.querySelector(config.clear)?.addEventListener('click', () => { input.value = ''; if (config.second) document.querySelector(config.second).value = ''; output.textContent = ''; status.textContent = copy('Input cleared.', '입력값을 지웠습니다.'); });
  }
  const diffBefore = document.querySelector('#json-before');
  const diffAfter = document.querySelector('#json-after');
  const diffOutput = document.querySelector('#diff-output');
  const diffStatus = document.querySelector('#diff-status');
  const diffPanel = diffOutput?.parentElement;
  const formatDiff = (value) => {
    if (!value.changes.length) return copy('No differences.', '차이가 없습니다.');
    if (value.kind === 'json') return value.changes.map((item) => `${item.type.toUpperCase()} ${item.path}: ${JSON.stringify(item.after ?? item.before)}`).join('\n');
    return value.changes.map((item) => {
      const values = item.type === 'changed' ? `${JSON.stringify(item.before)} → ${JSON.stringify(item.after)}` : JSON.stringify(item.after ?? item.before);
      return `${item.type.toUpperCase()} line ${item.line}: ${values}`;
    }).join('\n');
  };
  document.querySelector('#run-diff')?.addEventListener('click', () => {
    if (!diffBefore || !diffAfter || !diffOutput || !diffStatus || !diffPanel) return;
    const mode = document.querySelector('#diff-mode')?.value ?? 'auto';
    const options = {
      ignoreWhitespace: document.querySelector('#diff-ignore-whitespace')?.checked,
      ignoreBlankLines: document.querySelector('#diff-ignore-blank-lines')?.checked,
      ignoreCase: document.querySelector('#diff-ignore-case')?.checked
    };
    const result = compareDiffSources(diffBefore.value, diffAfter.value, mode, options);
    if (!result.ok) {
      diffOutput.textContent = '';
      diffStatus.textContent = currentLanguage() === 'ko' && mode === 'json' && result.message.startsWith('Invalid JSON:')
        ? 'JSON 형식이 올바르지 않습니다. 유효한 JSON을 입력하거나 텍스트 줄 모드를 선택하세요.'
        : result.message;
      diffPanel.dataset.state = 'error';
      return;
    }
    diffOutput.textContent = formatDiff(result.value);
    const changeCount = result.value.changes.length;
    const modeName = result.value.kind === 'json' ? copy('JSON structure', 'JSON 구조') : copy('text lines', '텍스트 줄');
    const countMessage = currentLanguage() === 'ko'
      ? result.value.kind === 'json'
        ? `${modeName}를 비교했습니다. 변경 ${changeCount}개.`
        : `${modeName} ${result.value.comparedLines}줄을 비교했습니다. 변경 ${changeCount}개.`
      : result.value.kind === 'json'
        ? `Compared ${modeName}; ${changeCount} change${changeCount === 1 ? '' : 's'}.`
        : `Compared ${result.value.comparedLines} ${modeName}; ${changeCount} change${changeCount === 1 ? '' : 's'}.`;
    diffStatus.textContent = countMessage;
    diffPanel.dataset.state = 'success';
  });
  document.querySelector('#copy-diff')?.addEventListener('click', () => { if (diffOutput && diffStatus) copyResult(diffOutput, diffStatus); });
  document.querySelector('#clear-diff')?.addEventListener('click', () => {
    if (!diffBefore || !diffAfter || !diffOutput || !diffStatus || !diffPanel) return;
    diffBefore.value = '';
    diffAfter.value = '';
    diffOutput.textContent = '';
    diffStatus.textContent = copy('Inputs cleared.', '입력값을 지웠습니다.');
    diffPanel.dataset.state = 'idle';
  });
  const converterTable = document.querySelector('#converter-preview');
  const downloadButton = document.querySelector('#download-convert');
  let downloadValue = '';
  let downloadMime = 'text/plain;charset=utf-8';
  function renderTable(rows) {
    converterTable.replaceChildren();
    if (!Array.isArray(rows) || !rows.length || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) { converterTable.hidden = true; return; }
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const head = document.createElement('thead'); const headRow = document.createElement('tr');
    for (const header of headers) { const cell = document.createElement('th'); cell.textContent = header; headRow.append(cell); }
    head.append(headRow); const body = document.createElement('tbody');
    for (const row of rows) { const tableRow = document.createElement('tr'); for (const header of headers) { const cell = document.createElement('td'); const value = row[header]; cell.textContent = value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value); tableRow.append(cell); } body.append(tableRow); }
    converterTable.append(head, body); converterTable.hidden = false;
  }
  wire({ input: '#converter-input', output: '#converter-output', status: '#converter-status', run: '#run-convert', copy: '#copy-convert', clear: '#clear-convert', transform: (value) => { const mode = document.querySelector('#converter-mode')?.value; if (mode === 'json-csv') return jsonToCsv(value); if (mode === 'csv-json') return csvToJson(value); if (mode === 'json-yaml') return jsonToYaml(value); return yamlToJson(value); }, render: (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2), afterRender: (result) => { const mode = document.querySelector('#converter-mode')?.value; if (!result.ok) { renderTable([]); downloadButton.disabled = true; downloadValue = ''; return; } downloadValue = typeof result.value === 'string' ? result.value : JSON.stringify(result.value, null, 2); downloadMime = mode === 'json-csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'; downloadButton.disabled = false; let rows = result.value; if (mode === 'json-csv') { const parsed = csvToJson(result.value); rows = parsed.ok ? parsed.value : []; } renderTable(rows); } });
  downloadButton?.addEventListener('click', () => { if (!downloadValue) return; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([downloadValue], { type: downloadMime })); link.download = `toolkitly-converted.${downloadMime.startsWith('text/csv') ? 'csv' : 'txt'}`; link.click(); URL.revokeObjectURL(link.href); });
  document.querySelector('#clear-convert')?.addEventListener('click', () => { converterTable?.replaceChildren(); if (converterTable) converterTable.hidden = true; downloadValue = ''; if (downloadButton) downloadButton.disabled = true; });
  wire({ input: '#base64-input', output: '#base64-output', status: '#base64-status', run: '#run-base64', copy: '#copy-base64', clear: '#clear-base64', transform: (value) => document.querySelector('#base64-mode')?.value === 'decode' ? base64Decode(value) : base64Encode(value), render: (value) => value });
}
