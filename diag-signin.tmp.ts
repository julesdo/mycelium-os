import { chromium } from '@playwright/test';

const navigateur = await chromium.launch();
const page = await navigateur.newPage();

const erreurs: string[] = [];
page.on('console', (m) => {
	if (m.type() === 'error' || m.type() === 'warning') erreurs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => erreurs.push(`[pageerror] ${e.message}`));

let navigations = 0;
page.on('framenavigated', (f) => {
	if (f === page.mainFrame()) navigations++;
});

await page.goto('http://localhost:20173/fr/signin', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const champ = page.locator('[data-testid="email-input"]');
console.log('navigations   :', navigations);
console.log('champ present :', (await champ.count()) > 0);
console.log('champ actif   :', (await champ.count()) > 0 ? await champ.isEnabled() : 'n/a');
console.log('url finale    :', page.url());
console.log('\n--- console (' + erreurs.length + ') ---');
for (const e of erreurs.slice(0, 15)) console.log(e.slice(0, 300));

await navigateur.close();
