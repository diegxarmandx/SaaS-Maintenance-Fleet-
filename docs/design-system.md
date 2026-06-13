# Design System

FleetReady uses a practical owner-operator SaaS interface: quiet surfaces, strong scanability, clear statuses, and responsive views that work from phone to desktop.

## Tokens

Core visual tokens live in `src/app/globals.css` as CSS variables and Tailwind theme aliases:

- Neutral app background: `--background`
- Primary and primary text: `--primary`, `--primary-foreground`
- Surfaces: `--surface`, `--surface-muted`, `--surface-subtle`
- Borders and focus ring: `--border`, `--ring`
- Status colors: `--success`, `--warning`, `--danger`, `--info`
- Typography: `--app-font-sans`, `--app-font-mono`

Light mode is the maintained experience. Dark mode is not enabled until it can meet the same contrast and QA standard.

## Typography

The app imports `@fontsource-variable/ibm-plex-sans` locally from npm so builds do not depend on runtime remote font fetching. Numeric content uses tabular numerals for easier scanning in meter readings, costs, counts, and tables.

## Status System

Statuses use text and icons, never color alone. Shared badge states include:

- Current
- Due soon
- Expiring soon
- Overdue
- Expired
- Missing
- Archived
- Active
- Past due
- Canceled
- Read-only

Use `StatusBadge` before adding one-off status chips.

## Layout Rules

- Desktop uses a persistent sidebar and sticky header.
- Mobile uses horizontal app navigation below the header.
- Module pages use constrained content, compact page headers, and real filters.
- Desktop tables must have a mobile card/list alternative for owner workflows.
- Cards are for individual information groups, not nested page shells.

## Forms

Forms must include visible labels, inline errors, accessible invalid states, loading states on submit, and confirmation for destructive actions. Number/date/currency/meter fields use the appropriate input mode or input type.

## Accessibility

Current conventions:

- Semantic headings and landmarks.
- Keyboard-visible focus rings.
- Minimum 44px practical touch targets for primary interactive controls.
- Status text plus icons.
- Screen-reader-only labels for icon-only controls.
- Server-rendered empty/error/loading boundaries for owner routes.

## Responsive Notes

Representative widths to check before launch:

- 360px small mobile
- 430px large mobile
- 768px tablet
- 1280px laptop/desktop
- 1536px wide desktop

Critical paths should not require horizontal scrolling on mobile.
