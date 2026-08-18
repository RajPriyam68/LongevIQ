'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, HeartPulse } from 'lucide-react';
import { UserRole, metricStatusForValue } from '@longeviq/shared';
import {
  apiDoctorListConnections,
  apiDoctorPatientAnalytics,
  apiDoctorPatientMetrics,
  apiDoctorPatientOverview,
  apiDoctorPatientReports,
} from '@/lib/doctor-api';
import { RequireRole } from '@/components/auth/require-role';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { AnalyticsInsights } from '@/components/analytics/analytics-insights';
import { MetricAnalyticsCard } from '@/components/analytics/metric-analytics-card';
import { ScoreComponents } from '@/components/analytics/score-components';
import { ScoreGauge } from '@/components/analytics/score-gauge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ReportFindings } from '@/components/reports/report-findings';
import {
  formatDate,
  formatDateTime,
  formatMetricValue,
  metricTypeLabel,
} from '@/lib/metrics-format';
import { formatPersonName } from '@/lib/doctor-format';
import { reportCategoryLabel } from '@/lib/reports-format';
import { statusLabel } from '@/lib/analytics-format';

type PatientTab = 'overview' | 'metrics' | 'reports' | 'analytics';

const TABS: Array<{ value: PatientTab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'metrics', label: 'Metrics' },
  { value: 'reports', label: 'Reports' },
  { value: 'analytics', label: 'Analytics' },
];

export default function DoctorPatientPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const [activeTab, setActiveTab] = React.useState<PatientTab>('overview');
  const [analyticsDays, setAnalyticsDays] = React.useState(30);

  const connectionsQuery = useQuery({
    queryKey: ['doctor-connections'],
    queryFn: () => apiDoctorListConnections(),
  });

  const overviewQuery = useQuery({
    queryKey: ['doctor-patient-overview', patientId],
    queryFn: () => apiDoctorPatientOverview(patientId),
    enabled: activeTab === 'overview',
  });

  const metricsQuery = useQuery({
    queryKey: ['doctor-patient-metrics', patientId],
    queryFn: () => apiDoctorPatientMetrics(patientId, { limit: 100 }),
    enabled: activeTab === 'metrics',
  });

  const reportsQuery = useQuery({
    queryKey: ['doctor-patient-reports', patientId],
    queryFn: () => apiDoctorPatientReports(patientId),
    enabled: activeTab === 'reports',
  });

  const analyticsQuery = useQuery({
    queryKey: ['doctor-patient-analytics', patientId, analyticsDays],
    queryFn: () => apiDoctorPatientAnalytics(patientId, analyticsDays),
    enabled: activeTab === 'analytics',
  });

  const overview = overviewQuery.data?.overview;
  const metrics = metricsQuery.data?.metrics;
  const reports = reportsQuery.data?.reports;
  const analytics = analyticsQuery.data?.analytics;

  const connection = connectionsQuery.data?.connections.find(
    (item) => item.patient.id === patientId,
  );
  const patientName = connection ? formatPersonName(connection.patient) : 'Patient';

  return (
    <RequireRole roles={[UserRole.DOCTOR]}>
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to patient list">
              <Link href="/doctor">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">{patientName}</h1>
              <p className="text-sm text-muted-foreground">
                Read-only health snapshot shared with you by this patient.
              </p>
            </div>
          </div>
        </div>

        <div role="tablist" className="flex flex-wrap gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.value}
              aria-controls={`patient-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={[
                'rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' ? (
          <div id="patient-overview" role="tabpanel" className="space-y-6">
            {overviewQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28" />
                ))}
              </div>
            ) : overview ? (
              <OverviewCards overview={overview} />
            ) : (
              <p className="text-sm text-muted-foreground">No health data shared yet.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'metrics' ? (
          <div id="patient-metrics" role="tabpanel" className="space-y-4">
            {metricsQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : metrics && metrics.items.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Value</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.items.map((metric) => (
                          <tr key={metric.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">
                              {metricTypeLabel(metric.type)}
                            </td>
                            <td className="px-4 py-3">{formatMetricValue(metric)}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {statusLabel(metricStatusForValue(metric.type, metric.value))}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDateTime(metric.recordedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <HeartPulse className="size-5" aria-hidden="true" />
                  No health metrics shared yet.
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {activeTab === 'reports' ? (
          <div id="patient-reports" role="tabpanel" className="space-y-4">
            {reportsQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : reports && reports.items.length > 0 ? (
              reports.items.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                        <CardTitle className="text-base">{report.title}</CardTitle>
                      </div>
                      <Badge variant="outline">{reportCategoryLabel(report.category)}</Badge>
                    </div>
                    <CardDescription>
                      Report date {formatDate(report.reportDate)} · {report.fileName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReportFindings
                      findings={report.findings}
                      parsedText={null}
                      processingError={null}
                    />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <FileText className="size-5" aria-hidden="true" />
                  No AI-generated reports shared yet.
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {activeTab === 'analytics' ? (
          <div id="patient-analytics" role="tabpanel" className="space-y-6">
            {analyticsQuery.isLoading ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-72" />
                <div className="space-y-4 lg:col-span-2">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-40" />
                </div>
              </div>
            ) : analytics ? (
              <>
                <div className="flex items-center justify-end gap-2">
                  {[7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      variant={analyticsDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnalyticsDays(days)}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6">
                    <ScoreGauge score={analytics.score} />
                    <ScoreComponents score={analytics.score} />
                  </div>
                  <div className="space-y-4 lg:col-span-2">
                    {analytics.summary.metrics.map((section) => (
                      <MetricAnalyticsCard key={section.type} analytics={section} />
                    ))}
                    <AnalyticsInsights insights={analytics.insights.items} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No analytics available yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </RequireRole>
  );
}
