import { useState, useEffect, useMemo, useCallback } from "react";
import { adminQuery } from "@/lib/adminQuery";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Upload, Search, Filter, UserCheck, Clock, UserX, Baby, FileText, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Employee, dbRowToEmployee, getEmployeeTags, EMPLOYEE_STATUSES, DEPARTMENTS, TIER_OPTIONS } from "@/types/headcount";
import AddEmployeeModal from "./AddEmployeeModal";
import BulkImportModal from "./BulkImportModal";
import EmployeeProfilePage from "./EmployeeProfilePage";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { exportHeadcountPdf, exportHeadcountExcel } from "@/utils/headcountExport";

interface Props {
  sessionToken: string;
}

export default function HeadcountPage({ sessionToken }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterManager, setFilterManager] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("joining_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminQuery(sessionToken, "select", "employees", {
      order: { column: "created_at", ascending: false },
    });
    if (error) {
      import.meta.env.DEV && console.error("Failed to fetch employees:", error);
      toast.error("Failed to load employees");
    } else {
      setEmployees((data || []).map(dbRowToEmployee));
    }
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const managers = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.reportsTo) set.add(e.reportsTo); });
    return Array.from(set).sort();
  }, [employees]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let list = [...employees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.fullName.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.idIqamaNumber && e.idIqamaNumber.toLowerCase().includes(q)) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") list = list.filter(e => e.status === filterStatus);
    if (filterDept !== "all") list = list.filter(e => e.department === filterDept);
    if (filterTier !== "all") list = list.filter(e => e.tier === filterTier);
    if (filterManager !== "all") list = list.filter(e => e.reportsTo === filterManager);

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === "joining_date") { va = a.joiningDate || ""; vb = b.joiningDate || ""; }
      else if (sortBy === "department") { va = a.department || ""; vb = b.department || ""; }
      else if (sortBy === "status") { va = a.status; vb = b.status; }
      else if (sortBy === "name") { va = a.fullName; vb = b.fullName; }
      else { va = a.fullName; vb = b.fullName; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [employees, search, filterStatus, filterDept, filterTier, filterManager, sortBy, sortDir]);

  // Stats
  const activeCount = employees.filter(e => e.status === "Active").length;
  const newHireCount = employees.filter(e => getEmployeeTags(e).includes("New Hire")).length;
  const probationCount = employees.filter(e => getEmployeeTags(e).includes("On Probation")).length;
  const offboardedCount = employees.filter(e => e.status === "Offboarded").length;

  if (selectedEmployee) {
    return (
      <EmployeeProfilePage
        employee={selectedEmployee}
        employees={employees}
        sessionToken={sessionToken}
        onBack={() => { setSelectedEmployee(null); fetchEmployees(); }}
        onUpdate={(updated) => {
          setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
          setSelectedEmployee(updated);
        }}
      />
    );
  }

  const statCards = [
    { label: "Active Employees", value: activeCount, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "New Hires", value: newHireCount, icon: Baby, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "On Probation", value: probationCount, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "Offboarded", value: offboardedCount, icon: UserX, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Headcount</h1>
            <p className="text-sm text-muted-foreground">{employees.length} employees · Workforce management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportHeadcountPdf(filtered)} className="rounded-xl" disabled={filtered.length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportHeadcountExcel(filtered)} className="rounded-xl" disabled={filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="rounded-xl">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setAddOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-xl border ${card.border} ${card.bg} p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200`}
          >
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">
                <AnimatedCounter value={card.value} />
              </p>
              <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, ID, job title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterManager} onValueChange={setFilterManager}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Manager" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {managers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="joining_date">Joining Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} className="rounded-xl">
          <Filter className={`w-4 h-4 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Employee Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading employees...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{employees.length === 0 ? "No employees yet" : "No results found"}</p>
            <p className="text-xs text-muted-foreground mt-1">{employees.length === 0 ? "Add your first employee to get started" : "Try adjusting your filters"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">ID / Iqama</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Joining Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Reports To</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Tier</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((emp, i) => {
                    const tags = getEmployeeTags(emp);
                    const initials = emp.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelectedEmployee(emp)}
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 overflow-hidden">
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                              ) : initials}
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">{emp.fullName}</p>
                              <p className="text-xs text-muted-foreground">{emp.email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={emp.status === "Active" ? "default" : emp.status === "Offboarded" ? "destructive" : "secondary"} className="text-[10px] px-2 py-0.5">
                              {emp.status}
                            </Badge>
                            {tags.map(tag => (
                              <Badge key={tag} variant="outline" className={`text-[10px] px-1.5 py-0 ${tag === "New Hire" ? "border-blue-500/30 text-blue-400" : "border-amber-500/30 text-amber-400"}`}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{emp.idIqamaNumber || "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">{emp.jobTitle || "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">{emp.department || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{emp.joiningDate || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">{emp.reportsTo || "—"}</td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {emp.tier && <Badge variant="outline" className="text-[10px]">{emp.tier}</Badge>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {addOpen && (
        <AddEmployeeModal
          employees={employees}
          sessionToken={sessionToken}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); fetchEmployees(); }}
        />
      )}
      {bulkOpen && (
        <BulkImportModal
          sessionToken={sessionToken}
          onClose={() => setBulkOpen(false)}
          onImported={() => { setBulkOpen(false); fetchEmployees(); }}
        />
      )}
    </div>
  );
}
