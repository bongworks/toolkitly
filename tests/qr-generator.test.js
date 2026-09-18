import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import { validateQrText } from '../assets/js/qr-generator.js';

test('validateQrText accepts non-empty browser-local QR content', () => {
  assert.deepEqual(validateQrText('https://example.com/?utm_source=newsletter'), {
    ok: true,
    value: 'https://example.com/?utm_source=newsletter'
  });
});

test('validateQrText rejects blank QR content', () => {
  assert.deepEqual(validateQrText('   '), {
    ok: false,
    message: 'Enter text or a URL to generate a QR code.'
  });
});

test('the locally vendored encoder creates a QR matrix without a network service', async () => {
  const source = await readFile('assets/vendor/qrcode.min.js', 'utf8');
  const context = {};
  vm.runInNewContext(source, context);
  const qr = context.qrcode(0, 'M');

  qr.addData('https://toolkitly.example/hello');
  qr.make();

  assert.ok(qr.getModuleCount() > 0);
});
