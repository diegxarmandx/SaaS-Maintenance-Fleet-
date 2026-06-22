# Industrial Trust Design System

Maintly uses the Industrial Trust visual system: deep navy structure, teal actions, quiet white work surfaces, strong scanability, explicit statuses, and responsive views built for small fleet owners.

## Tokens

Core visual tokens live in `src/app/globals.css` as CSS variables and Tailwind theme aliases:

- App background: `#F8FAFC` through `--background`
- Deep navy structure: `#0F172A` through `--navy`
- Teal primary action: `#0F766E` through `--primary`
- Primary and primary text: `--primary`, `--primary-foreground`
- Surfaces: `--surface`, `--surface-muted`, `--surface-subtle`
- Borders and focus ring: `--border`, `--ring`
- Status colors: `--success`, `--warning`, `--danger`, `--info`
- Card and elevated shadows: `--shadow-card`, `--shadow-elevated`
- Typography: `--app-font-sans`, `--app-font-mono`

Light mode is the maintained experience. Dark mode is not enabled until it can meet the same contrast and QA standard.

## Typography

The app imports `@fontsource-variable/ibm-plex-sans` locally from npm so builds do not depend on runtime remote font fetching. Numeric content uses tabular numerals for easier scanning in meter readings, costs, counts, and tables.

## Status System

Statuses use text and icons, never color alone. Shared badge states include:

- Green: Current, Active, Completed, Ready, Paid, Healthy
- Amber: Due soon, Expiring soon, Needs attention, Pending, Missing
- Red: Overdue, Expired, Out of service, Failed, Unpaid, Past due
- Blue: Scheduled, In progress, Draft, Info, Read-only
- Neutral slate: Archived, Canceled

Use `StatusBadge` before adding one-off status chips.

## Layout Rules

- Desktop uses a deep navy persistent sidebar and a compact sticky white header.
- Mobile uses horizontal app navigation below the header.
- Module pages use constrained content, compact page headers, and real filters.
- Desktop tables must have a mobile card/list alternative for owner workflows.
- Cards are for individual information groups, not nested page shells.
- Most application cards use an 8px radius, a `#E2E8F0` border, and the shared restrained card shadow.
- Landing-page media uses the generated fleet-yard photograph at `public/images/fleetready-industrial-yard.png`.

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
