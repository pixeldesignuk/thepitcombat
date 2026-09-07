import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const review = fileURLToPath(new URL('../../../../../.impeccable/review/', import.meta.url));
const api = 'http://127.0.0.1:3301';
const dash = 'http://127.0.0.1:5174';
const headers = { Authorization: 'Bearer browser-test-access-key' };

async function fill(page: Page, name: string, email: string) {
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('+44 7700 900123');
  await page.locator('#programme').selectOption('Kids');
  await page.getByRole('checkbox').check();
}

test('desktop, mobile and narrow layouts, keyboard FAQ and accessibility', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir(review, { recursive: true });
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['narrow', 320, 740]] as const) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#name')).toBeEnabled();
    await expect(page.locator('#timetable')).toContainText('9:15pm');
    await expect(page.locator('#timetable time[datetime="10:30"]')).toHaveCount(2);
    const faq = page.locator('#faq details').first();
    await faq.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(faq).toHaveAttribute('open', '');
    await expect(faq).toContainText('£40 per month for unlimited training');
    await expect(faq).toContainText('£50 per month for unlimited training');
    await page.keyboard.press('Enter');
    await expect(faq).not.toHaveAttribute('open');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${review}/${name}.png`, fullPage: true });
  }
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('privacy and printable timetable reflect the live stack', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.locator('main')).toContainText('phone number');
  await expect(page.locator('main')).toContainText('Railway');
  await expect(page.locator('main')).toContainText('Resend');
  await expect(page.locator('main')).not.toContainText('Netlify');
  const response = await page.request.get('/downloads/timetable.html');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('21:15');
  await page.goto('/thanks/');
  await expect(page.locator('main')).toContainText('Register your interest');
});

test('real API rejects a malformed phone, preserves fields and persists a corrected retry', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Register interest', exact: true });
  await button.click();
  await expect(page.locator('#name')).toBeFocused();
  await fill(page, 'Browser retry parent', 'browser-retry@example.test');
  await page.locator('#phone').fill('not-a-number');
  await button.click();
  await expect(page.locator('#phone')).toBeFocused();
  expect(await page.locator('#phone').evaluate(input => (input as HTMLInputElement).validity.patternMismatch)).toBe(true);
  // Bypass only client validation to prove the production server rejects bad input.
  await page.locator('#phone').evaluate(input => input.removeAttribute('pattern'));
  const rejected = page.waitForResponse(response => response.url().endsWith('/api/registrations') && response.request().method() === 'POST');
  await button.click();
  expect((await rejected).status()).toBe(400);
  await expect(page.getByRole('status')).toContainText('valid email and phone number');
  await expect(page.locator('#email')).toHaveValue('browser-retry@example.test');
  await page.locator('#phone').fill('+44 7700 900123');
  await button.click();
  await expect(page.getByRole('status')).toContainText('Your interest has been registered');
  await expect(page.locator('#name')).toHaveValue('');
  const records = await (await page.request.get(`${api}/v1/admin/registrations`, { headers })).json();
  const saved = records.registrations.find((row: { email: string }) => row.email === 'browser-retry@example.test');
  expect(saved).toMatchObject({ name: 'Browser retry parent', phone: '+447700900123', emailStatus: 'pending' });
});

test('transport failure retains details and a real retry succeeds', async ({ page }) => {
  await page.goto('/');
  await fill(page, 'Browser reconnect parent', 'browser-reconnect@example.test');
  await page.route('**/api/registrations', route => route.abort('failed'), { times: 1 });
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('couldn’t confirm');
  await expect(page.locator('#phone')).toHaveValue('+44 7700 900123');
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Your interest has been registered');
});

test('native form submission without JavaScript persists through the production proxy', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await fill(page, 'Browser native parent', 'browser-native@example.test');
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await page.waitForURL('**/thanks/?registered=1');
  await expect(page.locator('main')).toContainText('Your interest is registered');
  const data = await (await request.get(`${api}/v1/admin/registrations`, { headers })).json();
  expect(data.registrations.some((row: { email: string }) => row.email === 'browser-native@example.test')).toBe(true);
  await context.close();
});

test('admin API protection and dashboard filtering, empty search, refresh and lock', async ({ page, request }) => {
  expect((await request.get(`${api}/v1/admin/registrations`)).status()).toBe(401);
  await page.goto(dash);
  await page.getByLabel('Access key').fill('wrong-key');
  await page.getByRole('button', { name: 'Open inbox' }).click();
  await expect(page.getByRole('alert')).toContainText('not accepted');
  await page.getByLabel('Access key').fill('browser-test-access-key');
  await page.getByRole('button', { name: 'Open inbox' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByLabel('Find a registration').fill('browser-retry@example.test');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('+447700900123');
  await page.getByLabel('Find a registration').fill('no-such-person');
  await expect(page.getByRole('heading', { name: 'No matches' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await page.getByRole('button', { name: 'Refresh inbox' }).click();
  await expect(page.getByRole('button', { name: 'Refresh inbox' })).toBeEnabled();
  for (const [name, width, height] of [['dash-desktop', 1440, 1000], ['dash-mobile', 390, 844], ['dash-narrow', 320, 740]] as const) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${review}/${name}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.getByRole('button', { name: 'Clear and lock inbox' }).click();
  await expect(page.getByLabel('Access key')).toHaveValue('');
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByLabel('Access key')).toBeFocused();
});
