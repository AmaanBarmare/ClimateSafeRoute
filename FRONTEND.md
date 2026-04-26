# FRONTEND.md — ClimateSafe Route

Complete specification for the Next.js frontend. Build exactly what is described here. Do not add features not listed. Do not make UI decisions not covered — refer to this file first.

---

## Design System

### Colors
```
Background:        #0f172a  (slate-900, dark base)
Surface:           #1e293b  (slate-800, cards and panels)
Surface elevated:  #334155  (slate-700, hover states, tooltips)
Border:            #475569  (slate-600)
Text primary:      #f8fafc  (slate-50)
Text secondary:    #94a3b8  (slate-400)
Text muted:        #64748b  (slate-500)

Route A (shortest): #94a3b8  (slate-400, gray)
Route B (climate):  #22c55e  (green-500)

Heat high:         #ef4444  (red-500)
Heat medium:       #f97316  (orange-500)
Heat low:          #22c55e  (green-500)

Accent:            #3b82f6  (blue-500, buttons and focus rings)
```

The app is dark-mode only. Do not implement a light mode toggle.

### Typography
```
Font family: Inter (import from Google Fonts)
Heading 1:   32px, weight 700
Heading 2:   20px, weight 600
Heading 3:   16px, weight 600
Body:        14px, weight 400
Label:       12px, weight 500, uppercase, letter-spacing 0.05em
Mono:        13px, font-family JetBrains Mono (for coordinates and scores)
```

### Spacing
Follow Tailwind's default spacing scale. Base unit is 4px. Use multiples of 4 consistently — do not use arbitrary pixel values.

### Border radius
- Cards and panels: `rounded-xl` (12px)
- Buttons: `rounded-lg` (8px)
- Badges and pills: `rounded-full`
- Input fields: `rounded-lg` (8px)

---

## Page Structure

```
app/
├── layout.tsx         Global layout: font imports, metadata, dark bg
├── page.tsx           Landing/search page
└── map/
    └── page.tsx       Map results page (receives query params)
```

### app/layout.tsx

Sets up:
- `<html lang="en" className="dark">`
- Inter font via `next/font/google`
- Global metadata: title "ClimateSafe Route", description "Navigate NYC away from heat islands and flood zones"
- Background color `bg-slate-900` on `<body>`
- No navbar — the app is single-purpose, no nav needed

### app/page.tsx — Landing Page

Layout: full viewport height, centered content, dark background with a subtle NYC skyline SVG or gradient at the bottom (optional, skip if complex).

Structure:
```
<main> full height flex col center
  <section> hero
    <h1> "Route smarter. Stay cooler."
    <p> one-line description
    <SearchBar />           ← the main interactive element
    <p class="text-muted"> example: "Try: Central Park to DUMBO"
```

The page has no other content. It is intentionally minimal. When the user submits the search form, navigate to `/map?origin=...&destination=...` using `useRouter().push()`.

### app/map/page.tsx — Map Results Page

This is a Server Component that reads `origin` and `destination` from `searchParams`, fetches the route from FastAPI, and passes the result to client components.

Layout: two-column on desktop, stacked on mobile.

```
<div> full viewport height flex
  <RouteMap />             ← left/main: takes up remaining width, full height
  <RoutePanel />           ← right: fixed 380px wide panel, scrollable
```

On mobile (< 768px): map takes full height, panel slides up as a bottom sheet with a drag handle. The bottom sheet is 40% of viewport height by default and can be dragged up to 70%.

If the API returns an error, show a full-page error state with the error message and a "Try again" button that navigates back to `/`.

---

## Components

### SearchBar.tsx

**Location:** `components/SearchBar.tsx`

**Props:** none (manages its own state, uses `useRouter`)

**Behavior:**
- Two text inputs: "From" and "To"
- A submit button labeled "Find safe route"
- Inputs have placeholder text: "Enter starting point" and "Enter destination"
- On submit: validate both fields are non-empty, then call `router.push('/map?origin=...&destination=...')`
- Show inline validation error if either field is empty on submit
- Loading state on button while navigating

**Styling:**
- Container: `bg-slate-800 rounded-xl p-4 flex flex-col gap-3 w-full max-w-md`
- Each input: `bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500`
- Button: `bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg py-3 transition-colors`
- Add a small location pin icon (from lucide-react) inside each input on the left

**Do not implement autocomplete.** Plain text inputs only.

---

### RouteMap.tsx

**Location:** `components/RouteMap.tsx`

**Props:**
```typescript
interface RouteMapProps {
  routeShortest: RouteData | null
  routeClimate: RouteData | null
  showShortest: boolean
  showClimate: boolean
  originCoords: [number, number]      // [lng, lat]
  destinationCoords: [number, number] // [lng, lat]
}
```

**This is a Client Component** — add `'use client'` at the top.

**Mapbox setup:**
- Use `react-map-gl` version 7+
- Map style: `mapbox://styles/mapbox/dark-v11`
- Initial viewport: NYC center `{ longitude: -74.006, latitude: 40.7128, zoom: 12 }`
- On route data load, fit bounds to show both routes using `map.fitBounds()` with 80px padding on all sides

**Layers (in order, bottom to top):**
1. Route A (shortest) — `LineLayer`, paint: `line-color: #94a3b8`, `line-width: 4`, `line-opacity: 0.8`. Only visible when `showShortest` is true.
2. Route B (climate) — `LineLayer`, paint: `line-color: #22c55e`, `line-width: 4`, `line-opacity: 0.9`, `line-dasharray: [2, 1]`. Only visible when `showClimate` is true.
3. Origin marker — custom `Marker` component, green circle with a white dot center, size 14px
4. Destination marker — custom `Marker` component, red circle with a white dot center, size 14px

**Hover interaction:**
- On `onMouseEnter` for each route layer, show `<SegmentTooltip>` at cursor position
- The tooltip displays the segment's heat score, flood score, and canopy percentage
- Highlight the hovered segment by increasing `line-width` to 6 on hover
- On `onMouseLeave`, hide tooltip and reset width

**Loading state:**
- While `routeShortest` and `routeClimate` are null, show a pulsing `bg-slate-700 animate-pulse` overlay on top of the map with text "Computing your routes..."

---

### RouteLayer.tsx

**Location:** `components/RouteLayer.tsx`

**Props:**
```typescript
interface RouteLayerProps {
  id: string              // 'route-shortest' or 'route-climate'
  geojson: GeoJSON.Feature
  color: string
  dashed?: boolean
  visible: boolean
  onHover: (feature: GeoJSON.Feature | null) => void
}
```

Wraps `react-map-gl`'s `Source` and `Layer` components. Handles hover callbacks. This component does not render anything visible itself — it adds layers to the Mapbox canvas.

---

### RoutePanel.tsx

**Location:** `components/RoutePanel.tsx`

**Props:**
```typescript
interface RoutePanelProps {
  routeShortest: RouteStats | null
  routeClimate: RouteStats | null
  explanation: string | null
  isLoading: boolean
  showShortest: boolean
  showClimate: boolean
  onToggleShortest: () => void
  onToggleClimate: () => void
}
```

**Layout:**
```
<aside> 380px wide, full height, bg-slate-800, overflow-y-auto, flex flex-col gap-6 p-6

  <header>
    <h2> "Your Routes"
    <a href="/"> ← New search  (small, text-slate-400)

  <section> "Standard route"
    <ToggleSwitch> (controls showShortest)
    <RouteStatsCard route={routeShortest} color="slate" />

  <section> "Climate-smart route"
    <ToggleSwitch> (controls showClimate)
    <RouteStatsCard route={routeClimate} color="green" />

  <section> "Why the difference?"
    <p> {explanation} text in italic, text-slate-300
    (if loading: show 3-line skeleton)

  <footer>
    <p class="text-xs text-slate-500">
      Data: NYC Open Data, FEMA. Climate scores updated annually.
```

**RouteStatsCard (inline sub-component inside RoutePanel):**

Displays stats for one route. Shows:
- Distance (in km, one decimal place) and estimated walking time (in minutes)
- Three stat rows with icons:
  - 🌡 Heat score: number/100, color-coded (≤40 green, 41–70 orange, >70 red)
  - 💧 Flood risk: number/100, same color coding
  - 🌳 Tree canopy: percentage, inverse color coding (≥30% green, 15–29% orange, <15% red)

When `isLoading` is true, replace all stat values with `animate-pulse` skeleton bars.

---

### SegmentTooltip.tsx

**Location:** `components/SegmentTooltip.tsx`

**Props:**
```typescript
interface SegmentTooltipProps {
  x: number
  y: number
  heatScore: number
  floodScore: number
  canopyPct: number
  visible: boolean
}
```

Absolutely positioned tooltip that follows the cursor. Styled as:
- `bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-sm`
- Pointer events none (does not interfere with hover)
- Three rows: Heat, Flood, Canopy — each with a color-coded value
- Appears/disappears with `opacity` transition, not `display:none`, for smoothness

---

### ToggleSwitch.tsx

**Location:** `components/ToggleSwitch.tsx`

**Props:**
```typescript
interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label: string
  color?: 'slate' | 'green'   // matches route color
}
```

A standard toggle switch. When `color='green'`, the active track is `bg-green-500`. When `color='slate'`, it's `bg-slate-400`. Label appears to the right of the switch.

---

## State Management

No external state library (no Zustand, no Redux). Use React `useState` and `useCallback` in `app/map/page.tsx` for:

```typescript
const [showShortest, setShowShortest] = useState(true)
const [showClimate, setShowClimate] = useState(true)
const [hoveredFeature, setHoveredFeature] = useState<GeoJSON.Feature | null>(null)
```

Route data is fetched server-side in the Server Component and passed as props. No client-side data fetching for the route itself.

---

## API Client

**Location:** `lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function fetchRoute(origin: string, destination: string): Promise<RouteResponse> {
  const res = await fetch(`${API_URL}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.detail ?? 'Failed to compute route')
  }
  return res.json()
}
```

---

## TypeScript Types

**Location:** `lib/types.ts`

```typescript
export interface RouteStats {
  geojson: GeoJSON.Feature<GeoJSON.LineString>
  distance_m: number
  duration_min: number
  heat_score: number        // 0–100
  flood_score: number       // 0–100
  canopy_pct: number        // 0–100
}

export interface RouteResponse {
  route_shortest: RouteStats
  route_climate: RouteStats
  explanation: string
  origin_coords: [number, number]       // [lng, lat]
  destination_coords: [number, number]  // [lng, lat]
}

export type RouteData = RouteStats
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "18.x",
    "react-dom": "18.x",
    "react-map-gl": "^7.1.x",
    "mapbox-gl": "^3.x",
    "lucide-react": "^0.400.x",
    "@types/geojson": "^7946.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x"
  }
}
```

---

## Responsive Breakpoints

| Screen | Map | Panel |
|---|---|---|
| Desktop (≥1024px) | Fills remaining width, full height | 380px fixed right, full height |
| Tablet (768–1023px) | Full width, 60vh height | Full width, scrollable below map |
| Mobile (<768px) | Full width, full height | Bottom sheet, 40vh default, draggable to 70vh |

Implement the bottom sheet using a simple `translate-y` transition controlled by a drag gesture — do not use a third-party bottom sheet library.

---

## Performance Requirements

- Mapbox GL JS must be dynamically imported (`next/dynamic`) with `ssr: false` since it requires `window`
- The map component must not render during SSR at all
- Route data is fetched in the Server Component — no loading spinner for initial route data on page load
- Only the toggle state and hover tooltip are client-side interactive

---

## Error States

| Scenario | UI behavior |
|---|---|
| Address not found | Full-page error: "We couldn't find that address. Try adding 'New York, NY' to be more specific." + back button |
| No route found | Full-page error: "No pedestrian route found between these two points." + back button |
| API unreachable | Full-page error: "Something went wrong. Please try again." + back button |
| Both toggles off | Subtle prompt in panel: "Turn on at least one route to see it on the map" |
