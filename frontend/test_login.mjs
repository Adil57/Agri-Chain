import { chromium } from 'playwright-core';

const FE = process.env.FE_URL;
const browser = await chromium.launch({
  executablePath: '/snap/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText||'')));

await page.goto(FE, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('Loaded:', page.url());

try {
  await page.getByText('Login', { exact: false }).first().click({ timeout: 5000 });
} catch (e) { console.log('login link note:', e.message.split('\n')[0]); }

try {
  await page.fill('input[type="email"]', 'ramesh@demo.in');
  await page.fill('input[type="password"]', 'demo1234');
} catch (e) { console.log('Fill note:', e.message.split('\n')[0]); }

try {
  await page.getByRole('button', { name: /login/i }).click({ timeout: 5000 });
} catch (e) { console.log('Submit note:', e.message.split('\n')[0]); }

await page.waitForTimeout(10000);
const bodyText = await page.textContent('body');
console.log('HAS "Please wait":', bodyText.includes('Please wait'));
console.log('URL after:', page.url());
console.log('ERRORS:', JSON.stringify(errors.slice(0, 12), null, 2));
await browser.close();
