# Minimal UI Design System — Universal Design Rules

Apply the following design principles to every UI component, screen, and application you create. These rules define visual styling only, not product features or functionality.

## 1. Design Philosophy

Use **Spatial Minimalism + Swiss Design + Editorial Minimalism**.

The interface must feel premium, calm, precise, spacious, and intentionally designed.

Prioritize:
- Whitespace over decoration.
- Typography over unnecessary visual elements.
- Alignment over excessive containers.
- Thin borders over heavy shadows.
- Neutral colors over colorful surfaces.
- Clear hierarchy over visual complexity.
- Consistency over arbitrary styling.

Avoid generic dashboard aesthetics, excessive rounded cards, gradients, glassmorphism, decorative icons, and unnecessary visual effects.

## 2. Typography

Font family: Inter. Use Geist as an alternative.

| Element | Size | Weight |
|---|---:|---:|
| Hero heading | 44–48px | 500–600 |
| Page heading | 28–32px | 500–600 |
| Section heading | 18–20px | 500–600 |
| Component heading | 14–16px | 500–600 |
| Body | 13–14px | 400 |
| Button | 13–14px | 500 |
| Form label | 11–12px | 500 |
| Metadata | 10–11px | 500 |

Use line-height between 1.4 and 1.6 for body text, and 1.1 to 1.25 for large headings.

Use uppercase labels sparingly, with subtle letter spacing. Do not make every heading bold or introduce unnecessary font sizes.

## 3. Color System

- Main background: `#F7F9F8`
- Primary surface: `#FFFFFF`
- Primary text: `#171A18`
- Secondary text: `#777D79`
- Muted text: `#929993`
- Borders: `#DDE2DE`
- Subtle surface: `#F0F2F0`
- Primary action: `#2563EB`
- Success: `#23864B`
- Error: `#DC5252`

Use approximately 90–95% neutral colors across ordinary interfaces. Blue and semantic status colors should occupy only a small portion of the visual space.

Do not introduce additional colors without a functional reason.

## 4. Spacing and Alignment

Use a 4px-based spacing system:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

- Standard component gap: 12–16px.
- Card padding: 20–24px.
- Section separation: 32–40px.
- Desktop page gutters: 48–64px on wide screens.
- Tablet gutters: 24–32px.
- Mobile gutters: 16–20px.

Align related content to a consistent grid. Maintain shared left edges between headings, controls, tables, and sections.

Never add arbitrary margins or spacing solely to fill empty space.

## 5. Buttons

**Primary button**
- Solid blue background.
- White text.
- Height: 40px.
- Horizontal padding: 16px.
- Radius: 6px.
- Font size: 13–14px.
- Weight: 500.

**Secondary button**
- White background.
- 1px gray border.
- Dark text.
- Same dimensions as the primary button.

**Tertiary button**
- Transparent background.
- No visible border by default.
- Neutral text.
- Subtle hover state.

Use 32px buttons for compact controls and 44px for prominent actions. Avoid pill-shaped buttons, gradient backgrounds, heavy shadows, and oversized icons.

## 6. Inputs and Controls

- Height: 40px.
- Padding: 12px.
- Font size: 13–14px.
- White background.
- 1px gray border.
- 6px corner radius.
- Blue focus border with a subtle accessible focus ring.

Keep labels above inputs with 6–8px separation. Use consistent dimensions and spacing across all forms.

## 7. Borders, Cards, and Shadows

- Standard border: 1px solid `#DDE2DE`.
- Card radius: 8–10px.
- Standard card padding: 20–24px.
- Divider: 1px solid `#E6E9E6`.
- Default shadow: none.

Use a card only when content requires visual grouping. Prefer whitespace and dividers for simpler layouts.

Avoid wrapping every component in its own card or placing cards inside cards without a clear purpose.

## 8. Icons

Use Lucide outline icons consistently.

- Standard size: 16px.
- Prominent actions: 18–20px.
- Stroke width: approximately 1.75–2px.
- Default color: inherit from the surrounding text.

Avoid mixing icon families, unnecessary colored icons, oversized decorative symbols, and inconsistent stroke weights.

## 9. Motion

Keep ordinary interactions subtle.

- Transition duration: 120–180ms.
- Use understated hover and focus states.
- Avoid unnecessary entrance animations, bouncing elements, and decorative movement.
- Reserve complex animation for interfaces where it communicates meaningful information.
- Respect reduced-motion preferences.

## 10. Universal Consistency Rule

Apply these visual rules to every component regardless of the application, industry, page type, or feature being developed.

Maintain consistent typography, spacing, colors, controls, borders, and interaction states.

Adapt layouts to the content and viewport rather than forcing every page into the same structure.

Do not change functionality, invent features, or impose a particular product layout as part of this design system.

**The result should be minimalist by design, not merely an interface with fewer colors.**
