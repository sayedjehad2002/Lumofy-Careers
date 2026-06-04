import { useMemo, useCallback, useState, useEffect, forwardRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, RotateCcw, Search, SlidersHorizontal, X, MapPin,
  Building2, Clock, Banknote, ChevronDown, Share2, Check, Filter,
  LayoutGrid, LayoutList
} from "lucide-react";
import Navbar from "@/components/careers/Navbar";
import Footer from "@/components/careers/Footer";
import JobCard from "@/components/careers/JobCard";
import { useCareers } from "@/contexts/CareersContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

// ─── URL param helpers ─────────────────────────────────────
function getParamArray(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  if (!val) return [];
  return val.split(",").filter(Boolean);
}

function setParamArray(params: URLSearchParams, key: string, values: string[]): URLSearchParams {
  const next = new URLSearchParams(params);
  if (values.length === 0) next.delete(key);
  else next.set(key, values.join(","));
  return next;
}

// ─── Filter Section Component ──────────────────────────────
interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  counts: Record<string, number>;
  defaultOpen?: boolean;
}

const FilterSection = forwardRef<HTMLDivElement, FilterSectionProps>(({ title, icon, options, selected, onToggle, counts, defaultOpen = true }, ref) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [sectionSearch, setSectionSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!sectionSearch) return options;
    return options.filter(o => o.toLowerCase().includes(sectionSearch.toLowerCase()));
  }, [options, sectionSearch]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 group">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-0">
              {selected.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        {options.length > 5 && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={sectionSearch}
              onChange={e => setSectionSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/50 border-border/50"
            />
          </div>
        )}
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {filteredOptions.map(option => (
            <label
              key={option}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group/item"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => onToggle(option)}
                className="h-4 w-4"
              />
              <span className="text-sm text-foreground flex-1 truncate">{option}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {counts[option] || 0}
              </span>
            </label>
          ))}
          {filteredOptions.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">No matches</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
FilterSection.displayName = "FilterSection";

// ─── Active Filter Chips ───────────────────────────────────
interface ActiveChipProps {
  label: string;
  onRemove: () => void;
}

const ActiveChip = ({ label, onRemove }: ActiveChipProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
  >
    {label}
    <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-primary/20 transition-colors">
      <X className="w-3 h-3" />
    </button>
  </motion.div>
);

// ─── Sidebar Content ───────────────────────────────────────
interface FilterSidebarContentProps {
  departments: string[];
  locations: string[];
  jobTypes: string[];
  selectedDepartments: string[];
  selectedLocations: string[];
  selectedTypes: string[];
  onToggleDepartment: (v: string) => void;
  onToggleLocation: (v: string) => void;
  onToggleType: (v: string) => void;
  deptCounts: Record<string, number>;
  locCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  totalActiveFilters: number;
  onReset: () => void;
}

const FilterSidebarContent = forwardRef<HTMLDivElement, FilterSidebarContentProps>(({
  departments, locations, jobTypes,
  selectedDepartments, selectedLocations, selectedTypes,
  onToggleDepartment, onToggleLocation, onToggleType,
  deptCounts, locCounts, typeCounts,
  totalActiveFilters, onReset,
}, ref) => (
  <div ref={ref} className="space-y-1">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Filter className="w-4 h-4 text-primary" />
        Filters
        {totalActiveFilters > 0 && (
          <Badge className="h-5 px-2 text-[10px] bg-primary text-primary-foreground border-0">
            {totalActiveFilters}
          </Badge>
        )}
      </h3>
      {totalActiveFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="w-3 h-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>

    <FilterSection
      title="Department"
      icon={<Building2 className="w-4 h-4 text-primary" />}
      options={departments}
      selected={selectedDepartments}
      onToggle={onToggleDepartment}
      counts={deptCounts}
    />
    <Separator className="my-1" />
    <FilterSection
      title="Location"
      icon={<MapPin className="w-4 h-4 text-primary" />}
      options={locations}
      selected={selectedLocations}
      onToggle={onToggleLocation}
      counts={locCounts}
    />
    <Separator className="my-1" />
    <FilterSection
      title="Job Type"
      icon={<Clock className="w-4 h-4 text-primary" />}
      options={jobTypes}
      selected={selectedTypes}
      onToggle={onToggleType}
      counts={typeCounts}
    />
  </div>
));
FilterSidebarContent.displayName = "FilterSidebarContent";

// ─── Main Component ────────────────────────────────────────
const JobsPage = () => {
  const { jobs, loading } = useCareers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Read filters from URL
  const search = searchParams.get("q") || "";
  const selectedDepartments = getParamArray(searchParams, "dept");
  const selectedLocations = getParamArray(searchParams, "loc");
  const selectedTypes = getParamArray(searchParams, "type");

  // Derived data
  const openJobs = useMemo(() => jobs.filter(j => j.status === "open"), [jobs]);

  const departments = useMemo(() => Array.from(new Set(openJobs.map(j => j.department))).sort(), [openJobs]);
  const locations = useMemo(() => Array.from(new Set(openJobs.map(j => j.location))).sort(), [openJobs]);
  const jobTypes = useMemo(() => Array.from(new Set(openJobs.map(j => j.type))).sort(), [openJobs]);

  // Counts (based on all open jobs, not filtered)
  const deptCounts = useMemo(() => {
    const c: Record<string, number> = {};
    openJobs.forEach(j => { c[j.department] = (c[j.department] || 0) + 1; });
    return c;
  }, [openJobs]);

  const locCounts = useMemo(() => {
    const c: Record<string, number> = {};
    openJobs.forEach(j => { c[j.location] = (c[j.location] || 0) + 1; });
    return c;
  }, [openJobs]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    openJobs.forEach(j => { c[j.type] = (c[j.type] || 0) + 1; });
    return c;
  }, [openJobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return openJobs.filter(job => {
      if (search && !job.title.toLowerCase().includes(search.toLowerCase()) && !job.summary.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedDepartments.length > 0 && !selectedDepartments.includes(job.department)) return false;
      if (selectedLocations.length > 0 && !selectedLocations.includes(job.location)) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(job.type)) return false;
      return true;
    });
  }, [openJobs, search, selectedDepartments, selectedLocations, selectedTypes]);

  // URL setters
  const setSearch = useCallback((val: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!val) next.delete("q");
      else next.set("q", val);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleFilter = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const current = getParamArray(prev, key);
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return setParamArray(prev, key, updated);
    }, { replace: true });
  }, [setSearchParams]);

  const onToggleDepartment = useCallback((v: string) => toggleFilter("dept", v), [toggleFilter]);
  const onToggleLocation = useCallback((v: string) => toggleFilter("loc", v), [toggleFilter]);
  const onToggleType = useCallback((v: string) => toggleFilter("type", v), [toggleFilter]);

  const totalActiveFilters = selectedDepartments.length + selectedLocations.length + selectedTypes.length;
  const hasActiveFilters = search.length > 0 || totalActiveFilters > 0;

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const allActiveChips = useMemo(() => [
    ...selectedDepartments.map(v => ({ label: v, key: "dept", value: v })),
    ...selectedLocations.map(v => ({ label: v, key: "loc", value: v })),
    ...selectedTypes.map(v => ({ label: v, key: "type", value: v })),
  ], [selectedDepartments, selectedLocations, selectedTypes]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Filter link copied to clipboard!");
  }, []);

  const sidebarProps = {
    departments, locations, jobTypes,
    selectedDepartments, selectedLocations, selectedTypes,
    onToggleDepartment, onToggleLocation, onToggleType,
    deptCounts, locCounts, typeCounts,
    totalActiveFilters, onReset: resetFilters,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-16 px-4">
        {/* Header */}
        <section className="max-w-7xl mx-auto mb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Open Positions</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              Explore opportunities at Lumofy and find the role that matches your skills and ambitions.
            </p>
          </motion.div>
        </section>

        {/* Search Bar — full width */}
        <section className="max-w-7xl mx-auto mb-6">
          <div className="rounded-2xl bg-card/95 backdrop-blur border border-border p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, keyword, or skill…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-background h-11 text-sm"
                />
              </div>

              {/* Mobile filter trigger */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden h-11 px-4 relative">
                    <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                    Filters
                    {totalActiveFilters > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                        {totalActiveFilters}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-5">
                  <SheetHeader className="pb-4">
                    <SheetTitle className="text-left">Filter Jobs</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <FilterSidebarContent {...sidebarProps} />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Share button */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={copyShareLink} className="h-11 px-3 text-muted-foreground hover:text-foreground">
                  <Share2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Active filter chips */}
            <AnimatePresence>
              {allActiveChips.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">Active:</span>
                    {allActiveChips.map(chip => (
                      <ActiveChip
                        key={`${chip.key}-${chip.value}`}
                        label={chip.label}
                        onRemove={() => toggleFilter(chip.key, chip.value)}
                      />
                    ))}
                    <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 transition-colors">
                      Clear all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Main Layout: Sidebar + Grid */}
        <section className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24">
                <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
                  <ScrollArea className="max-h-[calc(100vh-10rem)]">
                    <FilterSidebarContent {...sidebarProps} />
                  </ScrollArea>
                </div>
              </div>
            </aside>

            {/* Job Listings */}
            <div className="flex-1 min-w-0">
              {/* Results header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredJobs.length}</span>{" "}
                  position{filteredJobs.length !== 1 ? "s" : ""} found
                  {hasActiveFilters && (
                    <span className="text-muted-foreground"> · filtered from {openJobs.length}</span>
                  )}
                </p>
              </div>

              {/* Job Cards */}
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-6">
                      <Skeleton className="h-4 w-28 mb-3" />
                      <Skeleton className="h-6 w-1/2 mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 rounded-2xl border border-border bg-card"
                >
                  <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">No positions match your filters.</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">Try adjusting your search or clearing filters.</p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Reset All Filters
                    </Button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job, i) => (
                    <JobCard key={job.id} job={job} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default JobsPage;
