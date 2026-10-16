# CSS Architecture & Design System Specification
**Resume Porter — Enterprise Desktop SaaS UI/UX Engineering Standard**

---

## 1. Executive Summary & Architectural Purpose

This document establishes the authoritative CSS architecture, color theory, modular file organization, theme mechanics, and Apple-inspired glassmorphism standards for the **Resume Porter** application. 

The goal of this system is to maintain **pixel-perfect visual coherence, zero-scroll 100vh viewport locking, modular maintainability, and seamless multi-theme switching** across all present and future workstations.

---

## 2. Foundational Color System

### 2.1 The 60–30–10 Balance Rule

Interfaces must adhere to a strict visual weight hierarchy based on the interior design standard **60–30–10**, expanded with a **5% semantic micro-tier**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 60% DOMINANT SURFACE                                                   │
│ Main application canvas, full-screen background, spacious layout gaps  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 30% SECONDARY STRUCTURE                                        │   │
│   │ Pinned navbar, workstation sidebars, cards, panels, containers │   │
│   │                                                                │   │
│   │   ┌────────────────────────────────────────────────────────┐   │   │
│   │   │ 10% ACCENT                                             │   │   │
│   │   │ Primary buttons, active indicators, focused inputs     │   │   │
│   │   └────────────────────────────────────────────────────────┘   │   │
│   │   │ 5% SEMANTIC: Success green, Warning amber, Danger red  │   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **60% — Dominant Canvas**:
   - The primary application viewport canvas and empty space.
   - Example (Light): `#F7F9F8` (Off-white / Alabaster).
   - Example (Dark): `#0D1117` or `#121614` (Deep Charcoal / Slate).
2. **30% — Secondary Structural Surfaces**:
   - Navigation bars, sidebars, workstation panels, table rows, cards, and modal dialog bodies.
   - Example (Light): `#FFFFFF` (Pure white) with `#DDE2DE` structural borders.
   - Example (Dark): `#181E1B` / `#1E2421` with `#2B332E` borders.
3. **10% — Intentional Accent**:
   - Primary interactive triggers, active tab indicators, selected radio/checkbox toggles, focused outlines.
   - Example: `#2563EB` (Cobalt Blue) or `#2D5A27` (Deep Forest Olive).
4. **5% — Semantic Feedback**:
   - Micro-indicators, ATS match tags, live connection badges, error toasts, and trend arrows.
   - Example: `#23864B` (Success), `#D97706` (Warning), `#DC2626` (Danger).

---

### 2.2 Limited Color Palette Principle

Color is reserved for hierarchy and meaning. Color proliferation is strictly prohibited:

| Palette Tier | Roles | Allowed Hues |
| :--- | :--- | :--- |
| **Neutral Palette** | Canvas, surfaces, cards, borders, text, dividers | 4 shades: Canvas (`#F7F9F8`), Surface (`#FFFFFF`), Border (`#DDE2DE`), Divider (`#E6E9E6`) |
| **Text Palette** | Headings, body copy, muted captions, placeholders | 3 shades: Primary (`#171A18`), Secondary (`#777D79`), Subtle (`#929993`) |
| **Brand / Accent** | Primary actions, key selected states | 1 Primary (`#2563EB` or `#171A18` by theme) + 1 Hover shade |
| **Semantic** | Status pills, ATS score badges, operational alerts | 3 Standard roles: Success (`#23864B`), Warning (`#D97706`), Danger (`#DC2626`) |

---

### 2.3 Light vs. Dark Mode Contrast Scaling (Sync Ranges)

- **Light Mode (`60-30-10-5`)**:
  - Increase surface separation through delicate 1px border contrast (`#DDE2DE`) rather than heavy shadows.
  - Dominant canvas stays high-key (`#F7F9F8`), secondary containers use crisp pure white (`#FFFFFF`).
- **Dark Mode (`60-30-10-5`)**:
  - Decrease pure black harshness. Use charcoal/zinc depths (`#0F1210` dominant, `#181D1A` secondary).
  - Sync the range by stepping surface brightness progressively: 
    `Viewport (#0F1210)` → `Panel (#181D1A)` → `Card/Input (#222925)` → `Interactive Control (#2D3631)`.
  - Desaturate text colors slightly to prevent halation and eye fatigue.

---

## 3. Modular File Structure & Maintenance Hierarchy

To guarantee maintainability, zero cascade collisions, and high developer velocity, styles are separated into **Shared Foundations (Master CSS)** and **Isolated Screen Views (Page CSS)**.

### 3.1 Recommended File Hierarchy

```
frontend/src/
├── styles/
│   ├── index.css                # Base reset, CSS custom properties, global font setup
│   ├── tokens/
│   │   ├── colors.css           # 60-30-10 color tokens, semantic variables, dark/light definitions
│   │   ├── typography.css       # Inter font scales, line-heights, letter-spacing
│   │   └── spacing.css          # 4px-grid spacing, viewport constraints (100vh lock)
│   ├── foundations/
│   │   ├── buttons.css          # Primary, secondary, icon-only, ghost button primitives
│   │   ├── panels.css           # Cards, split panels, section blocks, divider rules
│   │   ├── popups.css           # High-clarity modal overlays (zero-blur Image 1 standard), dialog cards
│   │   └── inputs.css           # Text fields, selects, toggle switches, search inputs
│   └── themes/
│       ├── theme-default.css    # Swiss Minimalist standard
│       ├── theme-difference.css # Contextual per-page tints & motion overrides
│       ├── theme-glass.css      # Apple-inspired translucent glassmorphism
│       └── theme-minimal.css    # Monochrome achromatic high-contrast
│
└── components/
    ├── JobDiscoveryEngine.css   # 1. Explorer Screen (Radar & hardware accelerated stream)
    ├── GenerationView.css       # 2. Generation Screen (15-row table & split document preview)
    ├── AutomationView.css       # 3. Automation Screen (Pipeline manager & live console terminal)
    ├── ProfileView.css          # 4. Profile Screen (2-column sidebar & internal form scroll)
    ├── AnalyticsView.css        # 5. Analytics Screen (30-day timeline chart & KPI grid)
    ├── ToolsView.css            # 6. Tools Screen (4x2 desktop matrix & quick action cards)
    └── SettingsModal.css        # 7. Settings Screen (MCP protocol, AI keys & modal sub-views)
```

### 3.2 Master CSS Architecture & Linking Rules

1. **Tokens Before Components**: `colors.css` and `typography.css` must load before any component or layout styles.
2. **Page Styles Do Not Style Globals**: `ProfileView.css` or `AnalyticsView.css` must never target raw `body`, `button`, or universal HTML tags without component-scoped classes (e.g. `.profile-container button.profile-nav-btn`).
3. **Master Reusability**: Reusable elements (`.btn-primary-olive`, `.app-modal-overlay`, `.app-modal-card`, `.setup-banner-card`) reside in central foundations and are linked via `index.css` or `App.css`.

---

## 4. Dual Mode & Four-Theme Specification

The application supports **2 Color Modes** (Light and Dark) and **4 Personality Themes**:

```
                        ┌───────────────────┐
                        │ Color Mode Switch │
                        └─────────┬─────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
           [ Light Mode ]                    [ Dark Mode ]
                 │                                 │
     ┌───────────┼───────────┬──────────┐          │
     ▼           ▼           ▼          ▼          │
 [Default] [Difference]   [Glass]   [Minimal] ◄────┘
```

### 4.1 Theme Breakdown

| Theme | Visual Personality | Canvas (60%) | Containers (30%) | Accent (10%) | Motion / Animations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Default** | Swiss Minimalist / Modern SaaS | `#F7F9F8` Off-white | `#FFFFFF` with `#DDE2DE` | `#2563EB` Blue / `#171A18` Dark | Standard subtle hover (120–150ms) |
| **2. Difference** | Dynamic Visual Identity | Page-Contextual Canvas (Explorer: `#F4F7F5`, Generation: `#F8F6F4`, Automation: `#121614`) | High-contrast elevated panels with subtle border glow | `#22C55E` / `#6366F1` | Interactive Cursor Particles & Active Canvas Data Flows |
| **3. Glass** | Apple macOS / VisionOS Frosted Glass | Deep Ambient Gradient or Atmospheric Base | Translucent acrylic surfaces with `backdrop-filter: blur(16px–24px)` | Metallic Slate Blue (`#34536F` / `#38BDF8`) | Refined specular highlight transitions |
| **4. Minimal** | Achromatic Editorial High-Contrast | Pure `#000000` or `#F5F5F5` | `#09090B` or `#FFFFFF` (1px `#D4D4D8`) | `#18181B` Monochrome (Color blocked except company logos & green checks) | Zero decorative animations |

---

## 5. Apple-Inspired Glassmorphism Design Requirements (The 24 Standards)

When the **Glass** theme is activated, all styled surfaces must adhere to the 24 Apple-grade glassmorphism engineering requirements:

1. **Frosted-Glass Translucency**: Use translucent surfaces with background blur (`backdrop-filter`) to create a refined frosted-glass effect.
2. **Selective Application**: Apply glass styling strictly to floating layers: navigation bars, workstation sidebars, floating toolbars, popovers, dropdowns, and modal dialogs.
3. **Visual Hierarchy**: Maintain depth layering: `Canvas Base (Z:0)` → `Primary Content (Z:10)` → `Floating Navigation (Z:50)` → `Modal Overlays (Z:1000)`.
4. **Restrained Glass Palette**: Use black, white, gray, charcoal, and dark metallic blue for all glass materials.
5. **60–30–10 Compliance**: Balance glass surfaces without compromising legibility or visual weight.
6. **Ambient Lighting**: Use subtle background linear gradients (`linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`) and soft specular edge reflections.
7. **Specular Borders**: Apply thin, semi-transparent 1px borders (`border: 1px solid rgba(255, 255, 255, 0.18)`) and inset top highlights (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.25)`).
8. **Diffuse Shadows**: Use multi-layered soft shadows (`box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.08), 0 2px 6px 0 rgba(0, 0, 0, 0.04)`).
9. **Consistent Metrics**: Retain standard radii (`9px` for cards, `6px` for buttons), padding, and component heights (`40px` controls).
10. **Blur Range Calibration**: Use `backdrop-filter: blur(12px)` for compact bars and up to `blur(24px)` for prominent floating sheets.
11. **Adaptive Opacity**: Adjust background alpha between `0.55` and `0.85` depending on underlying background complexity.
12. **High Text Contrast**: Text must never sit directly over unmitigated transparent noise; maintain high WCAG AAA contrast (`#FFFFFF` on dark glass, `#111827` on light glass).
13. **Solid Data Containers**: Keep tables, form inputs, code editors, and analytics charts predominantly solid (`rgba(255, 255, 255, 0.95)` or solid `#FFFFFF`) to preserve absolute data clarity.
14. **No Neon / Excessive Glow**: Avoid neon outlines, saturated rainbow gradients, and heavy fuzzy drop shadows.
15. **Preserved Workstation Layout**: Preserve the desktop layout, pinned 44px navbar, 100vh viewport locks, and two-column grids.
16. **Consistent Typography**: Inter font family, weights (400, 500, 600, 700), and letter-spacing across all glass states.
17. **Subtle Interactive Micro-Transitions**: 150ms ease transitions on hover, focus, and active glass states.
18. **Visual Feedback on Interaction**: Increase glass specular brightness by +5% alpha on hover (`rgba(255,255,255,0.1) → rgba(255,255,255,0.15)`).
19. **Responsive Glass Styling**: Ensure glass elements render consistently across mobile, tablet, and ultra-wide viewports.
20. **Solid-Color Fallbacks**: Always provide solid background fallbacks via `@supports not (backdrop-filter: blur(10px))`:
    ```css
    @supports not (backdrop-filter: blur(10px)) {
      .glass-surface {
        background-color: #FFFFFF !important;
      }
    }
    ```
21. **Accessibility & Reduced Transparency**: Honor user system settings via media queries:
    ```css
    @media (prefers-reduced-transparency: reduce) {
      .glass-surface {
        backdrop-filter: none !important;
        background-color: var(--surface-primary) !important;
      }
    }
    ```
22. **Design Tokens for Glass**: Define tokens for glass materials (`--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-shadow`).
23. **Task-First Clarity**: Glass effects must elevate aesthetic elegance without distracting from rapid job application workflows.
24. **Apple Desktop Elegance**: Maintain the polished, premium feel of macOS Sequoia and visionOS.

---

## 6. Modal Dialogs & Universal Popups Standard (Image 1 Rule)

All modal overlays across the entire application must follow the **Image 1 High-Clarity Opacity Standard**:

```css
/* Universal Overlay Standard: High-clarity opacity, zero hazy blur */
.app-modal-overlay,
.modal-backdrop {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 99999 !important;
  background-color: rgba(23, 26, 24, 0.45) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 24px !important;
  box-sizing: border-box !important;
}

/* Modal Card Container */
.app-modal-card,
.modal-container {
  background-color: #FFFFFF !important;
  border: 1px solid #DDE2DE !important;
  border-radius: 9px !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04) !important;
}

/* Close Control Button */
.app-modal-close-btn,
.themes-modal-close-btn,
.modal-close-btn {
  width: 32px !important;
  height: 32px !important;
  border-radius: 6px !important;
  border: 1px solid #DDE2DE !important;
  background-color: #FFFFFF !important;
  color: #777D79 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: all 150ms ease !important;
}

.app-modal-close-btn:hover,
.themes-modal-close-btn:hover,
.modal-close-btn:hover {
  background-color: #F7F9F8 !important;
  border-color: #B0B8B2 !important;
  color: #171A18 !important;
}
```

---

## 7. Implementation Checklist for Engineers

Before committing any CSS changes to the codebase, verify:

- [ ] **60–30–10 Rule Checked**: Is color used with restraint? Is dominant canvas ~60%, containers ~30%, and accent <=10%?
- [ ] **No Page Scrolling**: Does `document.documentElement.scrollHeight === window.innerHeight`? Are dense views using internal flex-scroll?
- [ ] **Modal Backdrop Standard**: Do all popups use `rgba(23, 26, 24, 0.45)` with `backdrop-filter: none`?
- [ ] **Component Isolation**: Are page-specific styles placed in their respective page CSS file (`ProfileView.css`, `AutomationView.css`, etc.)?
- [ ] **Design Tokens Utilized**: Are variables (`var(--bg-main)`, `var(--border-main)`, `var(--action-primary)`) used instead of arbitrary hardcoded values?
- [ ] **Glass Theme Standards**: When in Glass theme, are primary text and data tables protected from transparency degradation?
