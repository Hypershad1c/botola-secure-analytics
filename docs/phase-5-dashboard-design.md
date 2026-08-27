# Phase 5 Frontend Dashboard Design

## Experience direction

The dashboard uses a dark operations-console visual language with a restrained teal signal color, amber ranking accent, blue Elo accent, and violet methodology accent. The layout is deliberately data-dense but not CRUD-like: a fixed workspace rail, a compact command header, a season query control, summary metrics, a competitive table, signal bars, and player intelligence cards.

## Information hierarchy

1. The season command center establishes context and data provenance.
2. The season ID control explicitly connects the UI to the protected analytics API.
3. Summary cards provide only values returned by the API; empty or unavailable values render as `—`.
4. The competitive table prioritizes points, goal difference, form, matches, and Elo.
5. Performance signals show attack index and momentum without implying unavailable certainty.
6. Player cards expose performance score and per-90 metrics without inventing names or values when only IDs are available.

## Integration behavior

The client data hook calls the season and player endpoints concurrently, aborts stale requests, exposes loading/error/empty states, and preserves request metadata. It never calculates standings locally. API errors show the stable error code and request ID so an operator can correlate the browser message with server logs.

## Responsive behavior

At desktop widths, the dashboard uses a fixed 244px navigation rail and a two-column content grid. At medium widths, summary cards become a two-column grid, signals collapse into a single content column, and player cards become two columns. At mobile widths, the rail becomes a horizontal navigation strip, the command header simplifies, the hero and season form stack, tables remain horizontally scrollable, and player cards become one column.

The CSS honors `prefers-reduced-motion`, preserves visible focus rings through native controls, and avoids relying on color alone for form results because each result is also labeled with `W`, `D`, or `L`.

## Data integrity rule

The dashboard is not a demo-data surface. With no season selected it shows a setup state. With a protected API failure it shows an authentication or service error. With an empty result it explains that no completed validated records were returned. This prevents the UI from presenting fabricated football statistics merely to appear complete.
