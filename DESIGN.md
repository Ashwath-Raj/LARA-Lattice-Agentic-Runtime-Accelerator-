---
name: LARA Bright Lattice
description: High-energy geometric, semantically colored, and accessible design system for the LARA Agentic Runtime
colors:
  canvas: "#F5FFE8"
  ink: "#101014"
  white: "#FFFFFF"
  blue: "#4B43F5"
  cyan: "#00B9E8"
  magenta: "#EC00D4"
  orange: "#FF7138"
  green: "#23C978"
  lilac: "#C7B9FF"
  violet: "#8B4DFA"
  lime: "#E4FF88"
  muted: "#66666F"
  line: "#D8E0CE"
  panel-blue: "#E8E7FF"
  panel-green: "#DDF8E8"
  panel-lilac: "#EEE8FF"
  panel-orange: "#FFE3D5"
  panel-pink: "#FFE0F8"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "12px"
  md: "20px"
  lg: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-action:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-neutral:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  badge-allow:
    backgroundColor: "{colors.panel-green}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  badge-review:
    backgroundColor: "{colors.panel-orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  badge-deny:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  panel-base:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
---

# LARA Design System — Bright Lattice

## Overview

Bright Lattice is the official design language for LARA (Lattice Agentic Runtime Accelerator). It balances the high visual energy of geometric, colorful modernism with the rigorous legibility and spatial restraint demanded by enterprise operational consoles.

Rather than defaulting to dark-mode "cyberpunk" tropes, Bright Lattice operates on an open, pale cream-green canvas (`#F5FFE8`) where high-contrast near-black typography anchors the content, and deliberate, saturated colors convey precise operational semantics.

## Colors

Color in LARA is strictly functional and role-bound:

- **Global Canvas (`#F5FFE8`)**: The resting background that lets saturated components and graph paths breathe.
- **Electric Blue (`#4B43F5`)**: Core runtime infrastructure, orchestrator state, and primary navigational actions.
- **Cyan (`#00B9E8`)**: Dynamic Information Highway edges, active graph routing, and data flow indicators.
- **Hot Magenta (`#EC00D4`)**: Authority boundaries, security gates, and policy attention notices (use sparingly as a high-priority beacon).
- **Orange (`#FF7138`)**: Execution phases, review-needed operational decisions, and human-in-the-loop approval triggers.
- **Green (`#23C978`)**: Verified outputs, healthy agents, passing benchmark tests, and permitted access.
- **Lilac (`#C7B9FF`)**: Specialist agent surfaces, institutional memory nodes, and knowledge fabric modules.
- **Violet (`#8B4DFA`)**: Controlled self-evolution, candidate prompt/skill versions, and adaptation metrics.
- **Neon Lime (`#E4FF88`)**: Active context planes, focused graph nodes, and current task selection (never used for small text).
- **Near-Black Ink (`#101014`)**: Main typography, high-contrast security borders, and hard system constraints.

## Typography

The typography scale utilizes high x-height geometric sans-serifs (`Inter` as primary, falling back to clean system font stacks) and monospaced fonts for execution telemetry:

- **Display / Page Headers**: Bold / Extra-bold (750–800 weight), tight tracking (`-0.02em`), uppercase or sentence-cased with clear noun anchors.
- **Section Headers (H2/H3)**: Semi-bold / Bold (700 weight), clear visual grouping and top-aligned spacing.
- **Body Text**: 14px–16px (400–500 weight), `#101014` on pale surfaces, with 1.5 line height for high scanning comfort.
- **Telemetry & Traces**: Monospace (`ui-monospace`, `Consolas`), 12px–13px, 500 weight, highlighting `execution_id`, timestamps, and parameter keys.

## Layout

- **Two Core Product Surfaces**:
  1. *Enterprise Workbench*: Focused on user task intake, step-by-step progress decomposition, evidence review, and deliverable hand-off.
  2. *Runtime & Authority Console*: Focused on the Dynamic Information Highway graph, agent coordination telemetry, policy evaluation, and evolution lineage.
- **Structure & Rhythm**:
  - Top bar: Clear identity, active tenant selector, demo persona switcher, and system health status.
  - Main viewport: Asymmetric split layout (primary operational canvas accompanied by an evidence/telemetry drawer).
  - Responsive breakpoints: 1440px (Primary widescreen desktop), 1024px (Compact desktop), 768px (Tablet), and 390px (Mobile inspection).

## Elevation & Depth

- **Shadows**: Soft, multi-layered ambient drop shadows (`0 12px 36px rgba(16, 16, 20, 0.08)`). No harsh black drops.
- **Borders**: Crisp, 1px structural container lines (`#D8E0CE`) creating defined containment blocks on the pale canvas.
- **Z-Index Layering**:
  - Base: Canvas (`#F5FFE8`) with subtle geometric lattice grid overlay.
  - Surface: White and pastel-tinted cards (`.lara-panel`).
  - Active Plane: Neon lime highlight plates (`#E4FF88`).
  - Overlay: Modals, policy approval barriers, and execution drawers.

## Shapes

- **Geometry**: Defined, friendly geometry blending rectangular strength with rounded corners.
- **Radii Hierarchy**:
  - Small elements (Tags, badges, inputs): `12px` (`--lara-radius-sm`).
  - Standard panels and content cards: `20px` (`--lara-radius-md`).
  - Large focal containers and modals: `28px` (`--lara-radius-lg`).
  - Interactive buttons and status chips: `999px` (Full pill shape).
- **Pathways & Connectors**:
  - Continuous 5px thick vector strokes for active graph paths.
  - Dashed or muted lines for candidate or rejected routing alternatives.

## Components

- **Action Buttons**:
  - Primary Action: Pill-shaped, Electric Blue (`#4B43F5`) with crisp white text.
  - Execution/Review: Pill-shaped, Orange (`#FF7138`) with dark ink text.
  - Neutral/Security: Near-Black (`#101014`) with white text.
- **Status & Policy Badges**:
  - Always pair color with text and an icon:
    - Allow: Green background (`#DDF8E8`), dark text, check icon.
    - Review: Orange background (`#FFE3D5`), dark text, alert icon.
    - Deny: Near-black background (`#101014`), white text, lock icon.
- **Information Highway Graph Nodes**:
  - Rounded rectangular agent and tool cards with distinct role color accents.
  - SVG node status rings indicating healthy, executing, or policy-denied states.

## Do's and Don'ts

### Do:
- Keep the semantic color meaning rock-solid across every view (e.g. green is always healthy/allow; magenta is always policy attention).
- Pair colored badges with clear explanatory text labels.
- Provide accessible focus rings (`outline: 3px solid #101014; outline-offset: 3px`) on all interactive controls.
- Maintain equal horizontal padding across card containers.
- Respect `prefers-reduced-motion` across all graph animations.

### Don't:
- Don't use color alone to indicate policy authorization, approval state, or danger.
- Don't put white text on bright lime, yellow, or cyan backgrounds.
- Don't convert the interface into a dark-mode neon dashboard; preserve the open, pale cream-green identity.
- Don't introduce arbitrary decorative gradients that clash with the semantic color palette.
- Don't animate elements continuously without an explicit telemetry state change or pause control.
