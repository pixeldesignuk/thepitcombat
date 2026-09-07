import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const review = fileURLToPath(new URL('../../../../../.impeccable/review/', import.meta.url));
const dash = 'http://127.0.0.1:5174';
const admin = { email: 'admin@thepitcombat.test', password: 'Browser-admin-test-password-2026!' };
const staff = { email: 'staff@thepitcombat.test', password: 'Browser-staff-test-password-2026!' };

type ConsoleResponse = { status: number; body: unknown };

async function consoleRequest(page: Page, path: string, method = 'GET', body?: unknown): Promise<ConsoleResponse> {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { path, method, body });
}

async function signIn(page: Page, credentials = admin) {
  await page.goto(dash);
  return consoleRequest(page, '/auth/sign-in/email', 'POST', credentials);
}

async function signInThroughConsole(page: Page, credentials = admin) {
  await page.goto(dash);
  await page.locator('#login-email').fill(credentials.email);
  await page.locator('#login-password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Console' })).toBeVisible();
}

async function fill(page: Page, name: string, email: string) {
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('+44 7700 900123');
  await page.locator('[name=programmes][value=Kids]').check();
  await page.locator('[name=consent]').check();
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
  await page.locator('[name=programmes][value=Adults]').check();
  await page.locator('#comment').fill('Interested in BJJ for me and wrestling for my child.');
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
  await expect(page).toHaveURL(/\/thanks\/\?registered=1$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('THE LIST.');
  expect((await signIn(page)).status).toBe(200);
  const interests = await consoleRequest(page, '/api/interests?q=browser-retry%40example.test');
  expect(interests.status).toBe(200);
  expect(interests.body).toMatchObject({ interests: [expect.objectContaining({ name: 'Browser retry parent', phone: '+447700900123', email: 'browser-retry@example.test', emailStatus: 'pending', status: 'new', programmes: ['Kids', 'Adults'], comment: 'Interested in BJJ for me and wrestling for my child.' })] });
  const interest = (interests.body as { interests: { id: string }[] }).interests[0];
  const update = await consoleRequest(page, `/api/interests/${interest.id}`, 'PATCH', { status: 'follow_up', staffNote: 'Browser test: call next Tuesday.' });
  expect(update.body).toMatchObject({ interest: { id: interest.id, status: 'follow_up', staffNote: 'Browser test: call next Tuesday.' } });
  expect((await consoleRequest(page, `/api/interests/${interest.id}`)).body).toMatchObject({ interest: { id: interest.id, status: 'follow_up', staffNote: 'Browser test: call next Tuesday.' } });
});

test('transport failure retains details and a real retry succeeds', async ({ page }) => {
  await page.goto('/');
  await fill(page, 'Browser reconnect parent', 'browser-reconnect@example.test');
  await page.route('**/api/registrations', route => route.abort('failed'), { times: 1 });
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('couldn’t confirm');
  await expect(page.locator('#phone')).toHaveValue('+44 7700 900123');
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await expect(page).toHaveURL(/\/thanks\/\?registered=1$/);
});

test('native form submission without JavaScript persists through the production proxy', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await fill(page, 'Browser native parent', 'browser-native@example.test');
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await page.waitForURL('**/thanks/?registered=1');
  await expect(page.locator('main')).toContainText('Your interest is registered');
  await page.goto(dash);
  expect((await signIn(page)).status).toBe(200);
  const interests = await consoleRequest(page, '/api/interests?q=browser-native%40example.test');
  expect(interests.body).toMatchObject({ interests: [expect.objectContaining({ email: 'browser-native@example.test' })] });
  await context.close();
});

test('console sign-in uses a real session, survives refresh, and logout revokes API access', async ({ page }) => {
  await mkdir(review, { recursive: true });
  await page.goto(dash);
  expect((await consoleRequest(page, '/api/interests')).status).toBe(401);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${review}/console-login.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${review}/console-login-mobile.png`, fullPage: true });
  await page.locator('#login-email').fill(admin.email);
  await page.locator('#login-password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('#login-password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation')).toContainText(/Interests/i);
  expect((await consoleRequest(page, '/api/interests')).status).toBe(200);
  await page.reload();
  await expect(page.getByRole('navigation')).toContainText(/Interests/i);
  expect((await consoleRequest(page, '/api/interests')).status).toBe(200);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  expect((await consoleRequest(page, '/api/interests')).status).toBe(401);
});

test('console interests are searchable and visually accessible at desktop and narrow widths', async ({ page }) => {
  await mkdir(review, { recursive: true });
  await page.goto(dash);
  await signInThroughConsole(page);
  await page.getByRole('button', { name: 'Interests', exact: true }).click();
  await page.locator('#interest-search').fill('browser-retry@example.test');
  await page.getByLabel('Filter by programme').selectOption('Kids');
  await page.getByLabel('Filter by status').selectOption('follow_up');
  await expect(page.getByText('Browser retry parent', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Browser retry parent' }).click();
  await expect(page.locator('#interest-status')).toHaveValue('follow_up');
  await expect(page.locator('.visitor-comment')).toContainText('Interested in BJJ');
  await expect(page.getByRole('checkbox', { name: 'Adults', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Teens', exact: true }).check();
  await page.locator('#interest-status').selectOption('contacted');
  await page.locator('#staff-note').fill('Console UI: contacted and awaiting a reply.');
  await page.locator('#interest-email').fill('browser-retry+console@example.test');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved.');
  expect((await consoleRequest(page, '/api/interests?q=browser-retry%2Bconsole%40example.test')).body).toMatchObject({ interests: [expect.objectContaining({ status: 'contacted', programmes: ['Kids', 'Teens', 'Adults'], staffNote: 'Console UI: contacted and awaiting a reply.', email: 'browser-retry+console@example.test' })] });
  await page.locator('#interest-search').fill('');
  await page.getByLabel('Filter by programme').selectOption('');
  await page.getByLabel('Filter by status').selectOption('');
  await expect(page.getByRole('button', { name: 'Open Browser retry parent' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `${review}/console-desktop.png`, fullPage: true });
  for (const [name, width, height] of [['console-mobile', 390, 844], ['console-narrow', 320, 740]] as const) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: 'Back to interests' }).click();
    await expect(page.getByRole('button', { name: 'Open Browser retry parent' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${review}/${name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Open Browser retry parent' }).click();
    await expect(page.locator('#interest-status')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${review}/${name}-detail.png`, fullPage: true });
  }
});

test('a failed detail request never shows the previously selected record and refresh errors remain visible', async ({ page }) => {
  await signInThroughConsole(page);
  await expect(page.getByRole('button', { name: 'Open Browser retry parent' })).toBeVisible();
  const records = await consoleRequest(page, '/api/interests?q=browser');
  const interests = (records.body as { interests: { id: string; name: string }[] }).interests;
  const retry = interests.find(interest => interest.name === 'Browser retry parent');
  const reconnect = interests.find(interest => interest.name === 'Browser reconnect parent');
  expect(retry?.id).toBeTruthy();
  expect(reconnect?.id).toBeTruthy();
  await page.getByRole('button', { name: 'Open Browser retry parent' }).click();
  await expect(page.locator('#interest-email')).toHaveValue('browser-retry+console@example.test');
  await page.route(`**/api/interests/${reconnect!.id}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable.' }) }));
  await page.getByRole('button', { name: 'Open Browser reconnect parent' }).click();
  await expect(page.getByRole('alert')).toContainText('Record unavailable');
  await expect(page.locator('#interest-email')).toHaveCount(0);
  await page.unroute(`**/api/interests/${reconnect!.id}`);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Browser retry parent' })).toBeVisible();
  await page.route('**/api/interests?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable.' }) }));
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});

test('admins manage staff through real sessions while staff cannot access user administration', async ({ browser, page }) => {
  await mkdir(review, { recursive: true });
  await signInThroughConsole(page);
  await page.getByRole('button', { name: 'Staff accounts' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${review}/console-staff.png`, fullPage: true });
  await page.locator('#new-staff-name').fill('Browser managed staff');
  await page.locator('#new-staff-email').fill('browser-managed@example.test');
  await page.locator('#new-staff-role').selectOption('staff');
  await page.locator('#new-staff-password').fill('Browser-managed-password-2026!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Browser managed staff can now sign in.');
  await page.getByRole('button', { name: 'Manage Browser managed staff' }).click();
  await page.locator('#manage-role').selectOption('admin');
  const promoted = page.waitForResponse(response => response.url().includes('/auth/staff/') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save account changes' }).click();
  expect((await promoted).status()).toBe(200);
  await expect(page.locator('#manage-role')).toHaveValue('admin');
  await page.locator('#manage-role').selectOption('staff');
  const demoted = page.waitForResponse(response => response.url().includes('/auth/staff/') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save account changes' }).click();
  expect((await demoted).status()).toBe(200);
  await expect(page.locator('#manage-role')).toHaveValue('staff');
  await page.locator('#reset-password').fill('Browser-managed-reset-password-2026!');
  const reset = page.waitForResponse(response => response.url().includes('/reset-password') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Reset password' }).click();
  expect((await reset).status()).toBe(200);
  await expect(page.locator('#reset-password')).toHaveValue('');
  const users = await consoleRequest(page, '/auth/staff');
  const managed = (users.body as { users: { id: string; email: string }[] }).users.find(user => user.email === 'browser-managed@example.test');
  expect(managed?.id).toBeTruthy();
  const managedContext = await browser.newContext({ baseURL: dash });
  const managedPage = await managedContext.newPage();
  expect((await signIn(managedPage, { email: 'browser-managed@example.test', password: 'Browser-managed-reset-password-2026!' })).status).toBe(200);
  expect((await consoleRequest(managedPage, '/api/interests')).status).toBe(200);

  const staffContext = await browser.newContext({ baseURL: dash });
  const staffPage = await staffContext.newPage();
  expect((await signIn(staffPage, staff)).status).toBe(200);
  expect((await consoleRequest(staffPage, '/api/interests')).status).toBe(200);
  expect((await consoleRequest(staffPage, '/auth/staff')).status).toBe(403);
  expect((await consoleRequest(staffPage, `/auth/staff/${managed!.id}`, 'PATCH', { active: false })).status).toBe(403);
  await staffContext.close();

  await page.getByRole('button', { name: 'Manage Browser managed staff' }).click();
  await page.getByRole('checkbox', { name: /Account active/i }).uncheck();
  const disabled = page.waitForResponse(response => response.url().includes('/auth/staff/') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save account changes' }).click();
  expect((await disabled).status()).toBe(200);
  await expect(page.getByRole('checkbox', { name: /Account active/i })).not.toBeChecked();
  expect((await consoleRequest(managedPage, '/api/interests')).status).toBe(401);
  await managedContext.close();
  const disabledContext = await browser.newContext({ baseURL: dash });
  const disabledPage = await disabledContext.newPage();
  expect((await signIn(disabledPage, { email: 'browser-managed@example.test', password: 'Browser-managed-reset-password-2026!' })).status).toBe(401);
  await disabledContext.close();
});


test('multi-select validation and dedicated confirmation with social links', async ({ page }) => {
  await page.goto('/');
  await fill(page, 'Choice validation', 'choices@example.test');
  await page.locator('[name=programmes][value=Kids]').uncheck();
  await page.getByRole('button', { name: 'Register interest', exact: true }).click();
  await expect(page.locator('#programme-0')).toBeFocused();
  await page.getByRole('checkbox', { name: 'Kids', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Adults', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Not sure yet', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Kids', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Adults', exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Teens', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Not sure yet', exact: true })).not.toBeChecked();
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['narrow', 320, 740]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/#register');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.form-panel').screenshot({ path: `${review}/interest-form-${name}.png` });
    await page.goto('/thanks/?registered=1');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('THE LIST.');
    await expect(page.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/thepitcombat/');
    await expect(page.getByRole('link', { name: /TikTok/ })).toHaveAttribute('href', 'https://www.tiktok.com/@thepitcombat');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `${review}/interest-thanks-${name}.png`, fullPage: true });
  }
});
