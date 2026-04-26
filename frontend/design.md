# ClimateSafe Route — Design System

A single source of truth for the visual language. Read this **before** adding new
components, pages, or styles, and update it when conventions change.

> Dual-theme: every page renders coherently in both **light** and **dark** mode.
> Components are styled with Tailwind + the `dark:` variant; shared tokens live
> in `app/globals.css` as CSS custom properties.

---

## 1. Theme system

### Mechanism

- `lib/theme.tsx` exports `ThemeProvider` + `useTheme()` (`{ theme, toggle, setTheme }`).
- The provider is mounted in [`app/layout.tsx`](app/layout.tsx) around all pages.
- An inline no-flash script (`NO_FLASH_SCRIPT`) runs before React hydrates so the
  correct class is on `<html>` on first paint — no FOUC.
- The theme is persisted in `localStorage` under the key `climatesafe-theme`.
- First-run preference falls back to `prefers-color-scheme`.
- The provider toggles **two markers** on `<html>`:
  - `class="dark"` — used by Tailwind's `dark:` variants (`darkMode: "class"`).
  - `data-theme="light|dark"` — available for raw CSS / future use.

### Theme toggle

`components/ThemeToggle.tsx` is a single 36×36 round button with an animated
sun/moon swap. Place it top-right on every full-page surface. It is already
wired into:

- Landing page nav
- `/app` (search) top bar
- `/map` route panel header

### Adding a new themable surface

1. Use `dark:` Tailwind variants on every color-bearing class:
   `bg-white dark:bg-slate-950`, `text-slate-900 dark:text-slate-50`, etc.
2. If you need shared colors in raw CSS or SVG fills, reference the CSS vars
   defined in `globals.css` (`var(--ink)`, `var(--accent)`, …).
3. Avoid hard-coded `#hex` text or background colors except inside themed
   palette blocks (e.g. the Mapbox style switch in `HeroMap.tsx`).

---

## 2. Color tokens

CSS variables are declared in `app/globals.css`. **Light is `:root`. Dark is
`html.dark`.** Use these when raw CSS / `style={}` / SVG `fill` is needed.

| Token                 | Light       | Dark                 | Use for                                  |
|-----------------------|-------------|----------------------|------------------------------------------|
| `--bg`                | `#f7f9fc`   | `#060a16`            | Page background                          |
| `--surface`           | `#ffffff`   | `#0b1326`            | Card / panel base                        |
| `--surface-elev`      | `#ffffff`   | `#0f1a33`            | Elevated card / popover                  |
| `--ink`               | `#0b1220`   | `#f8fafc`            | Body text                                |
| `--ink-muted`         | `#475569`   | `#cbd5e1`            | Secondary text                           |
| `--ink-subtle`        | `#64748b`   | `#94a3b8`            | Captions, labels                         |
| `--line`              | `#e2e8f0`   | `rgba(255,255,255,0.08)` | Borders                              |
| `--line-soft`         | `#eef2f7`   | `rgba(255,255,255,0.05)` | Dividers                             |
| `--accent`            | `#059669`   | `#34d399`            | Primary CTA, route lines, highlights     |
| `--accent-soft`       | `#10b981`   | `#10b981`            | Glows, secondary accent                  |
| `--shadow`            | soft        | dark soft            | Card box-shadow                          |

### Tailwind palette mapping

When writing Tailwind classes, prefer the slate / emerald scales below — they
match the CSS-var tokens without needing custom theme extensions.

| Role                     | Light                       | Dark                        |
|--------------------------|-----------------------------|-----------------------------|
| Page bg                  | `bg-white`                  | `dark:bg-slate-950`         |
| Surface                  | `bg-white`                  | `dark:bg-slate-900`         |
| Surface elevated         | `bg-slate-50`               | `dark:bg-slate-900/70`      |
| Body text                | `text-slate-900`            | `dark:text-slate-50`        |
| Secondary text           | `text-slate-700`            | `dark:text-slate-200/85`    |
| Muted text               | `text-slate-600`            | `dark:text-slate-400`       |
| Subtle text              | `text-slate-500`            | `dark:text-slate-500`       |
| Border                   | `border-slate-200`          | `dark:border-white/10`      |
| Divider                  | `divide-slate-200`          | `dark:divide-white/5`       |
| Primary CTA bg           | `bg-emerald-600 hover:bg-emerald-700` | `dark:bg-emerald-400 dark:hover:bg-emerald-300` |
| Primary CTA text         | `text-white`                | `dark:text-slate-950`       |
| Accent text              | `text-emerald-600`          | `dark:text-emerald-300`     |
| Accent dot               | `bg-emerald-500`            | `dark:bg-emerald-400`       |

### Status colors (heat / canopy scoring)

Used in `RoutePanel`, `SegmentTooltip`, etc. Always pair light + dark.

| Score level       | Class                                              |
|-------------------|----------------------------------------------------|
| Good (cool/lush)  | `text-emerald-600 dark:text-emerald-400`           |
| Warning           | `text-orange-600 dark:text-orange-400`             |
| Bad (hot/risky)   | `text-rose-600 dark:text-rose-400`                 |

---

## 3. Typography

Three Google fonts loaded in `app/layout.tsx`:

| Family            | CSS var                  | Tailwind utility | Use for                                       |
|-------------------|--------------------------|------------------|-----------------------------------------------|
| Fraunces          | `var(--font-fraunces)`   | `font-display`   | Headlines, marketing copy, large numerics     |
| Inter             | `var(--font-inter)`      | `font-sans`      | Body text, UI labels                          |
| JetBrains Mono    | `var(--font-jetbrains)`  | `font-mono`      | Stats, code-like values, technical labels     |

Display rules:

- Hero headline: `font-display font-light` with italic accent on the emphasized
  word (`<span className="italic text-emerald-600 dark:text-emerald-300">…</span>`).
- Section headings (`h2`/`h3`): `font-display font-light` with `tracking-tight`.
- Body: default `font-sans`. Use `leading-relaxed` for any paragraph longer than
  one line.
- Numerics in stat cards: `font-mono`.
- Eyebrow labels: `text-[11px] uppercase tracking-[0.22em]–tracking-[0.3em]`.

---

## 4. Spacing & layout

- Page horizontal padding: `px-6 md:px-10`.
- Section vertical padding: `py-24 md:py-36` for major sections, `py-20` for
  data strips, `py-16` for compact pages.
- Max content width: `max-w-6xl mx-auto` (general), `max-w-3xl` (long prose),
  `max-w-md` (forms).
- Card radii: `rounded-3xl` (large surfaces), `rounded-2xl` (panels), `rounded-xl`
  (controls / buttons), `rounded-full` (CTAs, dots).
- Standard gap inside vertical stacks: `gap-3` (form fields), `gap-6` (panel
  sections), `gap-10`–`gap-12` (page sections).

---

## 5. Motion

Defined as Tailwind keyframes in `tailwind.config.ts`:

| Utility                   | What it does                                 |
|---------------------------|----------------------------------------------|
| `animate-fade-up`         | 0 → 1 opacity + 24px → 0 translateY (.9s)    |
| `animate-draw-route`      | Draws an SVG path via `stroke-dashoffset`     |
| `animate-draw-route-slow` | Same, slower (4.5s) for the secondary route  |
| `animate-pulse-glow`      | Heat-island bloom pulse                      |
| `animate-marquee`         | Reserved for future ticker / logo strip      |
| `animate-shimmer`         | Skeleton-loader shimmer                      |
| `.dash-flow`              | Flowing dashed overlay on the climate route  |

Stagger hero entrance with explicit `style={{ animationDelay: "120ms" }}`
increments (120, 240, 360, 480 ms).

All animations must be cancelled by `prefers-reduced-motion: reduce` — handled
globally in `globals.css`.

---

## 6. Surfaces & textures

Reusable utility classes in `globals.css`:

- `.topo-lines` — soft topographic radial pattern. Auto-flips light/dark.
  Use as a `-z-10` background on quiet sections.
- `.grain` — adds a subtle film-grain `::after`. **Only renders in dark mode**;
  light mode keeps it crisp.
- `.fade-bottom` — vertical mask fading content into the page background.
  Used on the hero map to blend into the next section.

---

## 7. Mapbox styling

### Basemap selection by theme

Done in two places — both must stay in sync:

| Component               | Light                                  | Dark                                  |
|-------------------------|----------------------------------------|---------------------------------------|
| `components/HeroMap.tsx`| `mapbox://styles/mapbox/light-v11`     | `mapbox://styles/mapbox/dark-v11`     |
| `components/RouteMap.tsx` | `mapbox://styles/mapbox/light-v11`   | `mapbox://styles/mapbox/dark-v11`     |

The components read `useTheme()` and **remount via `key={theme}`** when the
theme changes — simpler than re-syncing `setStyle` and re-adding layers.

### Route line colors

| Route                | Light       | Dark        |
|----------------------|-------------|-------------|
| Shortest             | `#64748b`   | `#94a3b8`   |
| Climate-smart        | `#059669`   | `#34d399`   |

### Mapbox SearchBox text-color fix

The Mapbox `<SearchBox>` web component renders inside its own DOM and the
typed input value can inherit ambient page colors, leaving text invisible.
The fix lives in `components/SearchBar.tsx`:

1. Derive `searchTheme` from the current theme (`colorBackground`, `colorText`,
   etc.) so the variables track light vs. dark.
2. Pass an explicit `cssText` override that sets `color` and `caret-color` on
   the inner `input` element via `:host` CSS variables.
3. A belt-and-braces global fallback exists in `globals.css` targeting
   `mapbox-search-box input`.

If you ever swap the SearchBox library, keep #1 + #2 — they are the actual fix.

---

## 8. Accessibility checklist

Every PR that adds UI should pass these:

- [ ] Light-mode text ≥ 4.5:1 contrast ratio (body) / ≥ 3:1 (large headlines).
- [ ] Dark-mode text ≥ 4.5:1 against the surface it sits on.
- [ ] Focus ring visible on all interactive elements (`focus:ring-2`).
- [ ] All buttons have `aria-label` if they contain only an icon.
- [ ] All form inputs have a `<label>` (visible or `sr-only`).
- [ ] Animations stop under `prefers-reduced-motion: reduce`.
- [ ] Hover and active states for every clickable element.
- [ ] Tested at `375px`, `768px`, `1024px`, `1440px`.

---

## 9. Page-by-page notes

### `/` — Landing
File: [`app/page.tsx`](app/page.tsx).
- Hero: live `HeroMap` (Mapbox 3D) + gradient overlay that flips per theme.
- "How it works": `DualRouteAnimation` SVG + numbered steps.
- Data strip on a slightly elevated surface (`from-slate-50 to-white` /
  `dark:from-[#070d1c] dark:to-[#060a16]`).
- Compare card uses light card-on-card nesting (outer gradient frame, inner
  flat surface) for both themes.

### `/app` — Search
File: [`app/app/page.tsx`](app/app/page.tsx).
- Compact full-screen search panel.
- `SearchBar` is the only client component; it dynamic-imports the Mapbox
  SearchBox and switches its theme variables on theme change.

### `/map` — Routes
Files: [`app/map/page.tsx`](app/map/page.tsx), [`app/map/MapView.tsx`](app/map/MapView.tsx),
[`components/RouteMap.tsx`](components/RouteMap.tsx),
[`components/RoutePanel.tsx`](components/RoutePanel.tsx).
- Two-column layout (map + 380px panel) on desktop, stacked on mobile.
- Map basemap and route colors switch per theme.
- Stats card and tooltip both have light + dark variants.

---

## 10. Don'ts

- ❌ Hardcoded `bg-slate-900` / `text-white` without a `dark:` or `:root`
  counterpart. The page must be readable in both modes.
- ❌ New CSS color hexes inside components — extend the token table here first.
- ❌ Animations without a `prefers-reduced-motion` opt-out.
- ❌ Emojis as icons — use Lucide / inline SVG.
- ❌ Generic AI gradients (purple → pink on white). The brand is emerald +
  slate, with map-aware blues for water and oranges for heat.
