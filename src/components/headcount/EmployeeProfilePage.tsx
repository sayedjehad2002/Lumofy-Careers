import { useState } from "react";
import { adminQuery } from "@/lib/adminQuery";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Building2, Shield, User, Briefcase, Clock, Hash, Globe, MoreHorizontal, Trash2, LogOut, CalendarIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Employee, getEmployeeTags, getTimeAtOrg, dbRowToEmployee, getProbationEndDate, getProbationProgress, PROBATION_DURATION_OPTIONS } from "@/types/headcount";
import AddEmployeeModal from "./AddEmployeeModal";

interface Props {
  employee: Employee;
  employees: Employee[];
  sessionToken: string;
  onBack: () => void;
  onUpdate: (e: Employee) => void;
}

export default function EmployeeProfilePage({ employee, employees, sessionToken, onBack, onUpdate }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboarding, setOffboarding] = useState(false);
  const [probationSaving, setProbationSaving] = useState(false);
  const tags = getEmployeeTags(employee);
  const initials = employee.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const probationProgress = employee.isOnProbation
    ? getProbationProgress(employee.probationStartDate, employee.probationDurationMonths)
    : null;

  const refetchEmployee = async () => {
    const { data } = await adminQuery(sessionToken, "select", "employees", {
      eq: { id: employee.id }, single: true,
    });
    if (data) onUpdate(dbRowToEmployee(data));
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await adminQuery(sessionToken, "delete", "employees", {
      eq: { id: employee.id },
    });
    if (error) { toast.error("Failed to delete"); setDeleting(false); return; }
    toast.success("Employee deleted");
    setDeleteOpen(false);
    onBack();
  };

  const handleProbationToggle = async (checked: boolean) => {
    setProbationSaving(true);
    const updates: any = {
      is_on_probation: checked,
    };
    if (checked && !employee.probationStartDate) {
      updates.probation_start_date = new Date().toISOString().split("T")[0];
    }
    if (!checked) {
      updates.probation_start_date = null;
    }
    const { error } = await adminQuery(sessionToken, "update", "employees", {
      data: updates, eq: { id: employee.id },
    });
    if (error) { toast.error("Failed to update probation"); setProbationSaving(false); return; }
    toast.success(checked ? "Probation enabled" : "Probation removed");
    await refetchEmployee();
    setProbationSaving(false);
  };

  const handleProbationDateChange = async (date: Date | undefined) => {
    if (!date) return;
    setProbationSaving(true);
    const dateStr = format(date, "yyyy-MM-dd");
    const { error } = await adminQuery(sessionToken, "update", "employees", {
      data: { probation_start_date: dateStr }, eq: { id: employee.id },
    });
    if (error) { toast.error("Failed to update date"); setProbationSaving(false); return; }
    toast.success("Probation start date updated");
    await refetchEmployee();
    setProbationSaving(false);
  };

  const handleDurationChange = async (months: string) => {
    setProbationSaving(true);
    const { error } = await adminQuery(sessionToken, "update", "employees", {
      data: { probation_duration_months: parseInt(months) }, eq: { id: employee.id },
    });
    if (error) { toast.error("Failed to update duration"); setProbationSaving(false); return; }
    toast.success(`Probation duration set to ${months} months`);
    await refetchEmployee();
    setProbationSaving(false);
  };

  const infoFields = [
    { icon: Calendar, label: "Joining Date", value: employee.joiningDate || "—" },
    { icon: Clock, label: "Time at Organization", value: getTimeAtOrg(employee.joiningDate) },
    { icon: Hash, label: "ID Number", value: employee.idIqamaNumber || "—" },
    { icon: Clock, label: "Last Active", value: employee.lastActiveAt ? new Date(employee.lastActiveAt).toLocaleDateString() : "No activity recorded yet" },
    { icon: Building2, label: "Department", value: employee.department || "—" },
    { icon: Globe, label: "Nationality", value: employee.nationality || "—" },
    { icon: Mail, label: "Email", value: employee.email || "—" },
    { icon: Phone, label: "Phone", value: employee.phone || "—" },
    { icon: Briefcase, label: "Job Title", value: employee.jobTitle || "—" },
    { icon: User, label: "Reports To", value: employee.reportsTo || "—" },
    { icon: Shield, label: "Tier", value: employee.tier || "—" },
    { icon: User, label: "Status", value: employee.status },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Headcount
      </Button>

      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 overflow-hidden"
          >
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
            ) : initials}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{employee.fullName}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={employee.status === "Active" ? "default" : employee.status === "Offboarded" ? "destructive" : "secondary"}>
                    {employee.status}
                  </Badge>
                  {tags.map(tag => (
                    <Badge key={tag} variant="outline" className={tag === "New Hire" ? "border-blue-500/30 text-blue-400" : "border-amber-500/30 text-amber-400"}>
                      {tag}
                    </Badge>
                  ))}
                  {employee.tier && <Badge variant="outline">{employee.tier}</Badge>}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {employee.idIqamaNumber && <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {employee.idIqamaNumber}</span>}
                  {employee.jobTitle && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {employee.jobTitle}</span>}
                  {employee.department && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {employee.department}</span>}
                  {employee.reportsTo && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {employee.reportsTo}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {employee.status !== "Offboarded" && (
                      <DropdownMenuItem onClick={() => setOffboardOpen(true)}>
                        <LogOut className="w-4 h-4 mr-2" /> Offboard Employee
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Employee
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Probation Management Card */}
      <Card className="rounded-xl border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Probation Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="probation-toggle"
              checked={employee.isOnProbation}
              onCheckedChange={(checked) => handleProbationToggle(!!checked)}
              disabled={probationSaving}
            />
            <Label htmlFor="probation-toggle" className="text-sm font-medium cursor-pointer">
              Employee is on probation
            </Label>
            {probationSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
          </div>

          {/* Probation details (visible when on probation) */}
          {employee.isOnProbation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 border-t border-border pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date Picker */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Probation Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !employee.probationStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {employee.probationStartDate
                          ? format(new Date(employee.probationStartDate), "PPP")
                          : "Pick a start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={employee.probationStartDate ? new Date(employee.probationStartDate) : undefined}
                        onSelect={handleProbationDateChange}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Duration Selector */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Duration (Months)</Label>
                  <Select
                    value={String(employee.probationDurationMonths)}
                    onValueChange={handleDurationChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBATION_DURATION_OPTIONS.map(m => (
                        <SelectItem key={m} value={String(m)}>
                          {m} month{m !== 1 ? "s" : ""} {m === 3 ? "(Standard)" : m === 6 ? "(Intern / Extended)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress & Status */}
              {probationProgress && (
                <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(probationProgress.percentComplete)}%</span>
                  </div>
                  <Progress value={probationProgress.percentComplete} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Started: {employee.probationStartDate ? format(new Date(employee.probationStartDate), "MMM d, yyyy") : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      Ends: {employee.probationStartDate
                        ? format(getProbationEndDate(employee.probationStartDate, employee.probationDurationMonths)!, "MMM d, yyyy")
                        : "—"}
                    </span>
                  </div>
                  {probationProgress.isExpired ? (
                    <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Probation period has ended — review required</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">{probationProgress.daysLeft} day{probationProgress.daysLeft !== 1 ? "s" : ""} remaining</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="rounded-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="documents" disabled>Documents</TabsTrigger>
          <TabsTrigger value="attendance" disabled>Attendance</TabsTrigger>
          <TabsTrigger value="leave" disabled>Leave</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">General Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {infoFields.map((field, i) => (
                  <motion.div
                    key={field.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <field.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm font-medium mt-0.5 truncate">{field.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="information" className="mt-4">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Employee Details</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                {[
                  { label: "Full Name", value: employee.fullName },
                  { label: "Email", value: employee.email },
                  { label: "Phone", value: employee.phone },
                  { label: "Nationality", value: employee.nationality },
                  { label: "ID / Iqama", value: employee.idIqamaNumber },
                  { label: "Job Title", value: employee.jobTitle },
                  { label: "Department", value: employee.department },
                  { label: "Reports To", value: employee.reportsTo },
                  { label: "Tier", value: employee.tier },
                  { label: "Status", value: employee.status },
                  { label: "Joining Date", value: employee.joiningDate },
                  { label: "Time at Org", value: getTimeAtOrg(employee.joiningDate) },
                ].map(item => (
                  <div key={item.label} className="border-b border-border/50 pb-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value || "—"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {editOpen && (
        <AddEmployeeModal
          employees={employees}
          sessionToken={sessionToken}
          editEmployee={employee}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await refetchEmployee();
          }}
        />
      )}

      {/* Offboard Confirmation */}
      <AlertDialog open={offboardOpen} onOpenChange={setOffboardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change <strong>{employee.fullName}</strong>'s status to <strong>Offboarded</strong>. You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setOffboarding(true);
                const { error } = await adminQuery(sessionToken, "update", "employees", {
                  data: { status: "Offboarded" }, eq: { id: employee.id },
                });
                if (error) { toast.error("Failed to offboard"); setOffboarding(false); return; }
                toast.success("Employee offboarded");
                setOffboardOpen(false);
                setOffboarding(false);
                await refetchEmployee();
              }}
              disabled={offboarding}
            >
              {offboarding ? "Processing..." : "Offboard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{employee.fullName}</strong> from the headcount. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
