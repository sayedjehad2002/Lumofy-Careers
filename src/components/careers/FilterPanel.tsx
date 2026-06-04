import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { departments, jobTypes } from "@/data/jobs";

interface FilterPanelProps {
  search: string;
  department: string;
  jobType: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onJobTypeChange: (value: string) => void;
}

const FilterPanel = ({
  search,
  department,
  jobType,
  onSearchChange,
  onDepartmentChange,
  onJobTypeChange,
}: FilterPanelProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-10">
      <div className="rounded-xl bg-card border border-border p-4 glow-blue-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={department} onValueChange={onDepartmentChange}>
            <SelectTrigger className="sm:w-48 bg-secondary border-border">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jobType} onValueChange={onJobTypeChange}>
            <SelectTrigger className="sm:w-40 bg-secondary border-border">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {jobTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
