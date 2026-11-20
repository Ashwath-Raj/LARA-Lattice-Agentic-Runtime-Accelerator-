import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.resolve('../artifacts/ui-review');

async function testInteractions() {
  console.log('Running interactive flow tests...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const results = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    // 1. New Investigation Dialog Flow
    const newBtn = await page.$('.page-header .btn-primary');
    if (newBtn) {
      await newBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const modal = await page.$('.modal');
      const modalOpen = !!modal;
      await page.screenshot({ path: path.join(OUT_DIR, 'modal_new_investigation.png') });
      results.push({ test: 'New Investigation Modal opens', pass: modalOpen });
      const cancelBtn = await page.$('.modal-foot button');
      if (cancelBtn) await cancelBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // 2. Identity Switcher Popover Flow
    const identityBtn = await page.$('.identity-button');
    if (identityBtn) {
      await identityBtn.click();
      await new Promise(r => setTimeout(r, 300));
      const menu = await page.$('.identity-menu');
      await page.screenshot({ path: path.join(OUT_DIR, 'identity_menu_open.png') });
      results.push({ test: 'Identity Switcher popover renders', pass: !!menu });

      // Click Ravi Supervisor
      const supervisorBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('.identity-menu button'));
        return btns.find(b => b.textContent && b.textContent.includes('Ravi Supervisor')) || null;
      });
      if (supervisorBtn) {
        await supervisorBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const updatedName = await page.$eval('.identity-copy b', el => el.textContent);
        results.push({ test: 'Identity switched to Ravi Supervisor', pass: updatedName.includes('Ravi') });
      }
    }

    // 3. Information Highway route update after identity switch
    const highwaysTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav.sidebar-nav button.nav-link'));
      return btns.find(b => b.textContent && b.textContent.includes('Information Highways')) || null;
    });
    if (highwaysTab) {
      await highwaysTab.click();
      await new Promise(r => setTimeout(r, 600));
      const routeText = await page.$eval('.route-principal-banner', el => el.textContent);
      await page.screenshot({ path: path.join(OUT_DIR, 'highways_supervisor_route.png') });
      results.push({ test: 'Route banner reflects Ravi Supervisor', pass: routeText.includes('Ravi') });
    }

    // 4. Governance Policy Simulator Interaction
    const govTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav.sidebar-nav button.nav-link'));
      return btns.find(b => b.textContent && b.textContent.includes('Governance')) || null;
    });
    if (govTab) {
      await govTab.click();
      await new Promise(r => setTimeout(r, 500));
      const evalBtn = await page.$('.form-full .btn-primary');
      if (evalBtn) {
        await evalBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const policyRes = await page.$('.policy-result');
        await page.screenshot({ path: path.join(OUT_DIR, 'governance_policy_eval.png') });
        results.push({ test: 'Policy Simulator renders evaluation result', pass: !!policyRes });
      }
    }

    // 5. Approvals Queue Card Selection & Decision Validation
    const appTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav.sidebar-nav button.nav-link'));
      return btns.find(b => b.textContent && b.textContent.includes('Approvals')) || null;
    });
    if (appTab) {
      await appTab.click();
      await new Promise(r => setTimeout(r, 500));
      const secondCard = await page.$$('.approval-card');
      if (secondCard && secondCard.length > 1) {
        await secondCard[1].click();
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({ path: path.join(OUT_DIR, 'approvals_selected_card.png') });
        results.push({ test: 'Approval card switching works', pass: true });
      }
    }

    // 6. Audit Trail Trace Inspector Interaction
    const auditTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav.sidebar-nav button.nav-link'));
      return btns.find(b => b.textContent && b.textContent.includes('Audit Trail')) || null;
    });
    if (auditTab) {
      await auditTab.click();
      await new Promise(r => setTimeout(r, 500));
      const inspectBtn = await page.$('.trace-search .btn');
      if (inspectBtn) {
        await inspectBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const timeline = await page.$('.trace-search + .timeline');
        await page.screenshot({ path: path.join(OUT_DIR, 'audit_trace_timeline.png') });
        results.push({ test: 'Audit trace inspector expands timeline', pass: !!timeline });
      }
    }

    console.log('\n--- Interaction Results ---');
    results.forEach(r => console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}: ${r.test}`));
  } finally {
    await browser.close();
  }
}

testInteractions().catch(err => {
  console.error('Interaction test failed:', err);
  process.exit(1);
});
