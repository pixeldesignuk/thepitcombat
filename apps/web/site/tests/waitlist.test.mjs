import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWaitlistConfig, encodeSubmission } from '../src/lib/waitlist.mjs';

test('collection is available without inventing operator details', () => {
  assert.equal(getWaitlistConfig().enabled, true);
  assert.equal(getWaitlistConfig().operatorName, '');
});

test('operator configuration preserves supplied facts and trims whitespace', () => {
  assert.equal(getWaitlistConfig({ OPERATOR_NAME: ' Adopted operator ' }).operatorName, 'Adopted operator');
  assert.equal(getWaitlistConfig().privacyEmail, '');
});

test('submission safely encodes fields and excludes unexpected personal data', () => {
  const data = new FormData();
  data.set('submissionId', 'test-id');
  data.set('name', 'A & B');
  data.set('email', 'parent+pit@example.org');
  data.set('phone', '+44 7700 900123');
  data.append('programmes', 'Kids');
  data.append('programmes', 'Adults');
  data.set('comment', 'BJJ & wrestling, please.');
  data.set('consent', 'opening-updates-email-phone');
  data.set('website', '');
  data.set('child-date-of-birth', '2020-01-01');
  const encoded = new URLSearchParams(encodeSubmission(data));
  assert.deepEqual(encoded.getAll('programmes'), ['Kids', 'Adults']);
  assert.equal(encoded.get('comment'), 'BJJ & wrestling, please.');
  assert.equal(encoded.get('name'), 'A & B');
  assert.equal(encoded.get('email'), 'parent+pit@example.org');
  assert.equal(encoded.get('phone'), '+44 7700 900123');
  assert.equal(encoded.get('submissionId'), 'test-id');
  assert.equal(encoded.get('consent'), 'opening-updates-email-phone');
  assert.equal(encoded.has('child-date-of-birth'), false);
});
