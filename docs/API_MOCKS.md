# API Mocks

Mock data functions are implemented in `lib/api/mockDashboardData.ts`.

## Exported types

- `DashboardDateRangeOption` — `'7' | '30' | '90'`
- `Appointment` — today schedule appointment details.
- `TechnicianLocation` — technician location coordinates for the mock map.
- `CompliancePoint` — compliance trend point.
- `ComplianceAction` — open corrective action details.
- `ChemicalUsage` — chemical usage row data.
- `UrgentAlert` — urgent alert cards.
- `CustomerValue` — CLV and CAC values with trend points.
- `RetentionData` — retention rate and cancellation reason counts.
- `CSATData` — satisfaction score, NPS, and trend points.
- `DashboardData` — full dashboard payload.

## fetchDashboardData(range)

Returns mock dashboard metrics for the selected date range.

- `range: DashboardDateRangeOption`
- Includes today schedule, compliance trend, chemical log, urgent alerts, CLV, retention, and CSAT.
- Uses a short delay to simulate a real data fetch.
