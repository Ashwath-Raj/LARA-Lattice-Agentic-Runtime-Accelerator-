# LARA design language — Bright Lattice

## The direction

The supplied visual reference uses a pale warm-green field, hard-edged geometric blocks, oversized rounded forms, lilac organic shapes, a high-energy cyan arrow and thick magenta/orange pathways. The point is not to make an enterprise console childish. The point is to give complex infrastructure a memorable visual grammar: bold shapes indicate system roles and flow, while the interface remains precise, legible and operational.

## Colour semantics

| Colour | Role in the composition | LARA interface meaning | Usage |
|---|---|---|---|
| Pale cream-green `#F5FFE8` | Open canvas that lets saturated shapes breathe | Global application canvas | Default page background |
| Electric blue `#4B43F5` | Dominant anchor shape | Runtime and orchestration | Main product identity, active runtime states |
| Cyan `#00B9E8` | Directional arrow and connector | Information movement and routing | Route paths, graph edges, data hand-offs |
| Hot magenta `#EC00D4` | Large, high-energy outer pathway | Authority boundary and policy attention | Policy overlays, privileged route indicators; use sparingly |
| Orange `#FF7138` | Secondary pathway inside magenta | Execution and action | Tool execution, review-needed states, action controls |
| Green `#23C978` | Strong block on the left | Allowed and healthy state | Successful checks, healthy agents, permitted access |
| Lilac `#C7B9FF` | Soft flower-like cluster | Specialist agents and knowledge | Agent cards, memory and knowledge nodes |
| Violet `#8B4DFA` | Small high-contrast accents | Evolution and adaptation | Candidate versions, learning loop and changed states |
| Neon lime `#E4FF88` | Highlight plane behind shapes | Active context and focus | Selected task, current route, contextual highlight; never small text |
| Near-black `#101014` | Contrast and visual grounding | Security boundary and critical text | Main type, denied state, hard system boundaries |

## Colour is semantic, not decorative

- Keep each colour associated with the same system meaning across the Workbench, Runtime Console and diagrams.
- Do not make every card a different colour. Neutral white surfaces and pale tints carry most content.
- Use saturated colours for focal elements, route paths and state transitions.
- Pair status colour with a text label or icon. Never rely on colour alone to communicate allow/deny/review.
- Use near-black text on pale colour fields. Avoid white body text on bright lime, cyan, orange or yellow.
- Magenta should mark authority/policy boundaries, not general danger decoration.

## Shape language

- Rounded rectangles represent capability blocks, agents, tools and services.
- Thick continuous paths represent selected execution routes.
- Dashed paths represent candidate, fallback or unselected routes.
- Circles represent graph nodes, identities or event points.
- Bracket-like or ribbon-like shapes represent information highways and boundaries.
- Organic lilac/violet shapes can be used as accent motifs for adaptive intelligence, but not behind dense text.
- Use one or two large graphic gestures per view. Do not fill every empty space with decoration.

## Layout and hierarchy

- Use an asymmetrical composition: one strong focal region and a supporting information region.
- Keep task status, actor identity and policy state immediately visible.
- The Workbench should prioritise task intake, progress, evidence and deliverable.
- The Runtime Console should prioritise live graph routes, agent coordination, evolution versions, policies and trace inspection.
- Keep diagrams on a pale canvas with dark labels and colour-coded relationships.
- Avoid defaulting to generic dark-mode cyber dashboards. The supplied reference is bright, playful and high-contrast.

## Motion

Use restrained, purposeful motion: route traversal, node activation, a prompt-version transition and approval state changes. No perpetual ambient animation. Respect `prefers-reduced-motion`.

## Accessibility

- Check WCAG contrast for all text combinations before shipping.
- Keep labels visible beside coloured state chips.
- Provide keyboard focus states and text alternatives for diagrams.
- Do not use colour as the sole signal for permission decisions.
