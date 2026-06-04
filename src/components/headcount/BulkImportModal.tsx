import { useState, useRef } from "react";
import { adminQuery } from "@/lib/adminQuery";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const HEADCOUNT_FIELDS = [
  { key: "full_name", label: "Full Name", required: true },
  { key: "status", label: "Status" },
  { key: "id_iqama_number", label: "ID / Iqama Number" },
  { key: "email", label: "Email" },
  { key: "job_title", label: "Job Title" },
  { key: "joining_date", label: "Joining Date" },
  { key: "reports_to", label: "Reports To" },
  { key: "department", label: "Department" },
  { key: "tier", label: "Tier" },
  { key: "nationality", label: "Nationality" },
  { key: "phone", label: "Phone" },
];

interface Props {
  sessionToken: string;
  onClose: () => void;
  onImported: () => void;
}

export default function BulkImportModal({ sessionToken, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "preview" | "result">("upload");
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; skipped: number; errors: string[] }>({ inserted: 0, updated: 0, skipped: 0, errors: [] });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (json.length === 0) { toast.error("No data found"); return; }
        const hdrs = Object.keys(json[0] as any);
        setHeaders(hdrs);
        setRawData(json);
        // Auto-map
        const autoMap: Record<string, string> = {};
        HEADCOUNT_FIELDS.forEach(f => {
          const match = hdrs.find(h => h.toLowerCase().replace(/[\s_/]/g, "") === f.label.toLowerCase().replace(/[\s_/]/g, ""));
          if (match) autoMap[f.key] = match;
        });
        setMapping(autoMap);
        setStep("map");
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!mapping.full_name) { toast.error("Full Name mapping is required"); return; }
    setImporting(true);
    let inserted = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const mapped: Record<string, any> = {};
      HEADCOUNT_FIELDS.forEach(f => {
        if (mapping[f.key]) mapped[f.key] = String(row[mapping[f.key]] || "").trim();
      });
      if (!mapped.full_name) { skipped++; errors.push(`Row ${i + 2}: Missing full name`); continue; }
      if (!mapped.status) mapped.status = "Active";
      if (!mapped.tier) mapped.tier = "Tier 1";

      // Try to match by email or ID
      let existingId: string | null = null;
      if (mapped.email) {
        const { data } = await adminQuery(sessionToken, "select", "employees", {
          select: "id", eq: { email: mapped.email }, maybeSingle: true,
        });
        if (data) existingId = (data as any).id;
      }
      if (!existingId && mapped.id_iqama_number) {
        const { data } = await adminQuery(sessionToken, "select", "employees", {
          select: "id", eq: { id_iqama_number: mapped.id_iqama_number }, maybeSingle: true,
        });
        if (data) existingId = (data as any).id;
      }

      try {
        if (existingId) {
          await adminQuery(sessionToken, "update", "employees", {
            data: mapped, eq: { id: existingId },
          });
          updated++;
        } else {
          await adminQuery(sessionToken, "insert", "employees", {
            data: mapped,
          });
          inserted++;
        }
      } catch (err: any) {
        skipped++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    setResult({ inserted, updated, skipped, errors });
    setStep("result");
    setImporting(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import & Update
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Upload Excel or CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Supported: .xlsx, .xls, .csv</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()} className="rounded-xl">
              Choose File
            </Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{rawData.length} rows found. Map your columns:</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {HEADCOUNT_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-sm w-36 flex-shrink-0">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </span>
                  <Select value={mapping[f.key] || "_skip"} onValueChange={v => setMapping(prev => ({ ...prev, [f.key]: v === "_skip" ? "" : v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Skip" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">— Skip —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {mapping[f.key] && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {rawData.length} Records
              </Button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="py-6 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="font-medium text-lg">Import Complete</p>
            <div className="flex justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Updated</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="text-left bg-destructive/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}
            <Button onClick={onImported} className="rounded-xl">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
