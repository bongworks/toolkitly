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
