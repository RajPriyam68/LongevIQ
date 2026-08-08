'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Download, Eye, Loader2, Trash2 } from 'lucide-react';
import type { MedicalReport } from '@longeviq/shared';
import { apiDeleteReport, apiDownloadReport } from '@/lib/reports-api';
import { isApiClientError } from '@/lib/api-client';
import {
  formatFileSize,
  reportCategoryLabel,
  reportStatusLabel,
  reportStatusTone,
} from '@/lib/reports-format';
import { formatDate } from '@/lib/metrics-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ReportListProps {
  reports: MedicalReport[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onDeleted: () => Promise<void> | void;
}

const TONE_CLASSES: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  destructive: 'bg-red-500/10 text-red-600',
};

async function triggerDownload(report: MedicalReport): Promise<void> {
  const blob = await apiDownloadReport(report.id);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ReportList({
  reports,
  page,
  totalPages,
  total,
  onPageChange,
  onDeleted,
}: ReportListProps) {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteReport(id),
    onSuccess: async () => {
      toast.success('Report deleted.');
      await onDeleted();
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to delete the report.');
    },
  });

  const handleDownload = async (report: MedicalReport) => {
    setDownloadingId(report.id);
    try {
      await triggerDownload(report);
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to download the report.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No reports yet. Upload your first medical report to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Reports</CardTitle>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Title</th>
              <th className="pb-2 pr-4 font-medium">Category</th>
              <th className="pb-2 pr-4 font-medium">Report date</th>
              <th className="pb-2 pr-4 font-medium">Size</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b last:border-0">
                <td className="max-w-[16rem] truncate py-2 pr-4 font-medium" title={report.title}>
                  {report.title}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {reportCategoryLabel(report.category)}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{formatDate(report.reportDate)}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatFileSize(report.fileSizeBytes)}
                </td>
                <td className="py-2 pr-4">
                  <Badge className={cn(TONE_CLASSES[reportStatusTone(report.status)])}>
                    {reportStatusLabel(report.status)}
                  </Badge>
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm" aria-label={`View ${report.title}`}>
                      <a href={`/reports/${report.id}`}>
                        <Eye className="size-4" aria-hidden="true" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Download ${report.title}`}
                      onClick={() => handleDownload(report)}
                      disabled={downloadingId === report.id}
                    >
                      {downloadingId === report.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${report.title}`}
                      onClick={() => deleteMutation.mutate(report.id)}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === report.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
