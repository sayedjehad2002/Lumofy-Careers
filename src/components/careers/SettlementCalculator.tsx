import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, User, Plane, Calendar, DollarSign, Info, RotateCcw,
  Copy, Printer, ChevronDown, Check, Search, Shield, TrendingUp,
  FileText, Sparkles, ArrowRight, Minus, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { NATIONALITIES } from "@/data/nationalities";
import { CURRENCIES, type Currency } from "@/data/currencies";

interface CalcState {
  employeeName: string;
  nationality: string;
  currencyCode: string;
  basicSalary: string;
  leaveBalance: string;
  periodFrom: string;
  periodTo: string;
  workingDaysWorked: string;
  workingDaysInMonth: string;
}

interface CalcResult {
  annualLeave: number;
  annualLeaveStatus: string;
  prorated: number;
  proratedStatus: string;
  gosi: number;
  gosiStatus: string;
  netTotal: number;
}

const initialState: CalcState = {
  employeeName: "", nationality: "", currencyCode: "", basicSalary: "",
  leaveBalance: "", periodFrom: "", periodTo: "", workingDaysWorked: "", workingDaysInMonth: "",
};

const WORKING_DAYS_OPTIONS = Array.from({ length: 11 }, (_, i) => i + 12); // 12..22

// ── Searchable Dropdown ──
function SearchableSelect({
  items, value, onChange, placeholder, renderItem, getLabel, getKey,
}: {
  items: readonly any[]; value: string; onChange: (v: string) => void; placeholder: string;
  renderItem: (item: any) => React.ReactNode; getLabel: (item: any) => string; getKey: (item: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return items as any[];
    const q = search.toLowerCase();
    return (items as any[]).filter(item => getLabel(item).toLowerCase().includes(q) || getKey(item).toLowerCase().includes(q));
  }, [items, search, getLabel, getKey]);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const item = (items as any[]).find(i => getKey(i) === value);
    return item ? getLabel(item) : value;
  }, [value, items, getLabel, getKey]);

  return (
    <div className={`relative ${open ? "z-50" : ""}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm ring-offset-background transition-all duration-200 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:ring-offset-2 focus:border-primary/60"
      >
        <span className={value ? "text-foreground truncate" : "text-muted-foreground truncate"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div key="currency-dropdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute bottom-full z-50 mb-2 w-full rounded-xl border border-border bg-popover shadow-xl"
            >
              <div className="p-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    autoFocus
                    className="w-full h-9 pl-9 pr-3 text-sm bg-secondary/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                    placeholder="Type to search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-1.5">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
                )}
                {filtered.slice(0, 100).map((item) => {
                  const key = getKey(item);
                  const isSelected = key === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { onChange(key); setOpen(false); setSearch(""); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-left transition-all duration-150 ${
                        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent/60"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      <span className={isSelected ? "" : "ml-6.5"}>{renderItem(item)}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Animated Number ──
function AnimatedValue({ value, currency }: { value: number; currency: string }) {
  const formatted = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <motion.span
      key={formatted}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="tabular-nums"
    >
      {formatted} {currency}
    </motion.span>
  );
}

// ── Section Wrapper ──
function FormSection({ icon: Icon, iconColor, title, step, children }: {
  icon: any; iconColor: string; title: string; step: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: step * 0.08 }}
    >
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all duration-300 hover:shadow-md rounded-2xl overflow-visible">
        <div className="px-6 pt-5 pb-2 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Step {step}</p>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        <CardContent className="px-6 pb-6 pt-3">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── KPI Chip ──
function KpiChip({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl p-4 border transition-all duration-300 ${
        accent
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/25 shadow-lg"
          : "bg-card/80 border-border/50 hover:border-primary/20"
      }`}
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Main Calculator ──
export default function SettlementCalculator() {
  const [form, setForm] = useState<CalcState>(initialState);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback((field: keyof CalcState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const selectedCurrency = useMemo(() => CURRENCIES.find(c => c.code === form.currencyCode), [form.currencyCode]);
  const currencyLabel = selectedCurrency?.code || "---";

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.nationality) e.nationality = "Required";
    if (!form.currencyCode) e.currencyCode = "Required";
    const salary = parseFloat(form.basicSalary);
    const leave = parseFloat(form.leaveBalance);
    const daysWorked = parseFloat(form.workingDaysWorked);
    if (form.basicSalary && (isNaN(salary) || salary < 0)) e.basicSalary = "Must be positive";
    if (form.leaveBalance && (isNaN(leave) || leave < 0)) e.leaveBalance = "Must be positive";
    if (form.workingDaysWorked && (isNaN(daysWorked) || daysWorked < 0)) e.workingDaysWorked = "Must be positive";
    if (form.periodFrom && form.periodTo && form.periodFrom > form.periodTo) e.periodTo = "Must be after From date";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const calculate = useCallback(() => {
    if (!validate()) return;
    const salary = parseFloat(form.basicSalary) || 0;
    const leaveBalance = parseFloat(form.leaveBalance) || 0;
    const daysInMonth = parseInt(form.workingDaysInMonth) || 0;
    const daysWorked = parseFloat(form.workingDaysWorked) || 0;

    let annualLeave = 0, annualLeaveStatus = "Not calculated";
    if (salary > 0 && leaveBalance > 0) {
      // Use the configured working-days/month (consistent with the prorated calc);
      // fall back to 22 when not set so existing behaviour is preserved.
      annualLeave = Math.round(((salary / (daysInMonth || 22)) * leaveBalance) * 100) / 100;
      annualLeaveStatus = "Calculated";
    }

    let prorated = 0, proratedStatus = "Not calculated";
    if (salary > 0 && daysInMonth > 0 && daysWorked > 0) {
      prorated = Math.round(((salary / daysInMonth) * daysWorked) * 100) / 100;
      proratedStatus = "Calculated";
    }

    let gosi = 0, gosiStatus = "Not applied";
    if (form.nationality === "Bahraini" && salary > 0) {
      gosi = Math.round((0.08 * salary) * 100) / 100;
      gosiStatus = "Applied";
    }

    const netTotal = Math.round((annualLeave + prorated - gosi) * 100) / 100;
    setResult({ annualLeave, annualLeaveStatus, prorated, proratedStatus, gosi, gosiStatus, netTotal });
  }, [form, validate]);

  const reset = useCallback(() => { setForm(initialState); setResult(null); setErrors({}); }, []);

  const copySummary = useCallback(() => {
    if (!result) return;
    const lines = [
      `End of Service Settlement${form.employeeName ? ` — ${form.employeeName}` : ""}`,
      `Nationality: ${form.nationality} | Currency: ${currencyLabel}`,
      `Annual Leave: ${result.annualLeave.toFixed(2)} ${currencyLabel} (${result.annualLeaveStatus})`,
      `Prorated Salary: ${result.prorated.toFixed(2)} ${currencyLabel} (${result.proratedStatus})`,
      `GOSI Deduction: ${result.gosi.toFixed(2)} ${currencyLabel} (${result.gosiStatus})`,
      `Net Total: ${result.netTotal.toFixed(2)} ${currencyLabel}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Summary copied to clipboard");
  }, [result, form, currencyLabel]);

  return (
    <div className="space-y-8">
      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/8 via-card to-card border border-border/50 p-8"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Calculator className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">End of Service Calculator</h2>
              <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-semibold uppercase tracking-wider">Pro</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Calculate final employee settlements with leave encashment, prorated salary, and Bahrain GOSI deductions, built for HR, payroll, and people ops teams.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">Bahrain GOSI</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/50">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium">150+ Currencies</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── LEFT: Form (3 cols) ── */}
        <div className="xl:col-span-3 space-y-5">
          {/* Step 1: Employee Details */}
          <FormSection icon={User} iconColor="bg-primary/15 text-primary" title="Employee Details" step={1}>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Employee Name <span className="text-muted-foreground/50">(optional)</span></Label>
                <Input placeholder="e.g. Ahmed Al Mahmoud" value={form.employeeName} onChange={e => set("employeeName", e.target.value)} className="mt-1.5 h-11 rounded-xl bg-card border-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Nationality <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5">
                    <SearchableSelect
                      items={NATIONALITIES} value={form.nationality} onChange={v => set("nationality", v)}
                      placeholder="Select nationality" renderItem={(item: string) => item}
                      getLabel={(item: string) => item} getKey={(item: string) => item}
                    />
                  </div>
                  {errors.nationality && <p className="text-[11px] text-destructive mt-1">{errors.nationality}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Currency <span className="text-destructive">*</span></Label>
                  <div className="mt-1.5">
                    <SearchableSelect
                      items={CURRENCIES} value={form.currencyCode} onChange={v => set("currencyCode", v)}
                      placeholder="Select currency" renderItem={(item: Currency) => item.label}
                      getLabel={(item: Currency) => item.label} getKey={(item: Currency) => item.code}
                    />
                  </div>
                  {errors.currencyCode && <p className="text-[11px] text-destructive mt-1">{errors.currencyCode}</p>}
                </div>
              </div>
            </div>
          </FormSection>

          {/* Step 2: Annual Leave */}
          <FormSection icon={Plane} iconColor="bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))]" title="Annual Leave Calculation" step={2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Basic Monthly Salary</Label>
                <div className="mt-1.5 flex items-center gap-0 rounded-xl bg-card border border-border h-11 overflow-hidden">
                  <button type="button" onClick={() => { const cur = Number(form.basicSalary) || 0; if (cur >= 100) set("basicSalary", String(+(cur - 100).toFixed(2))); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-r border-border select-none"><Minus className="w-3.5 h-3.5" /></button>
                  <input type="number" min="0" step="0.01" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} placeholder="0.00" className="h-full flex-1 text-center bg-transparent text-sm font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0" />
                  <button type="button" onClick={() => { const cur = Number(form.basicSalary) || 0; set("basicSalary", String(+(cur + 100).toFixed(2))); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-l border-border select-none"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                {errors.basicSalary && <p className="text-[11px] text-destructive mt-1">{errors.basicSalary}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Leave Balance (Days)</Label>
                <div className="mt-1.5 flex items-center gap-0 rounded-xl bg-card border border-border h-11 overflow-hidden">
                  <button type="button" onClick={() => { const cur = Number(form.leaveBalance) || 0; if (cur >= 0.5) set("leaveBalance", String(+(cur - 0.5).toFixed(1))); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-r border-border select-none"><Minus className="w-3.5 h-3.5" /></button>
                  <input type="number" min="0" step="0.5" value={form.leaveBalance} onChange={e => set("leaveBalance", e.target.value)} placeholder="0" className="h-full flex-1 text-center bg-transparent text-sm font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0" />
                  <button type="button" onClick={() => { const cur = Number(form.leaveBalance) || 0; set("leaveBalance", String(+(cur + 0.5).toFixed(1))); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-l border-border select-none"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                {errors.leaveBalance && <p className="text-[11px] text-destructive mt-1">{errors.leaveBalance}</p>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/30">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-[11px] text-muted-foreground">Formula: (Basic Salary ÷ 22) × Leave Balance Days</p>
            </div>
          </FormSection>

          {/* Step 3: Prorated Salary */}
          <FormSection icon={Calendar} iconColor="bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]" title="Prorated Salary Calculation" step={3}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Period From <span className="text-muted-foreground/50">(reference)</span></Label>
                  <Input type="date" value={form.periodFrom} onChange={e => set("periodFrom", e.target.value)} className="mt-1.5 h-11 rounded-xl bg-card border-border" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Period To <span className="text-muted-foreground/50">(reference)</span></Label>
                  <Input type="date" value={form.periodTo} onChange={e => set("periodTo", e.target.value)} className="mt-1.5 h-11 rounded-xl bg-card border-border" />
                  {errors.periodTo && <p className="text-[11px] text-destructive mt-1">{errors.periodTo}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Working Days Worked</Label>
                  <div className="mt-1.5 flex items-center gap-0 rounded-xl bg-card border border-border h-11 overflow-hidden">
                    <button type="button" onClick={() => { const cur = Number(form.workingDaysWorked) || 0; if (cur >= 1) set("workingDaysWorked", String(cur - 1)); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-r border-border select-none"><Minus className="w-3.5 h-3.5" /></button>
                    <input type="number" min="0" step="1" value={form.workingDaysWorked} onChange={e => set("workingDaysWorked", e.target.value)} placeholder="0" className="h-full flex-1 text-center bg-transparent text-sm font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0" />
                    <button type="button" onClick={() => { const cur = Number(form.workingDaysWorked) || 0; set("workingDaysWorked", String(cur + 1)); }} className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-l border-border select-none"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                  {errors.workingDaysWorked && <p className="text-[11px] text-destructive mt-1">{errors.workingDaysWorked}</p>}
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Working Days in Month</Label>
                  <div className="mt-1.5 flex items-center gap-0 rounded-xl bg-card border border-border h-11 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(form.workingDaysInMonth) || 22;
                        if (cur > 1) set("workingDaysInMonth", String(cur - 1));
                      }}
                      className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-r border-border select-none"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.workingDaysInMonth}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === "" || (Number(v) >= 1 && Number(v) <= 31)) set("workingDaysInMonth", v);
                      }}
                      className="h-full flex-1 text-center bg-transparent text-sm font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      placeholder="22"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number(form.workingDaysInMonth) || 0;
                        if (cur < 31) set("workingDaysInMonth", String(cur + 1));
                      }}
                      className="h-full px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border-l border-border select-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/30">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-[11px] text-muted-foreground">Formula: (Basic Salary ÷ Working Days in Month) × Days Worked</p>
              </div>
            </div>
          </FormSection>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center gap-3 pt-1"
          >
            <Button onClick={calculate} size="lg" className="px-8 gap-2.5 rounded-xl h-12 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
              <Calculator className="w-4.5 h-4.5" />
              Calculate settlement
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" size="lg" onClick={reset} className="gap-2 rounded-xl h-12 text-sm border-border hover:bg-secondary/60">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          </motion.div>
        </div>

        {/* ── RIGHT: Results (2 cols) ── */}
        <div className="xl:col-span-2 space-y-5">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="border-border/40 border-dashed rounded-2xl">
                  <CardContent className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">No calculation yet</p>
                    <p className="text-xs text-muted-foreground/60 max-w-[240px] mx-auto">
                      Fill in the employee details and click Calculate to see the settlement breakdown.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Net Total — Hero Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/12 via-primary/6 to-card border border-primary/20 p-6 shadow-lg">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold">Net Total Payable</p>
                    </div>
                    <p className="text-4xl font-bold text-primary tracking-tight">
                      <AnimatedValue value={result.netTotal} currency={currencyLabel} />
                    </p>
                    {form.employeeName && (
                      <p className="text-xs text-muted-foreground mt-2">Settlement for {form.employeeName}</p>
                    )}
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <KpiChip
                    label="Annual Leave"
                    value={`${result.annualLeave.toFixed(2)}`}
                    sub={result.annualLeaveStatus === "Calculated" ? `${currencyLabel} ✓` : "Missing inputs"}
                  />
                  <KpiChip
                    label="Prorated Salary"
                    value={`${result.prorated.toFixed(2)}`}
                    sub={result.proratedStatus === "Calculated" ? `${currencyLabel} ✓` : "Missing inputs"}
                  />
                </div>

                {/* GOSI Card */}
                <div className={`rounded-2xl p-4 border transition-all duration-300 ${
                  result.gosiStatus === "Applied"
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-card/80 border-border/50"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">GOSI Deduction</p>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground/50" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] text-xs">
                            Applied only for Bahraini nationality at 8% of Basic Monthly Salary.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className={`text-xl font-bold tabular-nums ${result.gosi > 0 ? "text-destructive" : "text-foreground"}`}>
                        {result.gosi > 0 ? "−" : ""}{result.gosi.toFixed(2)} {currencyLabel}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] font-semibold uppercase tracking-wider border-0 ${
                        result.gosiStatus === "Applied"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {result.gosiStatus}
                    </Badge>
                  </div>
                </div>

                {/* Breakdown */}
                <Card className="border-border/40 rounded-2xl">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Status Summary</p>
                    <div className="space-y-2.5">
                      {[
                        { label: "Annual Leave", status: result.annualLeaveStatus },
                        { label: "Prorated Salary", status: result.proratedStatus },
                        { label: "GOSI", status: result.gosiStatus },
                      ].map(({ label, status }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <Badge variant="secondary" className={`text-[10px] border-0 ${
                            status === "Calculated" || status === "Applied"
                              ? "bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))]"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-2 rounded-xl h-10 text-xs border-border" onClick={copySummary}>
                    <Copy className="w-3.5 h-3.5" /> Copy summary
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-2 rounded-xl h-10 text-xs border-border" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                </div>

                {/* Audit */}
                <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
                  Based on EOS settlement rules configured in Lumofy Talent Hub.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
