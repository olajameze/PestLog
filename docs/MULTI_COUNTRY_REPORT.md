# Multi-Country Technician Logbook Report

This document describes how the technician logbook report page localizes date/time/currency formatting and labels for supported countries.

## Scope

- Localization is applied to the report experience at `/reports` (`pages/reports.tsx`).
- Existing report logic, APIs, and database schema are unchanged in this phase.
- Country detection is browser-based in this phase (no persisted `profiles.country` override).

## Detection Flow

1. Read browser locale preferences from `navigator.languages` and `navigator.language`.
2. Read browser timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. Resolve country and locale via `lib/i18n/config.ts`.
4. Load locale message dictionary and formatting profile via `lib/hooks/useLocale.ts`.

Primary signal is browser language preference, with timezone and region fallback handling.

## Supported Countries and Formatting

| Country Group | Locale | Date | Time | Currency |
| --- | --- | --- | --- | --- |
| USA | `en-US` | `MM/DD/YYYY` | 12-hour | `USD` |
| Canada | `en-CA` | `YYYY-MM-DD` | 12-hour | `CAD` |
| France | `fr-FR` | `DD/MM/YYYY` | 24-hour | `EUR` |
| Germany | `de-DE` | `DD/MM/YYYY` | 24-hour | `EUR` |
| Spain | `es-ES` | `DD/MM/YYYY` | 24-hour | `EUR` |
| Italy | `it-IT` | `DD/MM/YYYY` | 24-hour | `EUR` |
| India | `en-IN` | `DD/MM/YYYY` | 12-hour | `INR` |
| Other EU | `en-GB` | `DD/MM/YYYY` | 24-hour | `EUR` |
| Fallback | `en-GB` | `DD/MM/YYYY` | 24-hour | `GBP` |

## Files Involved

- `lib/i18n/config.ts`: country/locale/currency/date/time mapping and region resolution.
- `lib/hooks/useLocale.ts`: runtime locale detection + formatter/message accessors.
- `lib/date-utils.ts`: locale-aware date/time/currency formatting helpers.
- `messages/*.json`: report page labels per locale.
- `pages/reports.tsx`: report rendering using localization helpers.

## Timezone Behavior

- Report timestamps are stored in UTC and rendered in the user's resolved local timezone.
- Time output includes timezone abbreviation or short timezone label (for example, `EST`, `IST`, or `GMT+5:30` depending on runtime locale data).

## Compliance Notice Banner

A static informational notice is shown in the report area:

- US: `FIFRA requires 2-year record retention`
- CA: `Keep records for permit audits`
- IN: `Maintain records as per local pest control regulations`
- EU/GB fallback: `GDPR-compliant audit trail`

## Adding Another Country

1. Add a new country mapping in `lib/i18n/config.ts`.
2. Add/extend locale dictionary in `messages/`.
3. Ensure detection rules can resolve the new country from locale/region.
4. Add a Playwright test case in `tests/multi-country-report.spec.ts`.

## Tests

- `tests/multi-country-report.spec.ts` verifies:
  - US format (`MM/DD/YYYY`, 12-hour, USD)
  - FR format (`DD/MM/YYYY`, 24-hour, EUR)
  - IN format (`DD/MM/YYYY`, 12-hour, INR)
  - CA format (`YYYY-MM-DD`, CAD)
  - UTC to local timezone conversion behavior

