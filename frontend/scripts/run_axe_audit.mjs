import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const AXE_SOURCE = fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'), 'utf8');

async function run() {
  console.log('--- LARA ACCESSIBILITY (a11y) & AXE-CORE AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const auditResults = {};

  const auditPage = async (name, width, height, setupFn) => {
    await page.setViewport({ width, height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    if (setupFn) {
      await setupFn(page);
    }
    await page.evaluate(AXE_SOURCE);
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    // Touch targets check on mobile
    let touchTargetSummary = null;
    if (width <= 420) {
      touchTargetSummary = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input, select'));
        let sub36Count = 0;
        let sub44Count = 0;
        const smallElements = [];
        for (const b of buttons) {
          const rect = b.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 36 || rect.height < 36) {
              sub36Count++;
              smallElements.push({ tag: b.tagName, text: b.textContent?.trim().slice(0, 20), w: rect.width, h: rect.height });
            } else if (rect.width < 44 || rect.height < 44) {
              sub44Count++;
            }
          }
        }
        return { totalInteractive: buttons.length, sub36Count, sub44Count, smallElements: smallElements.slice(0, 5) };
      });
    }

    console.log(`\nScreen: ${name} (${width}x${height})`);
    console.log(`  Violations: ${results.violations.length}`);
    console.log(`  Passes: ${results.passes.length}`);
    console.log(`  Inapplicable: ${results.inapplicable.length}`);
    console.log(`  Incomplete: ${results.incomplete.length}`);

    if (results.violations.length > 0) {
      results.violations.forEach((v) => {
        console.log(`    [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
      });
    }

    auditResults[name] = {
      viewport: `${width}x${height}`,
      violationsCount: results.violations.length,
      passesCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map(n => ({ html: n.html, failureSummary: n.failureSummary }))
      })),
      touchTargetSummary
    };
  };

  // 1. Overview Desktop
  await auditPage('Overview_Desktop', 1440, 900);

  // 2. Overview Mobile
  await auditPage('Overview_Mobile', 390, 844);

  // 3. Information Highways Desktop
  await auditPage('Highways_Desktop', 1440, 900, async (p) => {
    await p.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.nav-link'));
      const highway = links.find(el => el.textContent.includes('Information Highways'));
      if (highway) highway.click();
    });
    await new Promise(r => setTimeout(r, 600));
  });

  // 4. Information Highways Mobile
  await auditPage('Highways_Mobile', 390, 844, async (p) => {
    // Open drawer and click highways
    await p.click('.mobile-menu-button');
    await new Promise(r => setTimeout(r, 300));
    await p.evaluate(() => {
      const links = Array.from(document.querySelectorAll('.nav-link'));
      const highway = links.find(el => el.textContent.includes('Information Highways'));
      if (highway) highway.click();
    });
    await new Promise(r => setTimeout(r, 600));
  });

  // 5. Mobile Navigation Drawer Open
  await auditPage('Mobile_Nav_Drawer_Open', 390, 844, async (p) => {
    await p.click('.mobile-menu-button');
    await new Promise(r => setTimeout(r, 300));
  });

  // 6. New Investigation Modal
  await auditPage('New_Investigation_Modal', 1440, 900, async (p) => {
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newInv = btns.find(b => b.textContent.includes('New Investigation'));
      if (newInv) newInv.click();
    });
    await new Promise(r => setTimeout(r, 400));
  });

  // Check prefers-reduced-motion media query
  const reducedMotionCheck = await page.evaluate(() => {
    const styleSheets = Array.from(document.styleSheets);
    let foundReducedMotionRule = false;
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.conditionText?.includes('prefers-reduced-motion')) {
            foundReducedMotionRule = true;
          }
        }
      } catch (e) {}
    }
    return { foundReducedMotionRule };
  });

  auditResults._metadata = {
    auditedAt: new Date().toISOString(),
    tool: 'axe-core 4.x via Puppeteer Headless Chrome',
    reducedMotionSupported: reducedMotionCheck.foundReducedMotionRule
  };

  const outPath = path.resolve('../artifacts/accessibility_audit_report.json');
  fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nAudit results written to ${outPath}`);

  await browser.close();
}

run().catch(console.error);
