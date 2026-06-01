import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { importService, type ImportEntity, type ImportValidationResult, type ParsedImportRow } from "@/services/importService";
import type { AgencyImportRow, CarImportRow } from "@/types";

type ImportWizardModalProps = {
  entity: ImportEntity;
  open: boolean;
  onClose: () => void;
  onImported: (successCount: number, failedCount: number) => Promise<void> | void;
};

type Step = 1 | 2 | 3 | 4;

export function ImportWizardModal({ entity, open, onClose, onImported }: ImportWizardModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [validation, setValidation] = useState<ImportValidationResult<AgencyImportRow> | ImportValidationResult<CarImportRow> | null>(null);
  const [importResult, setImportResult] = useState<{ failedRows: { rowNumber: number; reason: string }[]; successCount: number } | null>(null);

  const entityLabel = entity === "agencies" ? "agencies" : "cars";
  const acceptedFileTypes = ".xlsx,.xls,.csv";

  function reset() {
    setStep(1);
    setFileName(null);
    setLoading(false);
    setParseError(null);
    setParsedRows([]);
    setValidation(null);
    setImportResult(null);
  }

  async function handleFileSelection(file: File | null) {
    if (!file) return;

    setLoading(true);
    setParseError(null);

    try {
      const parsed = await importService.parseFile(file, entity);
      const nextValidation =
        entity === "agencies"
          ? await importService.validateAgencyRows(parsed.rows, parsed.columns)
          : await importService.validateCarRows(parsed.rows, parsed.columns);

      setFileName(file.name);
      setParsedRows(parsed.rows);
      setValidation(nextValidation);
      setStep(2);
    } catch (error) {
      console.error("[import-wizard] file parse failed", error);
      setParseError(error instanceof Error ? error.message : "Unable to parse this file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!validation) return;

    setLoading(true);
    try {
      const result =
        entity === "agencies"
          ? await importService.importAgencyRows(validation as never)
          : await importService.importCarRows(validation as never);

      setImportResult(result);
      setStep(4);
      await onImported(result.successCount, result.failedRows.length);
    } catch (error) {
      console.error("[import-wizard] import failed", error);
      setParseError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  const previewColumns = useMemo(() => {
    return validation?.columns ?? [];
  }, [validation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-6xl overflow-hidden">
        <CardHeader className="border-b border-border bg-slate-50/80">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Import {entityLabel} from Excel</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Step {step} of 4: {step === 1 ? "Upload file" : step === 2 ? "Preview data" : step === 3 ? "Validate rows" : "Import result"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded-2xl border border-border bg-white p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="rounded-[28px] border border-dashed border-border bg-slate-50/80 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">Upload an Excel or CSV file</h3>
                <p className="mt-2 text-sm text-muted-foreground">Accepted formats: `.xlsx`, `.xls`, `.csv`</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Choose file
                    <Input
                      type="file"
                      accept={acceptedFileTypes}
                      className="hidden"
                      onChange={(event) => void handleFileSelection(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Button variant="outline" onClick={() => importService.downloadTemplate(entity)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download template
                  </Button>
                </div>
                {loading ? <p className="mt-4 text-sm text-muted-foreground">Parsing file…</p> : null}
                {parseError ? <p className="mt-4 text-sm text-rose-600">{parseError}</p> : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{fileName}</p>
                  <p className="text-sm text-muted-foreground">{parsedRows.length} parsed rows ready for preview.</p>
                </div>
                <Button onClick={() => setStep(3)}>Continue to validation</Button>
              </div>
              <PreviewTable columns={previewColumns} rows={parsedRows} />
            </div>
          ) : null}

          {step === 3 && validation ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Rows parsed" value={String(validation.rows.length)} />
                <MetricCard label="Ready to import" value={String(validation.validRows.length)} />
                <MetricCard label="Rows with errors" value={String(validation.rows.length - validation.validRows.length)} tone="warning" />
              </div>
              <ValidationTable rows={validation.rows} />
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back to preview
                </Button>
                <Button disabled={!validation.validRows.length || loading} onClick={() => void handleImport()}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Import valid rows
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 && importResult ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard label="Imported successfully" value={String(importResult.successCount)} tone="success" />
                <MetricCard label="Failed rows" value={String(importResult.failedRows.length)} tone={importResult.failedRows.length ? "warning" : "default"} />
              </div>
              {importResult.failedRows.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Some rows could not be imported.</p>
                  <div className="mt-3 space-y-2">
                    {importResult.failedRows.map((failed) => (
                      <div key={`${failed.rowNumber}-${failed.reason}`}>
                        Row {failed.rowNumber}: {failed.reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  All valid rows were imported successfully.
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "success" | "warning";
  value: string;
}) {
  const icon =
    tone === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    ) : tone === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-amber-600" />
    ) : (
      <FileSpreadsheet className="h-4 w-4 text-primary" />
    );

  return (
    <div className="rounded-2xl border border-border bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: ParsedImportRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Row</th>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-left font-semibold text-slate-900">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {rows.slice(0, 50).map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                {columns.map((column) => (
                  <td key={`${row.rowNumber}-${column}`} className="px-4 py-3 text-slate-700">
                    {row[column] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValidationTable({ rows }: { rows: Array<{ rowNumber: number; errors: string[] }> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Row</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {rows.map((row) => (
              <tr key={row.rowNumber}>
                <td className="px-4 py-3 text-muted-foreground">{row.rowNumber}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.errors.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {row.errors.length ? "Needs attention" : "Ready"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.errors.length ? row.errors.join(" ") : "No validation errors."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
