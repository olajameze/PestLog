# Dashboard Enhancements

This update adds new operational and customer analytics components to the `/dashboard` main content area without modifying the sidebar, navigation, or other routes.

## New feature groups

- **TodaySchedule**
  - Shows today’s appointments with status and completion progress.
  - Includes a mock technician location map.
- **ComplianceMonitor**
  - Displays compliance rate trend data over the selected date range.
  - Highlights open corrective actions.
- **ChemicalLog**
  - Displays recent chemical usage with compliance status and stock alerts.
- **UrgentAlerts**
  - Displays urgent callbacks, missed inspections, and overdue compliance tasks.

## Plan-gated analytics

- **Business plan**
  - Access to **Customer Lifetime Value (CLV)** tracking.
- **Enterprise plan**
  - Includes **CLV**, **Retention & Churn** analytics, and **CSAT / NPS** trends.

## UX improvements

- Top priority items are displayed first.
- Analytics components are grouped inside an expandable section.
- Global date-range picker updates all dashboard metrics.
- Refresh button reloads mock data with a loading state.
