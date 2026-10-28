# CSS Architecture & Design System Specification
**Resume Porter — Enterprise Desktop SaaS UI/UX Engineering Standard**

---

## 1. Executive Summary & Architectural Purpose

This document establishes the authoritative CSS architecture, color theory, modular file organization, 2-theme mechanics (Default & Minimal), and universal contrast standards for the **Resume Porter** application. 

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
│       ├── theme-default.css    # Swiss Minimalist standard (Modern SaaS)
│       └── theme-minimal.css    # Monochrome editorial high-contrast (Zero-Color)
│
└── components/
    ├── JobDiscoveryEngine.css   # 1. Explorer Screen (Radar & hardware accelerated stream)
    ├── GenerationView.css       # 2. Generation Screen (15-row table & split document preview)
    ├── AutomationView.css       # 3. Automation Screen (Pipeline manager & live console terminal)
    ├── ProfileView.css          # 4. Job Profile Screen (2-column sidebar & internal form scroll)
    ├── AnalyticsView.css        # 5. Analytics Screen (30-day timeline chart & KPI grid)
    ├── ToolsView.css            # 6. Tools Screen (4x2 desktop matrix & quick action cards)
    └── UniversalModal.css       # 7. Settings & Unified Modal system (MCP protocol, AI keys, Profile)
```

### 3.2 Master CSS Architecture & Linking Rules

1. **Tokens Before Components**: `colors.css` and `typography.css` must load before any component or layout styles.
2. **Page Styles Do Not Style Globals**: `ProfileView.css` or `AnalyticsView.css` must never target raw `body`, `button`, or universal HTML tags without component-scoped classes (e.g. `.profile-container button.profile-nav-btn`).
3. **Master Reusability**: Reusable elements (`.btn-primary-olive`, `.app-modal-overlay`, `.app-modal-card`, `.setup-banner-card`) reside in central foundations and are linked via `index.css` or `App.css`.

---

## 4. Dual Mode & Streamlined Two-Theme Specification

The application strictly supports **2 Curated Themes** across **2 Color Modes** (Light and Dark):

```
                        ┌───────────────────┐
                        │ Color Mode Switch │
                        └─────────┬─────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
           [ Light Mode ]                    [ Dark Mode ]
                 │                                 │
                 ├── [ Default Theme ] ────────────┤
                 │                                 │
                 └── [ Minimal Theme ] ────────────┘
```

### 4.1 Theme Breakdown

| Theme | Visual Personality | Canvas (60%) | Containers (30%) | Accent (10%) | Motion / Animations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Default** | Swiss Minimalist / Modern SaaS | `#F7F9F8` Off-white / `#121614` Dark | `#FFFFFF` with `#DDE2DE` / `#181E1B` with `#28312B` | `#2563EB` Cobalt Blue / `#2D5A27` Deep Forest Olive | Standard subtle hover (120–150ms) |
| **2. Minimal** | Achromatic Editorial High-Contrast | Pure `#FFFFFF` Light / Pure `#09090B` Dark | `#FAFAFA` Light / `#121214` Dark (1px `#E4E4E7` / `#27272A`) | Pure High-Contrast Inverted Solid (`#09090B` in Light, `#FAFAFA` in Dark) | Zero decorative animations |

---

## 5. Decommissioning of Glass & Difference Themes & Universal Contrast Guarantees

### 5.1 Rationale for Eliminating Glass & Difference Themes
To guarantee enterprise reliability and uncompromising legibility across all workstation modules, **Glass** and **Difference** themes have been permanently removed from the system:
1. **Glass Theme**: Frosted backdrop-filters, ambient animated blur orbs, and translucent acrylic surfaces caused unacceptable cross-browser contrast degradation, GPU compositing overhead, and text illegibility over complex data tables.
2. **Difference Theme**: Per-page color tints and inverted difference blends fought with universal component tokens, creating inconsistent states and maintenance friction.
3. **Streamlined 2-Theme System**: Standardizing on **Default** and **Minimal** ensures 100% predictable, high-contrast, WCAG AAA-compliant readability across every view.

### 5.2 Universal Form Input & Button Contrast Standards
All form elements and action controls implement tokenized contrast rules:
1. **Inputs, Textareas, and Selects**:
   - Universal rule in `index.css`: `background-color: var(--rp-secondary-surface)` and `color: var(--rp-text-dominant)`.
   - Explicit placeholder styling: `color: var(--rp-text-muted)` at `0.75` opacity.
   - Dropdown options (`select option`): Explicitly inherit dark surface and dominant text colors, preventing white-on-white browser defaults in dark mode.
2. **Action Buttons**:
   - Primary action buttons (`.btn-primary-olive`, `.btn-apply-action`, `.btn-apply-blue`, `.modal-apply-btn`, `.auth-submit-btn`, `.btn-save-changes`, `.table-btn-primary`) utilize `--rp-accent-contrast` and inverted solid backgrounds (`#FAFAFA` on `#09090B` in Minimal Dark Mode).
   - Outline buttons (`.btn-clear-outline`, `.table-btn-outline`, `.btn-modal-cancel`) adapt their borders and hover fills to ensure crisp visibility against both light and dark container surfaces.
3. **Zero Dead Footprints**:
   - All `theme-glass.css`, `theme-difference.css`, and ambient background orb DOM nodes have been purged from the build.

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
- [ ] **Dual-Theme Contrast Standards**: When in Default or Minimal theme (Light or Dark), do form inputs, selects, and action buttons pass WCAG AAA contrast?
