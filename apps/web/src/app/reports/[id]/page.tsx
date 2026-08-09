'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { REPORT_CATEGORY_VALUES, type ReportCategory } from '@longeviq/shared';
import {
  apiDeleteReport,
  apiDownloadReport,
  apiGetReport,
  apiUpdateReport,
} from '@/lib/reports-api';
import { isApiClientError } from '@/lib/api-client';
import { formatDate } from '@/lib/metrics-format';
import {
  formatFileSize,
  reportCategoryLabel,
  reportStatusLabel,
  reportStatusTone,
} from '@/lib/reports-format';
import { RequireAuth } from '@/components/auth/require-auth';
import { ReportFindings } from '@/components/reports/report-findings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const editReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(120, 'Title must be at most 120 characters.'),
  reportDate: z.string().min(1, 'Report date is required.'),
  source: z.string().trim().max(100, 'Source must be at most 100 characters.').optional(),
  category: z.enum(REPORT_CATEGORY_VALUES),
  notes: z.string().trim().max(500, 'Notes must be at most 500 characters.').optional(),
});

type EditFormValues = z.infer<typeof editReportSchema>;

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

const TONE_CLASSES: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  destructive: 'bg-red-500/10 text-red-600',
};

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const queryClient = useQueryClient();

  const reportQuery = useQuery({
    queryKey: ['reports', reportId],
    queryFn: () => apiGetReport(reportId),
  });

  const report = reportQuery.data?.report;
  const [downloading, setDownloading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editReportSchema),
    values: report
      ? {
          title: report.title,
          reportDate: toDateInputValue(report.reportDate),
          source: report.source ?? '',
          category: report.category,
          notes: report.notes ?? '',
        }
      : undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteReport(reportId),
    onSuccess: () => {
      toast.success('Report deleted.');
      router.replace('/reports');
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to delete the report.');
    },
  });

  const onDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const blob = await apiDownloadReport(report.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = report.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to download the report.');
    } finally {
      setDownloading(false);
    }
  };

  const onUpdate = async (values: EditFormValues) => {
    try {
      await apiUpdateReport(reportId, {
        title: values.title,
        reportDate: new Date(`${values.reportDate}T00:00:00.000Z`).toISOString(),
        category: values.category as ReportCategory,
        ...(values.source?.trim() ? { source: values.source.trim() } : { source: null }),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : { notes: null }),
      });
      toast.success('Report updated.');
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to update the report.');
    }
  };

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <a href="/reports">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to reports
            </a>
          </Button>
        </div>

        {reportQuery.isLoading ? (
          <Skeleton className="h-64" />
        ) : reportQuery.isError || !report ? (
          <p className="text-sm text-destructive">Unable to load this report.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{report.title}</h1>
                  <Badge className={cn(TONE_CLASSES[reportStatusTone(report.status)])}>
                    {reportStatusLabel(report.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reportCategoryLabel(report.category)}
                  {report.source ? ` · ${report.source}` : ''} · {formatDate(report.reportDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={onDownload} disabled={downloading} className="gap-2">
                  {downloading ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="size-4" aria-hidden="true" />
                  )}
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="gap-2 text-destructive"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">File</span>
                  <span className="font-medium">{report.fileName}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{formatFileSize(report.fileSizeBytes)}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span className="font-medium">{formatDate(report.createdAt)}</span>
                </div>
                {report.parsedAt ? (
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Parsed</span>
                    <span className="font-medium">{formatDate(report.parsedAt)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="max-w-[60%] text-right font-medium">{report.notes ?? '—'}</span>
                </div>
              </CardContent>
            </Card>

            <ReportFindings
              findings={report.findings}
              parsedText={report.parsedText}
              processingError={report.processingError}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edit details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onUpdate)} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        aria-invalid={Boolean(errors.title)}
                        {...register('title')}
                      />
                      {errors.title ? (
                        <p className="text-sm text-destructive" role="alert">
                          {errors.title.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-date">Report date</Label>
                      <Input
                        id="edit-date"
                        type="date"
                        aria-invalid={Boolean(errors.reportDate)}
                        {...register('reportDate')}
                      />
                      {errors.reportDate ? (
                        <p className="text-sm text-destructive" role="alert">
                          {errors.reportDate.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-source">Source</Label>
                      <Input
                        id="edit-source"
                        aria-invalid={Boolean(errors.source)}
                        {...register('source')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category</Label>
                      <select
                        id="edit-category"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        {...register('category')}
                      >
                        {REPORT_CATEGORY_VALUES.map((category) => (
                          <option key={category} value={category}>
                            {reportCategoryLabel(category)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Input
                      id="edit-notes"
                      aria-invalid={Boolean(errors.notes)}
                      {...register('notes')}
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden="true" />
                        Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Separator />
            <p className="text-xs text-muted-foreground">
              Files are stored securely and are only accessible to you. Extracted results and raw
              text are produced automatically on upload.
            </p>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
