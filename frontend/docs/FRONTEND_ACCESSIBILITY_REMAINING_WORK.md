# LARA Frontend Accessibility (a11y) Remaining Work & Audit Report

**Workstream**: Praneeth (Frontend, UX, Design System, Browser Tests)  
**Date**: November 20, 2026  
**Tooling**: `axe-core` 4.x via Puppeteer Headless Chrome, WCAG 2.1 AA Profile  
**Viewports Tested**: Desktop (1440x900), Mobile (390x844)  
**Artifact Source**: `artifacts/accessibility_audit_report.json`

---

## 1. Executive Summary

A comprehensive automated and manual accessibility audit was executed across all primary LARA runtime interfaces:
- **Overview Dashboard** (Desktop & Mobile)
- **Dynamic Information Highways** (Graph & Route Inspector)
- **Human-in-the-Loop Approval Queue** (Decision Gateway & Policy Separation of Duties)
- **Mobile Navigation Drawer** (Expanded & Collapsed)
- **Start Investigation Modal Dialog**

### Quantitative Audit Scorecard
- **Total Rules Evaluated**: 65 WCAG 2.0 / 2.1 Level A & AA rules
- **Passed Rules**: 26–27 per view
- **Inapplicable Rules**: 36–37 per view (audio/video, media alternative rules)
- **Incomplete Checks**: 2 (manual color contrast confirmation on gradient/canvas fills)
- **Violations Identified**: 2 categories (Color Contrast on subtle secondary metadata; Label-in-Name on composite avatar buttons)

---

## 2. Detailed Findings & Empirical Measurements

### Finding A: Text Color Contrast Ratios (WCAG 1.4.3 Level AA)
- **Requirement**: Foreground text must achieve a contrast ratio of at least 4.5:1 against its background (3:1 for large text $\ge$ 18pt or 14pt bold).
- **Observed Behavior**:
  - The enterprise Google-inspired design direction utilizes subtle muted metadata text (`#7A8493` on `#FFFFFF` = 3.78:1) for secondary contextual information (`Operations workspace`, `Operator`, `3 require attention`).
  - Nav group headers (`.nav-group-title`) use `#8993A2` on `#FFFFFF` (3.10:1).
  - Selected blue nav items use `#1A73E8` on `#EAF2FE` (3.99:1).
  - Status indicator labels (`Runtime API`, `Knowledge sources`) use `#7B8797` (3.64:1).
- **Remediation Applied in Phase 5**:
  - Adjusted design tokens in `frontend/src/styles/tokens.css`:
    - `--lara-text-secondary`: darkened from `#5F6368` to `#494D52` (7.3:1 contrast on white).
    - `--lara-text-muted`: darkened from `#7A8493` to `#596270` (5.3:1 contrast on white).
    - `--lara-primary`: deepened to `#1558C0` (5.2:1 contrast against soft blue `#EAF2FE`).
- **Remaining Production Task**:
  - Audit and adjust specific third-tier status badge text (`.status-badge.amber`, `.status-badge.purple`) and chart axis labels (`#E9EDF3` tick labels) to ensure every text element strictly exceeds 4.5:1 without compromising operational badge recognition.

### Finding B: Label-in-Name / Accessible Name Consistency (WCAG 2.5.3 Level A)
- **Requirement**: For interactive elements labeled with visible text, the accessible name must contain the exact visible text string.
- **Observed Behavior**:
  - The `identity-button` header dropdown contained an avatar initials badge (`MO`) followed by the visible name (`Maya Operator`) and role (`Operator`). An earlier `aria-label="Switch demo principal"` did not include the visible name.
  - In SVG Information Highway nodes, `<g role="button">` contained child `<text>` tags with both category (`SOURCE`) and node name (`Telemetry stream`).
- **Remediation Applied in Phase 5**:
  - Updated `identity-button`:
    - Added `aria-hidden="true"` to the decorative initials circle.
    - Updated accessible name to `${activeName} (${activeRole}) - Switch demo principal`, ensuring the visible text appears at the very beginning of the accessible label.
    - Added `aria-haspopup="menu"` and dynamic `aria-expanded={userMenu}`.
  - Updated SVG graph nodes:
    - Added `aria-hidden="true"` to child `<text>` elements within the interactive `<g role="button">` container, allowing the container's `aria-label` to serve as the unified accessible name.

### Finding C: Mobile Touch Target Sizing (WCAG 2.5.5 / 2.5.8 Level AAA / AA)
- **Requirement**: Touch targets should measure at least 44x44px (Level AAA) or 24x24px with sufficient spacing (Level AA).
- **Observed Behavior (Mobile 390px Viewport)**:
  - Header hamburger button was originally 36x36px.
  - Secondary utility buttons (`IconButton`) were 30x30px on small viewports.
  - Compact table buttons (`View all`, `Export`) and segmented controls were 27–30px tall.
- **Remediation Applied in Phase 5**:
  - Expanded `.mobile-menu-button` to `44x44px` (`min-width: 44px; min-height: 44px`).
  - Increased mobile `.header-actions > .icon-button` to `40x40px` with minimum spacing.
  - Expanded `.identity-button` minimum touch target to 40px height.
- **Remaining Production Task**:
  - Add invisible hitbox padding (`::after` pseudo-element with `min-width: 44px; min-height: 44px`) to small table inline buttons (`View all`, `Copy`) and filter chips so desktop compactness is visually maintained while satisfying touch requirements.

---

## 3. Prioritized Accessibility Backlog for Ashwath / Next Release

| Priority | Issue | Component | WCAG Criterion | Proposed Fix |
|---|---|---|---|---|
| **P1** | Badge contrast on warning chips | `components/ui/index.tsx` (`StatusBadge`) | 1.4.3 Contrast (Minimum) | Darken amber text to `#8A4B00` on `#FFF4E5` background (achieves 4.6:1). |
| **P1** | Keyboard navigation into SVG nodes | `features/Pages.tsx` (`HighwaysPage`) | 2.1.1 Keyboard | Add roving tabindex (`tabIndex={selected ? 0 : -1}`) and ArrowLeft/ArrowRight navigation between SVG nodes. |
| **P2** | Modal focus trapping | `components/ui/index.tsx` (`Modal`) | 2.4.3 Focus Order | Implement focus trap inside `Modal` dialog so Tab does not escape to background DOM while open. |
| **P2** | Screen reader live announcements | `features/Pages.tsx` (`ApprovalQueuePage`) | 4.1.3 Status Messages | Add `aria-live="polite"` region to decision outcome banner so approvals/rejections are announced immediately. |
| **P3** | Inline button touch hitboxes | `styles/global.css` (`.data-table .link-text`) | 2.5.8 Target Size (Minimum) | Expand hitbox via `position: relative; &::after { inset: -6px; }`. |

---

## 4. Verification & Audit Tooling Reproduction

To reproduce the automated axe audit against the local runtime:

```bash
# 1. Start the frontend development server
npm run dev --prefix frontend

# 2. In another terminal, run the automated Puppeteer axe script
node frontend/scripts/run_axe_audit.mjs
```

The audit generates `artifacts/accessibility_audit_report.json` with per-screen violation nodes, passes, and touch target statistics.
