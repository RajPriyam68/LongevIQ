import type { ReportFinding } from '@longeviq/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportFindingFlagLabel, reportFindingFlagTone } from '@/lib/reports-format';
import { cn } from '@/lib/utils';

interface ReportFindingsProps {
  findings: ReportFinding[];
  parsedText: string | null;
  processingError: string | null;
}

const FLAG_CLASSES: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  destructive: 'bg-red-500/10 text-red-600',
};

function formatFindingValue(finding: ReportFinding): string {
  return finding.unit ? `${finding.value} ${finding.unit}` : finding.value;
}

export function ReportFindings({ findings, parsedText, processingError }: ReportFindingsProps) {
  if (processingError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            We could not extract structured results from this report: {processingError}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The file is still stored securely. You can download it at any time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {findings.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Findings</CardTitle>
            <span className="text-xs text-muted-foreground">
              {findings.length} result{findings.length === 1 ? '' : 's'}
            </span>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Test</th>
                  <th className="pb-2 pr-4 font-medium">Value</th>
                  <th className="pb-2 pr-4 font-medium">Reference range</th>
                  <th className="pb-2 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => (
                  <tr key={finding.id} className="border-b last:border-0">
                    <td className="max-w-[14rem] py-2 pr-4 font-medium" title={finding.name}>
                      {finding.name}
                    </td>
                    <td className="py-2 pr-4">{formatFindingValue(finding)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {finding.referenceRange ?? '—'}
                    </td>
                    <td className="py-2">
                      {finding.flag ? (
                        <Badge className={cn(FLAG_CLASSES[reportFindingFlagTone(finding.flag)])}>
                          {reportFindingFlagLabel(finding.flag)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {parsedText ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted text</CardTitle>
          </CardHeader>
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Show raw text extracted from this report
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-4 font-mono text-xs leading-relaxed">
                {parsedText}
              </pre>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
