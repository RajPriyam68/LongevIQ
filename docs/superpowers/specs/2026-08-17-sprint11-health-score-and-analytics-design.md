# Sprint 11 — Health Score & Analytics (Design)

Date: 2026-08-17

## Summary

LongevIQ Sprint 11 adds a deterministic, offline **health score** and
**analytics** layer on top of the existing `HealthMetric` data. No new data
model, no third-party service, and no LLM calls: everything is computed on
demand from the user's own metric readings. All output is educational and the
standard medical disclaimer applies.

## Scope

1. `GET /analytics/summary?days=30` — per-metric analytics for a lookback window.
2. `GET /analytics/score` — composite 0-100 health score with per-metric
   sub-scores.
3. `GET /analytics/insights?days=30` — bounded, deterministic rule-based
   insights.
4. A protected `/analytics` web page with a score gauge, per-metric cards,
   sparklines, and an insights list.

Out of scope: persisted score history, doctor/admin surfaces, AI-generated
interpretation, and new metric types.

## API

New `analytics` module under `apps/api/src/modules/analytics/`, mounted at
`/api/v1/analytics` behind `requireAuth`, following the Sprint 8-10 route
(route -> controller -> service) pattern. The service depends on the existing
`MetricsRepository` interface (no new repository).

### Query validation

`analyticsQuerySchema` (shared): `{ days: coerce.int 1..365 default 30 }`.
Invalid `days` -> `400 VALIDATION_ERROR`.

### GET /analytics/summary

Response data:

```json
{
  "summary": {
    "windowDays": 30,
    "generatedAt": "ISO-8601",
    "metrics": [
      {
        "type": "SLEEP_HOURS",
        "label": "Sleep",
        "unit": "hours",
        "count": 12,
        "min": 6.0,
        "max": 8.5,
        "average": 7.1,
        "latest": 7.5,
        "previous": 7.0,
        "delta": 0.5,
        "direction": "up",
        "status": "normal",
        "recommendedRange": { "min": 7, "max": 9, "unit": "hours" },
        "series": [{ "recordedAt": "ISO-8601", "value": 7.5, "valueSecondary": null }]
      }
    ]
  }
}
```

- `series` is ascending by `recordedAt` (used for charting).
- `direction` is `up` / `down` / `stable` (stable when delta magnitude is
  within 1% of the latest value, or delta is 0).
- `status` is `normal` / `high` / `low` / `unknown` and is computed from the
  window average against the metric's recommended range.
- Metrics with no readings in the window still appear with `count: 0` and
  `series: []`.

### GET /analytics/score

Response data:

```json
{
  "score": {
    "overall": 82,
    "label": "Good",
    "coverage": { "scored": 5, "total": 7 },
    "components": [
      {
        "type": "SLEEP_HOURS",
        "label": "Sleep",
        "unit": "hours",
        "score": 90,
        "status": "normal",
        "weight": 1,
        "readings": 12
      }
    ]
  }
}
```

- Component sub-scores use the **latest reading** (all-time) mapped to 0-100
  against standard reference ranges via `scoreValueForMetric` (piecewise linear;
  100 inside the ideal band, 0 at the extreme thresholds).
- Scored metric types and reference bands (educational, standard ranges):

  | Metric            | Ideal band        | Zero at       |
  | ----------------- | ----------------- | ------------- |
  | Blood pressure    | 90-120 (systolic) | <=70 / >=180  |
  | Heart rate        | 55-90 bpm         | <=30 / >=160  |
  | Blood glucose     | 70-99 mg/dL       | <=40 / >=300  |
  | BMI               | 18.5-24.9         | <=14 / >=40   |
  | Sleep             | 7-9 hours         | <=3 / >=16    |
  | Steps             | >=7500 (one-sided) | 0 at 0       |
  | Body temperature  | 36.1-37.2 C       | <=35 / >=41   |

- **Weight is not scored** (no universal healthy range) but is included in
  summary analytics.
- `overall` is the rounded equal-weighted mean of scored components. If no
  component is scored, `overall` is `null`, `label` is `Insufficient data`, and
  `components` is empty.
- Score labels: `>=85` Excellent, `>=70` Good, `>=50` Fair, else Needs attention.

### GET /analytics/insights

Response data:

```json
{
  "insights": {
    "windowDays": 30,
    "generatedAt": "ISO-8601",
    "items": [
      {
        "severity": "warning",
        "title": "Sleep below recommended range",
        "message": "Your average sleep (6.4 hours) is below the recommended 7-9 hours.",
        "metricType": "SLEEP_HOURS"
      }
    ]
  }
}
```

Deterministic rules (bounded, at most ~12 items, all educational):
- Average outside the recommended range -> warning.
- Meaningful trend (>=2 readings, delta >= 5% of latest) -> info (up/down).
- No data for any metric -> info prompt to start logging.
- Few tracked types (< 3 scored types) -> info prompt to add more variety.
- Otherwise no item for that metric.

## Shared contracts

New files in `packages/shared/src`:
- `types/analytics.ts` — `MetricPoint`, `RecommendedRange`, `MetricDirection`,
  `MetricStatus`, `MetricAnalytics`, `HealthScoreComponent`, `HealthScoreResult`,
  `AnalyticsSummary`, `AnalyticsInsight`, `AnalyticsInsights`,
  `AnalyticsInsightSeverity`, `SCORED_METRIC_TYPES`,
  `ANALYTICS_DEFAULT_DAYS`, `ANALYTICS_MAX_DAYS`, `recommendedRangeFor`,
  `scoreValueForMetric`, `healthScoreLabel`, labels for status/direction.
- `validators/analytics.ts` — `analyticsQuerySchema`.
- `index.ts` — export both.

## Web UI

- New protected page `apps/web/src/app/analytics/page.tsx` (client component,
  TanStack Query, `RequireAuth`).
- `apps/web/src/components/analytics/`:
  - `score-gauge.tsx` — SVG ring gauge + label + coverage note.
  - `score-components.tsx` — per-metric sub-score progress bars.
  - `metric-analytics-card.tsx` — status badge, average/min/max, delta chip,
    recommended-range bar, Recharts sparkline.
  - `analytics-insights.tsx` — severity-styled insights list.
- `apps/web/src/lib/analytics-api.ts` — typed client (`apiGetAnalyticsSummary`,
  `apiGetHealthScore`, `apiGetAnalyticsInsights`).
- `apps/web/src/lib/analytics-format.ts` (+ `analytics-format.spec.ts`) —
  score label, status/direction labels, value formatting.
- Add an "Analytics" link to the site header navigation.

## Error handling

- Owner-scoped: all endpoints read only `req.user.id`; there is no cross-user
  surface (returns no foreign data, matching the 404-isolation pattern).
- Invalid query -> `400 VALIDATION_ERROR` via `validateQuery`.

## Security & privacy

- No PHI beyond the user's own metric readings; nothing is stored or logged by
  this module. Analytics are read-only and are not audit-logged (consistent
  with other read surfaces such as the dashboard overview).
- No new environment variables, no new dependencies, no audio/external calls.

## Testing

- API unit `apps/api/tests/analytics.service.spec.ts` — score math (each band,
  edge thresholds, insufficient data), summary stats (min/max/avg/delta/
  direction/status/series ordering), insights rules, using
  `FakeMetricsRepository`.
- API integration `apps/api/tests/integration/analytics.integration.spec.ts` —
  401 without auth, invalid `days` -> 400, summary/score/insights shapes,
  data isolation between users.
- Web unit `analytics-format.spec.ts` — label/formatting helpers.

## Docs

Update `README.md` (Sprint 11 section, roadmap mark done, test counts),
`docs/API.md` (analytics endpoints), `docs/SECURITY.md` (analytics threat
model note), `docs/FOLDER_STRUCTURE.md` (Sprint 11 structure), and
`docs/ENVIRONMENT.md` (no new env vars).

## Verification

Lint, typecheck, tests, `format:check`, monorepo build, then start the dev
server and confirm the preview at localhost:3000. Commit as
`feat: sprint 11 - health score and analytics`. Do not push.
