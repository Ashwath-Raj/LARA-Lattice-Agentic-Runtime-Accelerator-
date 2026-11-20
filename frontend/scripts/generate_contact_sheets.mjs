import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UI_DIR = path.resolve('../artifacts/ui-review');

function toBase64(filename) {
  const filePath = path.join(UI_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const data = fs.readFileSync(filePath);
  return `data:image/png;base64,${data.toString('base64')}`;
}

async function generate() {
  console.log('Generating contact sheets via Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Shared CSS for styling contact sheets
  const commonStyles = `
    body {
      margin: 0;
      padding: 32px;
      background: #0F172A;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #94A3B8;
    }
    .badge {
      background: #1E293B;
      border: 1px solid #475569;
      color: #38BDF8;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .grid {
      display: grid;
      gap: 20px;
    }
    .card {
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-head {
      padding: 10px 14px;
      background: #182234;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-head strong {
      font-size: 13px;
      color: #F1F5F9;
    }
    .card-head span {
      font-size: 11px;
      color: #94A3B8;
      font-family: monospace;
    }
    .card-img-wrap {
      background: #000;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .card-img-wrap img {
      width: 100%;
      height: auto;
      display: block;
    }
    .card-desc {
      padding: 8px 12px;
      font-size: 11px;
      color: #94A3B8;
      background: #151E2E;
      border-top: 1px solid #283548;
    }
  `;

  // 1. CONTACT SHEET DESKTOP (3x3 grid)
  console.log('Generating CONTACT_SHEET_DESKTOP.png...');
  const desktopScreens = [
    { title: '1. Overview & Workbench Home', file: 'overview_1440x900.png', res: '1440×900', desc: 'KPI summaries, 30-day spline chart, recent cases, attention queue' },
    { title: '2. Investigations Directory', file: 'investigations_1440x900.png', res: '1440×900', desc: 'Multi-filter search, severity tags, owner avatars, clickable cases' },
    { title: '3. Investigation Workspace (INC-204)', file: 'investigation_detail_1440x900.png', res: '1440×900', desc: '7-stage bar, evidence ledger, claim verification, proposed action' },
    { title: '4. Dynamic Information Highways', file: 'highways_1440x900.png', res: '1440×900', desc: 'Interactive SVG route canvas, node inspector, permitted & excluded sources' },
    { title: '5. Specialist Agent Fleet', file: 'agents_1440x900.png', res: '1440×900', desc: 'Research, Analysis & Verification agents, reliability gauge, capability tags' },
    { title: '6. Controlled Evolution Lab', file: 'evolution_1440x900.png', res: '1440×900', desc: 'Failure signal card, baseline vs candidate code diff, 6-check runner' },
    { title: '7. Governance & Policy Simulator', file: 'governance_1440x900.png', res: '1440×900', desc: 'Principal directory, ABAC/RBAC decision simulator with decision badges' },
    { title: '8. Human Approvals Gateway', file: 'approvals_1440x900.png', res: '1440×900', desc: 'Pending queue cards, linked evidence references, mandatory justification' },
    { title: '9. Cryptographic Audit Trail', file: 'audit_1440x900.png', res: '1440×900', desc: 'Trace-linked event log, step-by-step trace explorer, JSON payload viewer' }
  ];

  const desktopHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${commonStyles}
          .grid { grid-template-columns: repeat(3, 1fr); }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>LARA Operations Console — Desktop Visual Acceptance</h1>
            <p>Phase 6 Master Contact Sheet · 1440 × 900 Desktop Viewport · Google Ads & Workspace Visual Patterns</p>
          </div>
          <div class="badge">9 Primary Operational Surfaces</div>
        </div>
        <div class="grid">
          ${desktopScreens.map(s => `
            <div class="card">
              <div class="card-head">
                <strong>${s.title}</strong>
                <span>${s.res}</span>
              </div>
              <div class="card-img-wrap">
                <img src="${toBase64(s.file)}" />
              </div>
              <div class="card-desc">${s.desc}</div>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
  `;

  await page.setViewport({ width: 2200, height: 1600, deviceScaleFactor: 1 });
  await page.setContent(desktopHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(UI_DIR, 'CONTACT_SHEET_DESKTOP.png'), fullPage: true });
  console.log('  ✓ Saved CONTACT_SHEET_DESKTOP.png');

  // 2. CONTACT SHEET RESPONSIVE
  console.log('Generating CONTACT_SHEET_RESPONSIVE.png...');
  const responsiveItems = [
    { title: 'Overview — Desktop', file: 'overview_1440x900.png', res: '1440×900 (Desktop)', desc: '3-pane layout, full metric row, dual-column operational activity' },
    { title: 'Overview — Laptop', file: 'overview_1280x800.png', res: '1280×800 (Laptop)', desc: 'Tightened margins, 215px sidebar, balanced density' },
    { title: 'Overview — Tablet', file: 'overview_768x1024.png', res: '768×1024 (Tablet)', desc: '2×2 metric grid, stacked chart & activity, off-canvas drawer trigger' },
    { title: 'Overview — Mobile', file: 'overview_390x844.png', res: '390×844 (Mobile)', desc: '2-column metrics, touch-friendly scrolling, collapsed rail' },

    { title: 'Information Highways — Desktop', file: 'highways_1440x900.png', res: '1440×900 (Desktop)', desc: 'Full SVG canvas with node inspector side panel' },
    { title: 'Information Highways — Tablet', file: 'highways_768x1024.png', res: '768×1024 (Tablet)', desc: 'Canvas with horizontal overflow scroll, stacked inspector' },

    { title: 'Approvals — Desktop', file: 'approvals_1440x900.png', res: '1440×900 (Desktop)', desc: 'Master-detail layout with queue cards and justification pane' },
    { title: 'Approvals — Mobile', file: 'approvals_390x844.png', res: '390×844 (Mobile)', desc: 'Stacked vertical request cards with touch decision bar' },

    { title: 'Evolution Lab — Desktop', file: 'evolution_1440x900.png', res: '1440×900 (Desktop)', desc: 'Side-by-side failure signal, candidate diff, and test runner' },
    { title: 'Evolution Lab — Mobile', file: 'evolution_390x844.png', res: '390×844 (Mobile)', desc: 'Vertical candidate diff cards with rotated transition indicator' }
  ];

  const responsiveHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${commonStyles}
          .grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>LARA Operations Console — Responsive Adaptation Contact Sheet</h1>
            <p>Phase 6 Responsive Verification across Desktop (1440×900), Laptop (1280×800), Tablet (768×1024), and Mobile (390×844)</p>
          </div>
          <div class="badge">4 Responsive Breakpoints</div>
        </div>
        <div class="grid">
          ${responsiveItems.map(s => `
            <div class="card">
              <div class="card-head">
                <strong>${s.title}</strong>
                <span>${s.res}</span>
              </div>
              <div class="card-img-wrap">
                <img src="${toBase64(s.file)}" />
              </div>
              <div class="card-desc">${s.desc}</div>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
  `;

  await page.setViewport({ width: 2000, height: 2600, deviceScaleFactor: 1 });
  await page.setContent(responsiveHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(UI_DIR, 'CONTACT_SHEET_RESPONSIVE.png'), fullPage: true });
  console.log('  ✓ Saved CONTACT_SHEET_RESPONSIVE.png');

  // 3. INTERACTION FLOWS
  console.log('Generating INTERACTION_FLOWS.png...');
  const flowItems = [
    { title: 'Flow 1: New Investigation Modal', file: 'modal_new_investigation.png', res: 'Interactive Dialog', desc: 'Focus trap, accessible backdrop scrim, asset selector, scope input & validation' },
    { title: 'Flow 2: Principal Identity Switcher', file: 'identity_menu_open.png', res: 'Header Utility Menu', desc: 'Dropdown switcher for Maya Operator, Ravi Supervisor, LARA Admin, Nila Auditor' },
    { title: 'Flow 3: Dynamic Highway Re-Routing', file: 'highways_supervisor_route.png', res: 'Reactive Route Banner', desc: 'Switched to Ravi Supervisor: unlocks source:vendor-contract without page reload' },
    { title: 'Flow 4: Governance Policy Simulation', file: 'governance_policy_eval.png', res: 'ABAC Evaluation Result', desc: 'Evaluates Action + Resource + Purpose against policy rules; outputs decision badge' },
    { title: 'Flow 5: Approvals Master-Detail Queue', file: 'approvals_selected_card.png', res: 'Queue State Selection', desc: 'Selecting pending action updates evidence references and unlocks justification bar' },
    { title: 'Flow 6: Audit Lifecycle Trace Explorer', file: 'audit_trace_timeline.png', res: 'Correlated Timeline', desc: 'Trace trc_8f14e45f expanded: shows 5 correlated lifecycle events with status tags' }
  ];

  const flowsHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          ${commonStyles}
          .grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>LARA Operations Console — Interactive Flow Contact Sheet</h1>
            <p>Phase 6 Interaction Verification · Modal Traps, Persona Switching, Dynamic Routing & Audit Provenance</p>
          </div>
          <div class="badge">6 Core User Journeys</div>
        </div>
        <div class="grid">
          ${flowItems.map(s => `
            <div class="card">
              <div class="card-head">
                <strong>${s.title}</strong>
                <span>${s.res}</span>
              </div>
              <div class="card-img-wrap">
                <img src="${toBase64(s.file)}" />
              </div>
              <div class="card-desc">${s.desc}</div>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
  `;

  await page.setViewport({ width: 2000, height: 1800, deviceScaleFactor: 1 });
  await page.setContent(flowsHtml, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(UI_DIR, 'INTERACTION_FLOWS.png'), fullPage: true });
  console.log('  ✓ Saved INTERACTION_FLOWS.png');

  await browser.close();
  console.log('\nAll contact sheets generated successfully.');
}

generate().catch(err => {
  console.error('Contact sheet generation failed:', err);
  process.exit(1);
});
