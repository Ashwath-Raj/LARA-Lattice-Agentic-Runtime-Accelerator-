# LARA Enterprise Frontend Design System

**Architecture Document**: LARA Design System & Visual Specification  
**Version**: 1.0.0 (Production Release)  
**Primary Visual Archetypes**:
1. **Google Ads Enterprise Console**: High information density, compact primary rail, collapsible secondary navigation, global utility bar, page-level filtering, concise KPI metric cards, SVG trend charts, and dense data tables.
2. **Google Workspace Security Architecture**: Generous white space, calm split compositions, restrained neutral-to-cool palette, purposeful typography hierarchy, and non-generic original brand assets.

---

## 1. Design Philosophy & Brand Foundations

LARA is an enterprise runtime for mission-critical agentic operations. The visual language conveys operational rigor, zero-loss transparency, and institutional calm:
- **Calm, High-Contrast Palette**: Pure `#FFFFFF` surfaces layered over `#F7F9FC` background canvas with crisp `#DADFE7` borders.
- **Original Identity**: Uses the custom geometric LARA route mark (an integrated loop of connected nodes in cobalt, azure, emerald, and coral) and custom typography rather than Google marks or generic templates.
- **Purposeful Product Illustration**: Handcrafted SVGs (`route-flow.svg`, `evidence-file.svg`, `approval-path.svg`) depicting data lineage and decision pathways instead of abstract marketing blobs.
- **Clear Separation of Duties**: Color and badges clearly differentiate authorization levels:
  - **Operator** (`#1A73E8` Cobalt)
  - **Supervisor** (`#F9AB00` / `#B06000` Amber/Orange)
  - **Runtime Administrator** (`#7B61C7` Violet)
  - **Auditor** (`#202124` Deep Ink)

---

## 2. Design Tokens (`frontend/src/styles/tokens.css`)

### 2.1 Palette Variables
```css
:root {
  /* Surfaces & Canvas */
  --lara-bg: #F7F9FC;
  --lara-surface: #FFFFFF;
  --lara-surface-subtle: #F1F4F9;
  --lara-surface-hover: #E8EDF5;
  --lara-border: #DADFE7;
  --lara-border-subtle: #E9EDF3;
  --lara-border-strong: #B8C2D1;

  /* Typography */
  --lara-text: #202124;
  --lara-text-secondary: #5F6368;
  --lara-text-tertiary: #80868B;
  --lara-text-inverse: #FFFFFF;

  /* Brand Accents */
  --lara-primary: #1A73E8;
  --lara-primary-hover: #1557B0;
  --lara-primary-subtle: #E8F0FE;
  --lara-primary-border: #C2D7FF;

  /* Functional Tones */
  --lara-green: #188038;
  --lara-green-bg: #E6F4EA;
  --lara-amber: #B06000;
  --lara-amber-bg: #FEF7E0;
  --lara-red: #D93025;
  --lara-red-bg: #FCE8E6;
  --lara-purple: #7B61C7;
  --lara-purple-bg: #F3E8FD;
  --lara-teal: #0B9A9A;
  --lara-teal-bg: #E6F8F8;

  /* Layout Constants */
  --lara-rail-w: 68px;
  --lara-sidebar-w: 236px;
  --lara-header-h: 64px;

  /* Radius & Shadows */
  --lara-radius-xs: 4px;
  --lara-radius-sm: 6px;
  --lara-radius-md: 10px;
  --lara-radius-lg: 14px;
  --lara-radius-full: 9999px;

  --lara-shadow-sm: 0 1px 2px rgba(32, 33, 36, 0.06);
  --lara-shadow-md: 0 4px 12px rgba(32, 33, 36, 0.08);
  --lara-shadow-lg: 0 8px 24px rgba(32, 33, 36, 0.12);
}
```

---

## 3. Responsive Shell & Layout Architecture

```
+------------------------------------------------------------------------------------------------+
| PRIMARY RAIL (68px) | CONTEXT SIDEBAR (236px) | GLOBAL HEADER (64px) & SEARCH                  |
| - Brand Icon Mark   | - Workspace Selector    | - Global Search (cmd/ctrl+K)                   |
| - Home (Overview)   | - Nav Search Filter     | - Synthetic Demo Badge                         |
| - Work (Cases)      | - Section Nav Groups    | - Help & Notifications Popovers                |
| - Intel (Highways)  | - System Health Pulse   | - Principal Identity Switcher                  |
| - Govern (Approvals)|                         +------------------------------------------------+
| - Audit (Trail)     |                         | FLUID WORKSPACE (Main Content Viewport)        |
| - Settings / Avatar |                         | - Eyebrow & Page Header with Action Buttons    |
|                     |                         | - Metric Grid (KPIs)                           |
|                     |                         | - Operational Trend Visualizations & Tables    |
|                     |                         +------------------------------------------------+
|                     |                         | FOOTER: Runtime Status & Version               |
+------------------------------------------------------------------------------------------------+
```

### Breakpoint Matrix
- **Desktop (>= 1250px)**: Full multi-pane presentation (Rail + Sidebar + Main Area + Inspector).
- **Narrow Desktop / Tablet Landscape (1050px - 1249px)**: Split-screen details stack vertically, highway inspector moves beneath graph canvas.
- **Tablet Portrait (760px - 1049px)**: Secondary context sidebar collapses to overlay drawer, primary rail remains accessible.
- **Mobile (< 760px)**: Primary rail collapses into hamburger toggle; full width mobile drawer with scrim backdrop.

---

## 4. Accessibility & Contrast Verification

- **Color Contrast**: All primary text (`#202124`) on surfaces (`#FFFFFF` and `#F7F9FC`) exceeds 12.5:1, vastly exceeding WCAG AAA standard (7:1).
- **Secondary Text Contrast**: Secondary text (`#5F6368`) achieves 4.6:1 against white, satisfying WCAG AA (4.5:1).
- **Focus Rings**: Two-tone focus outline (`2px solid var(--lara-primary)` with `2px` offset) applied globally via `:focus-visible` without intrusive outlines on pointer click.
- **ARIA & Keyboard Navigation**:
  - `role="tablist"` and `role="tab"` with `aria-selected`
  - `role="dialog"` with `aria-modal="true"`
  - `aria-label` on every icon button and avatar
  - Accessible table markups with `<th scope="col">` and sorting announcements
