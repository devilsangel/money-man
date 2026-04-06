import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { accountsApi } from "../api/accounts.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { Select } from "../components/Select.js";

interface PreviewResult {
  filename: string;
  total_rows: number;
  headers: string[];
  preview: Record<string, string>[];
  detected: {
    date?: string;
    amount?: string;
    payee?: string;
    debit?: string;
    credit?: string;
  };
  amount_format: "signed" | "debit_credit";
}

type Step = 1 | 2 | 3;

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Upload" },
    { n: 2, label: "Map Columns" },
    { n: 3, label: "Confirm" },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, idx) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold transition-colors ${
              current > s.n
                ? "bg-system-green text-white"
                : current === s.n
                  ? "bg-system-blue text-white"
                  : "bg-sys-fill text-sys-label-secondary"
            }`}
          >
            {current > s.n ? <Check size={14} /> : s.n}
          </div>
          <span
            className={`text-subheadline ${current === s.n ? "text-sys-label font-medium" : "text-sys-label-secondary"}`}
          >
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <ChevronRight size={16} className="text-sys-label-tertiary mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

export function ImportPage() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [amountFormat, setAmountFormat] = useState<"signed" | "debit_credit">("signed");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  const handleFileSelect = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/v1/import/csv/preview", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const data: PreviewResult = await res.json();
      setPreview(data);
      setAmountFormat(data.amount_format);

      // Pre-fill detected mappings
      setMapping({
        date: data.detected.date ?? "",
        amount: data.detected.amount ?? "",
        payee: data.detected.payee ?? "",
        notes: "",
      });

      setStep(2);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !preview || !accountId) return;
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("account_id", accountId);
      fd.append("mapping", JSON.stringify(mapping));
      fd.append("amount_format", amountFormat);

      if (amountFormat === "debit_credit") {
        if (mapping.debit_column) fd.append("debit_column", mapping.debit_column);
        if (mapping.credit_column) fd.append("credit_column", mapping.credit_column);
      }

      const res = await fetch("/api/v1/import/csv/confirm", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Import failed");
      }

      const result: { imported: number; skipped: number } = await res.json();
      setStep(3);
      toast.success(`Imported ${result.imported} transactions${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setAccountId("");
    setMapping({});
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-title-1 text-sys-label">Import CSV</h2>

      <StepIndicator current={step} />

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <h3 className="text-headline text-sys-label mb-4">Upload your bank CSV</h3>

          <div
            className={`border-2 border-dashed rounded-card p-10 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-system-blue bg-system-blue/5"
                : "border-sys-separator hover:border-system-blue/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-3 text-sys-label-secondary" />
            {file ? (
              <div>
                <p className="text-headline text-sys-label">{file.name}</p>
                <p className="text-footnote text-sys-label-secondary mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-body text-sys-label">
                  Drop your CSV file here, or{" "}
                  <span className="text-system-blue">click to browse</span>
                </p>
                <p className="text-footnote text-sys-label-secondary mt-1">
                  Supports exports from most banks
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              disabled={!file || loading}
              onClick={handleUpload}
            >
              {loading ? "Processing…" : "Next"}
              {!loading && <ChevronRight size={16} />}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Map columns */}
      {step === 2 && preview && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-headline text-sys-label mb-1">Map CSV Columns</h3>
            <p className="text-footnote text-sys-label-secondary mb-4">
              {preview.filename} · {preview.total_rows} rows detected
            </p>

            {/* Account selector */}
            <Select
              label="Import into account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— select account —</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>

            {/* Amount format */}
            <div className="mt-4">
              <Select
                label="Amount format"
                value={amountFormat}
                onChange={(e) => setAmountFormat(e.target.value as "signed" | "debit_credit")}
              >
                <option value="signed">Single amount column (positive = income, negative = expense)</option>
                <option value="debit_credit">Separate debit / credit columns</option>
              </Select>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Select
                label="Date column"
                value={mapping.date ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, date: e.target.value }))}
              >
                <option value="">— select —</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </Select>

              {amountFormat === "signed" ? (
                <Select
                  label="Amount column"
                  value={mapping.amount ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, amount: e.target.value }))}
                >
                  <option value="">— select —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </Select>
              ) : (
                <>
                  <Select
                    label="Debit (withdrawal) column"
                    value={mapping.debit_column ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, debit_column: e.target.value }))}
                  >
                    <option value="">— select —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                  <Select
                    label="Credit (deposit) column"
                    value={mapping.credit_column ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, credit_column: e.target.value }))}
                  >
                    <option value="">— select —</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                </>
              )}

              <Select
                label="Payee / Description column (optional)"
                value={mapping.payee ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, payee: e.target.value }))}
              >
                <option value="">— none —</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </Select>

              <Select
                label="Notes column (optional)"
                value={mapping.notes ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, notes: e.target.value }))}
              >
                <option value="">— none —</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </Select>
            </div>
          </Card>

          {/* Preview table */}
          <Card>
            <h3 className="text-headline text-sys-label mb-3">
              Preview (first {preview.preview.length} rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-sys-separator">
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-caption font-medium text-sys-label-secondary whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sys-separator">
                  {preview.preview.map((row, idx) => (
                    <tr key={idx}>
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="py-2 pr-4 text-caption text-sys-label whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis"
                        >
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={
                !accountId ||
                !mapping.date ||
                (amountFormat === "signed" ? !mapping.amount : !mapping.debit_column && !mapping.credit_column) ||
                loading
              }
              onClick={handleConfirm}
            >
              {loading ? "Importing…" : `Import ${preview.total_rows} Transactions`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card className="text-center py-10">
          <div className="w-16 h-16 rounded-full bg-system-green/15 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-system-green" />
          </div>
          <h3 className="text-title-2 text-sys-label mb-2">Import complete!</h3>
          <p className="text-body text-sys-label-secondary mb-6">
            Your transactions have been added successfully.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={reset}>
              Import another file
            </Button>
            <Button variant="primary" onClick={() => window.location.assign("/transactions")}>
              View Transactions
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
