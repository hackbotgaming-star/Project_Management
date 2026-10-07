---
name: Academic Nexus
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system establishes an ultra-refined, high-velocity engineering and academic management environment. Crafted for collegiate research teams, capstone cohorts, and ambitious student builders, the interface rejects the clumsy, antiquated paradigms of legacy higher-education portals in favor of the hyper-focused, keyboard-centric precision seen in best-in-class developer platforms. 

The emotional tone balances academic authority with the kinetic momentum of modern product teams: focused, intentional, dense without friction, and intellectually empowering. 

The aesthetic is a hybrid of Modern Technical Minimalism and Crisp Layered Precision:
- **Tonal Structure:** Strict surface layering replaces muddy drop shadows. Depth is communicated via deliberate value separation, hairline borders, and subtle contrast changes.
- **Data Density:** High-utility canvas layout prioritizing typography hierarchies, structured meta tags, and instant scannability for multi-repository tasks, deliverables, and peer reviews.
- **Kinetic Polish:** Precise micro-interactions, subtle outline illuminations on focus states, and zero-latency layout transitions.

## Colors

The system uses a calibrated dual-theme token structure. The dark mode is not an inverted afterthought, nor is the light mode an uncalibrated pure white; both provide deliberate optical weight and contrast.

### Light Mode Surfaces
- **Canvas Base:** `#f8fafc` (Cool off-white canvas)
- **Surface Layer 1 (Cards, Sidebars):** `#ffffff` (Pure white elevated container)
- **Surface Layer 2 (Nested panels, Table headers):** `#f1f5f9` (Subtle cool gray)
- **Borders & Dividers:** `#e2e8f0` (Subtle hairline slate)
- **Border Strong / Hover:** `#cbd5e1`
- **Text Primary:** `#0f172a` (Deep slate charcoal)
- **Text Secondary:** `#475569` (Muted slate)
- **Text Tertiary:** `#94a3b8` (Subtle metadata)

### Dark Mode Surfaces
- **Canvas Base:** `#090d16` (Deep interstellar obsidian)
- **Surface Layer 1 (Cards, Panels):** `#0d1322` (Deep navy slate)
- **Surface Layer 2 (Elevated modules, Popovers):** `#131b2e` (Rich twilight slate)
- **Borders & Dividers:** `#1e293b` (Subtle blue-gray border)
- **Border Strong / Hover:** `#334155`
- **Text Primary:** `#f8fafc` (Crisp near-white)
- **Text Secondary:** `#94a3b8` (Balanced cool slate)
- **Text Tertiary:** `#64748b` (Low-emphasis meta)

### Accent & Functional Semantics
- **Primary Electric Indigo:** `#4f46e5` (Light mode) / `#6366f1` (Dark mode illumination)
- **Secondary Luminous Cyan:** `#06b6d4` (Light mode) / `#22d3ee` (Dark mode milestones and telemetry)
- **Tertiary Mint Success:** `#10b981` (Completed sprints, approvals)
- **Warning Amber:** `#f59e0b` (Upcoming deadlines, blocking dependencies)
- **Critical Crimson:** `#ef4444` (Overdue deliverables, failed CI/build checks)

## Typography

Typography prioritizes technical legibility, scannable hierarchies, and high information throughput:
- **Headlines & Structural Labels:** Handled by **Geist**, a geometric, high-precision sans-serif engineered for technical density. Tight negative letter spacing is applied to large headlines to preserve architectural tightness.
- **Body & Longform Descriptions:** Driven by **Inter**, chosen for its tall x-height, clear optical counters, and frictionless legibility during extensive academic reading, grading feedback, and documentation reviews.
- **Tabular Data & Keybinds:** Numerical data, commit hashes, milestone dates, and keyboard accelerators use Geist's tabular numeric features (`tnum`) to eliminate optical layout shift across list updates.

## Layout & Spacing

The layout model is anchored to a strict **8px base grid** with 4px sub-grid allowances for atomic micro-components (chips, badges, compact table cells).

### Grid Structure
- **Desktop (≥ 1280px):** 12-column adaptive fluid grid with `1.5rem` (24px) gutters and a fixed collapsible sidebar (`260px` expanded, `64px` iconized). Content canvas caps at `1440px` maximum width for structured views, or stretches edge-to-edge for multi-column Kanban workflows.
- **Tablet (768px – 1279px):** 8-column layout with `1rem` (16px) gutters and auto-collapsing sidebar into an off-canvas drawer.
- **Mobile (< 768px):** 4-column single-stack flow with `1rem` edge margins and sticky bottom utility navigation for project context switching.

### Rhythmic Rules
- **Component Padding:** Standard cards use `space-xl` (24px) on desktop, scaling down to `space-lg` (16px) on mobile viewports.
- **Form Groups & Field Gaps:** Uniformly spaced using `space-md` (12px) vertical offsets, maintaining tight relationships between descriptive labels and corresponding input surfaces.
- **List and Table Density:** Row items adhere strictly to 40px (compact) or 48px (standard) heights with `space-sm` (8px) internal padding.

## Elevation & Depth

This design system avoids exaggerated, blurry drop shadows that wash out dark mode or feel muddy in light mode. Depth is structured through structural containment, low-contrast hairline borders, and targeted light refraction:

### Tonal Hierarchy
- **Canvas Base (Level 0):** `#f8fafc` (Light) / `#090d16` (Dark). The non-interactive background.
- **Base Surface (Level 1):** `#ffffff` (Light) / `#0d1322` (Dark). Standard project cards, kanban backdrops, content containers. Border: `1px solid var(--border-subtle)`.
- **Raised Interactive (Level 2):** `#ffffff` (Light) / `#131b2e` (Dark). Modals, flyouts, contextual menus, tooltips. Border: `1px solid var(--border-strong)`.
- **Sunken / Well (Level -1):** `#f1f5f9` (Light) / `#05080f` (Dark). Search filter strips, code snippets, embedded terminal displays.

### Ambient Shadows & Outer Glows
- **Subtle Surface Elevation (Light Mode):** `0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Floating Modals (Light Mode):** `0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Floating Modals (Dark Mode):** `0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)`.
- **Focus & Selection Illumination:** Active interactive items generate an electric perimeter glow: `0 0 0 2px var(--canvas-bg), 0 0 0 4px rgba(79, 70, 229, 0.4)`.

## Shapes

The geometric framework is calibrated to modern engineering tools: neither harsh nor overly playful. A roundedness index of `2` dictates a default **8px (`0.5rem`)** base radius:

- **Cards & Primary Modules:** `12px` to `16px` (`rounded-lg` / `rounded-xl`) for main project workspaces, analytics viewports, and timeline panels.
- **Interactive Controls (Inputs, Buttons, Selects):** `8px` (`0.5rem`) to maintain precision and compact spatial footprints.
- **Tags, Micro-Chips, Status Indicators:** `6px` (`0.375rem`) for compact tags or full pill shapes (`9999px`) reserved specifically for live connectivity status and avatar enclosures.
- **Dividers & Hairlines:** Crisp `1px` lines across all themes without dashed or decorative variants.

## Components

### Buttons
- **Primary:** Solid electric indigo background (`#4f46e5` light / `#6366f1` dark), pure white text, 8px radius, height: 36px (default) or 32px (compact). Micro-hover: brightness boost (`+5%`) and subtle 1px translate lift.
- **Secondary / Outline:** Background transparent, border: `1px solid var(--border-subtle)`, text: `var(--text-primary)`. Hover: `var(--surface-layer-2)`.
- **Ghost:** Borderless, zero fill; transitions to subtle background wash on hover. Used for auxiliary menu actions and pagination arrows.
- **Destructive:** Light crimson background wash with deep red text in light mode; subtle red outline with bright crimson text in dark mode.

### Cards & Workspaces
- Constructed using Level 1 surfaces with a `1px` stroke border.
- Hoverable task and repository cards feature an intentional border transition from `--border-subtle` to `--border-strong` accompanied by a micro-glow accent on the left or top border indicator.
- Header, body, and footer segments are separated by hairline borders rather than arbitrary white space gaps.

### Status Indicators & Badges
- All project and build statuses pair an explicit semantic badge with an SVG icon or pulsing indicator dot for maximum accessibility:
  - **In Progress:** Indigo/Cyan tint badge, rotating arc icon.
  - **Blocked / Critical:** Crimson tint badge, octagonal stop icon.
  - **Review Ready:** Amber tint badge, double-check icon.
  - **Completed:** Emerald tint badge, solid check icon.
- Badges use 11px uppercase Geist typography with `0.02em` tracking and `space-xs` padding.

### Form Inputs & Filters
- **Input Fields:** 36px height, 8px radius. Inset neutral background (`#ffffff` light / `#090d16` dark) with `1px` subtle border. 
- **Focus State:** Hairline border turns to primary accent with a clean, low-spread ambient glow ring.
- **Shortcut Integration:** Search bars and action inputs feature right-aligned inline keyboard tokens (e.g., `⌘K`) rendered in mono-styled muted labels.

### Checkboxes & Radios
- Square 16px boxes with `4px` radius for checkboxes; 16px circular enclosures for radios.
- Unchecked: `1px` border against surface background.
- Checked: Electric indigo fill featuring a centered high-contrast white checkmark or center pin.

### Academic-Specific Modules
- **Sprint / Milestone Progress Bar:** Segmented 6px height tracks displaying graded, submitted, and overdue deliverables with distinct semantic colors.
- **Peer Review Callout:** High-density side pane supporting line-by-line file annotation, grading rubric rubrics, and dynamic score calculation chips.
- **Theme Switcher:** Compact segmented control or keyboard-activated toggle seamlessly interpolating color variables across root CSS definitions.