import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve('../artifacts/ui-review');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

const SCREENS = [
  { id: 'overview', navLabel: 'Overview' },
  { id: 'investigations', navLabel: 'Investigations' },
  { id: 'highways', navLabel: 'Information Highways' },
  { id: 'agents', navLabel: 'Agents' },
  { id: 'evolution', navLabel: 'Evolution Lab' },
  { id: 'governance', navLabel: 'Governance' },
  { id: 'approvals', navLabel: 'Approvals' },
  { id: 'audit', navLabel: 'Audit Trail' }
];

async function run() {
  console.log(`Starting visual acceptance capture at ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const consoleErrors = [];

  try {
    const page = await browser.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`[Page Error] ${err.toString()}`);
    });

    for (const vp of VIEWPORTS) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));

      for (const screen of SCREENS) {
        try {
          if (screen.id !== 'overview') {
            if (vp.width <= 768) {
              const menuBtn = await page.$('.mobile-menu-button');
              if (menuBtn) {
                await menuBtn.click();
                await new Promise(r => setTimeout(r, 300));
              }
            }
            const navLink = await page.evaluateHandle((label) => {
              const buttons = Array.from(document.querySelectorAll('nav.sidebar-nav button.nav-link'));
              return buttons.find(b => b.textContent && b.textContent.includes(label)) || null;
            }, screen.navLabel);

            if (navLink) {
              await navLink.click();
              await new Promise(r => setTimeout(r, 500));
            }
          }

          const screenshotFile = path.join(OUT_DIR, `${screen.id}_${vp.width}x${vp.height}.png`);
          await page.screenshot({ path: screenshotFile, fullPage: false });
          console.log(`  ✓ Captured ${screen.id} [${vp.name}] -> ${path.basename(screenshotFile)}`);

          if (screen.id === 'investigations' && vp.name === 'desktop') {
            const firstRow = await page.$('.clickable-row');
            if (firstRow) {
              await firstRow.click();
              await new Promise(r => setTimeout(r, 400));
              const detailFile = path.join(OUT_DIR, `investigation_detail_${vp.width}x${vp.height}.png`);
              await page.screenshot({ path: detailFile, fullPage: false });
              console.log(`  ✓ Captured investigation_detail -> ${path.basename(detailFile)}`);
              const backBtn = await page.$('.back-link button');
              if (backBtn) await backBtn.click();
              await new Promise(r => setTimeout(r, 300));
            }
          }
        } catch (screenErr) {
          console.error(`  ✗ Error testing ${screen.id} on ${vp.name}:`, screenErr.message);
        }
      }
    }

    console.log(`\nVisual capture complete. Total console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console Errors found:');
      consoleErrors.forEach(e => console.log('  ', e));
    }
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
