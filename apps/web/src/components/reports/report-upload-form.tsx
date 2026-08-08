'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { FileUp, Loader2, UploadCloud, X } from 'lucide-react';
import { z } from 'zod';
import { REPORT_CATEGORY_VALUES, type ReportCategory } from '@longeviq/shared';
import { apiCreateReport } from '@/lib/reports-api';
import { isApiClientError } from '@/lib/api-client';
import { REPORT_UPLOAD_ACCEPT, REPORT_UPLOAD_MAX_BYTES } from '@/lib/constants';
import { reportCategoryLabel } from '@/lib/reports-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const uploadReportSchema = z.object({
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

type FormValues = z.infer<typeof uploadReportSchema>;

interface ReportUploadFormProps {
  onCreated: () => Promise<void> | void;
}

export function ReportUploadForm({ onCreated }: ReportUploadFormProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: { title: '', source: '', category: 'GENERAL', notes: '' },
  });

  const selectFile = React.useCallback((selected: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > REPORT_UPLOAD_MAX_BYTES) {
      toast.error('The selected file exceeds the 10 MB limit.');
      return;
    }
    setFile(selected);
  }, []);

  const onSubmit = async (values: FormValues) => {
    if (!file) {
      toast.error('Choose a PDF, PNG, or JPEG file to upload.');
      return;
    }
    try {
      await apiCreateReport(file, {
        title: values.title,
        reportDate: values.reportDate,
        category: values.category as ReportCategory,
        ...(values.source?.trim() ? { source: values.source.trim() } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      });
      toast.success('Report uploaded.');
      setFile(null);
      reset();
      await onCreated();
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to upload the report.');
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <FileUp className="size-4" aria-hidden="true" />
        Upload report
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload a medical report</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="report-file">File</Label>
            <label
              htmlFor="report-file"
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFile(event.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
              )}
            >
              {file ? (
                <>
                  <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">
                    Drag and drop or <span className="font-medium text-primary">browse</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, PNG, or JPEG — up to 10 MB
                  </span>
                </>
              )}
            </label>
            <Input
              id="report-file"
              type="file"
              accept={REPORT_UPLOAD_ACCEPT}
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={() => setFile(null)}
              >
                <X className="size-3.5" aria-hidden="true" />
                Remove file
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-title">Title</Label>
              <Input
                id="report-title"
                placeholder="Annual bloodwork"
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
              <Label htmlFor="report-date">Report date</Label>
              <Input
                id="report-date"
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
              <Label htmlFor="report-source">Source (clinic or lab)</Label>
              <Input
                id="report-source"
                placeholder="Central Lab"
                aria-invalid={Boolean(errors.source)}
                {...register('source')}
              />
              {errors.source ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.source.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-category">Category</Label>
              <select
                id="report-category"
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
            <Label htmlFor="report-notes">Notes</Label>
            <Input
              id="report-notes"
              placeholder="Optional note"
              aria-invalid={Boolean(errors.notes)}
              {...register('notes')}
            />
            {errors.notes ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Uploading…
                </>
              ) : (
                <>
                  <FileUp className="size-4" aria-hidden="true" />
                  Upload report
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setFile(null);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
