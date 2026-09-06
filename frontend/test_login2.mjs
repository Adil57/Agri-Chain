import { chromium } from 'playwright-core';
const FE = process.env.FE_URL;
const browser = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
const reqs = [];
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERR: '+e.message));
page.on('requestfailed', r => errors.push('REQFAIL: '+r.url()+' '+(r.failure()?.errorText||'')));
page.on('request', r => { if(r.url().includes('/api/')) reqs.push(r.method()+' '+r.url()); });
page.on('response', r => { if(r.url().includes('/api/')) reqs.push('RES '+r.status()+' '+r.url()); });

await page.goto(FE + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.fill('input[type="email"]', 'ramesh@demo.in');
await page.fill('input[type="password"]', 'demo1234');

// Find the submit button specifically (the one with ArrowRight or text Login)
const btn = page.locator('button', { hasText: /login/i }).last();
console.log('Clicking submit...');
await btn.click({ timeout: 8000 });

// Wait for navigation OR 12s
await page.waitForTimeout(12000);
const body = await page.textContent('body');
console.log('HAS Please wait:', body.includes('Please wait'));
console.log('URL after:', page.url());
console.log('API REQUESTS/RESPONSES:');
reqs.forEach(r => console.log('  '+r));
console.log('ERRORS:', JSON.stringify(errors.slice(0,10)));
await browser.close();
