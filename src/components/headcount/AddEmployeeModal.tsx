import { useState } from "react";
import { adminQuery } from "@/lib/adminQuery";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Employee, EMPLOYEE_STATUSES, DEPARTMENTS, TIER_OPTIONS, employeeToDbRow } from "@/types/headcount";
import { NATIONALITIES } from "@/data/nationalities";
import { Loader2 } from "lucide-react";

interface Props {
  employees: Employee[];
  sessionToken: string;
  onClose: () => void;
  onSaved: () => void;
  editEmployee?: Employee | null;
}

export default function AddEmployeeModal({ employees, sessionToken, onClose, onSaved, editEmployee }: Props) {
  const isEdit = !!editEmployee;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: editEmployee?.fullName || "",
    email: editEmployee?.email || "",
    phone: editEmployee?.phone || "",
    nationality: editEmployee?.nationality || "",
    idIqamaNumber: editEmployee?.idIqamaNumber || "",
    jobTitle: editEmployee?.jobTitle || "",
    department: editEmployee?.department || "",
    reportsTo: editEmployee?.reportsTo || "",
    tier: editEmployee?.tier || "Tier 1",
    status: editEmployee?.status || "Active",
    joiningDate: editEmployee?.joiningDate || "",
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.fullName.trim()) { toast.error("Full name is required"); return; }
    setSaving(true);
    try {
      const row = employeeToDbRow(form as any);
      if (isEdit && editEmployee) {
        const { error } = await adminQuery(sessionToken, "update", "employees", {
          data: row,
          eq: { id: editEmployee.id },
        });
        if (error) throw new Error(error);
        toast.success("Employee updated");
      } else {
        const { error } = await adminQuery(sessionToken, "insert", "employees", {
          data: row,
        });
        if (error) throw new Error(error);
        toast.success("Employee added");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Get unique managers from existing employees
  const managerOptions = [...new Set(employees.map(e => e.fullName).filter(Boolean))].sort();

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="e.g. Ahmed Al-Rashid" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={v => set("tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>ID / Iqama Number</Label>
            <Input value={form.idIqamaNumber} onChange={e => set("idIqamaNumber", e.target.value)} placeholder="e.g. 1234567890" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="employee@lumofy.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+966 5x xxx xxxx" />
          </div>
          <div>
            <Label>Job Title</Label>
            <Input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} placeholder="e.g. Senior Engineer" />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onValueChange={v => set("department", v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Joining Date</Label>
            <Input type="date" value={form.joiningDate} onChange={e => set("joiningDate", e.target.value)} />
          </div>
          <div>
            <Label>Reports To</Label>
            <Select value={form.reportsTo} onValueChange={v => set("reportsTo", v)}>
              <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
              <SelectContent>
                {managerOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nationality</Label>
            <Select value={form.nationality} onValueChange={v => set("nationality", v)}>
              <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Employee"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
