import { useMemo, useCallback, useState, forwardRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, RotateCcw, Search, SlidersHorizontal, X, MapPin,
  Building2, Clock, ChevronDown, Share2, Filter, Compass, ArrowRight,
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

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };

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
      <CollapsibleTrigger className="group flex w-full items-center justify-between py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon}
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="h-5 border-0 bg-primary/10 px-1.5 text-[10px] text-primary">
              {selected.length}
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        {options.length > 5 && (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder={`Search ${title.toLowerCase()}…`}
              value={sectionSearch}
              onChange={e => setSectionSearch(e.target.value)}
              className="h-8 bg-muted/30 pl-8 text-xs"
            />
          </div>
        )}
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filteredOptions.map(option => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => onToggle(option)}
                className="h-4 w-4"
              />
              <span className="flex-1 truncate text-sm text-foreground">{option}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {counts[option] || 0}
              </span>
            </label>
          ))}
          {filteredOptions.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">No matches</p>
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
    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
  >
    {label}
    <button
      onClick={onRemove}
      aria-label="Remove filter"
      className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
    >
      <X className="h-3 w-3" aria-hidden="true" />
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
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
        Filters
        {totalActiveFilters > 0 && (
          <Badge className="h-5 border-0 bg-primary px-2 text-[10px] text-primary-foreground">
            {totalActiveFilters}
          </Badge>
        )}
      </h2>
      {totalActiveFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
          Clear all
        </Button>
      )}
    </div>

    <FilterSection
      title="Department"
      icon={<Building2 className="h-4 w-4 text-primary" aria-hidden="true" />}
      options={departments}
      selected={selectedDepartments}
      onToggle={onToggleDepartment}
      counts={deptCounts}
    />
    <Separator className="my-1" />
    <FilterSection
      title="Location"
      icon={<MapPin className="h-4 w-4 text-primary" aria-hidden="true" />}
      options={locations}
      selected={selectedLocations}
      onToggle={onToggleLocation}
      counts={locCounts}
    />
    <Separator className="my-1" />
    <FilterSection
      title="Job Type"
      icon={<Clock className="h-4 w-4 text-primary" aria-hidden="true" />}
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

      <main id="main" className="px-4 pb-16 pt-28 sm:pt-32">
        {/* Header */}
        <section className="mx-auto mb-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Open Roles</span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Open Positions</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Explore opportunities at Lumofy and find the role that matches your skills and ambitions.
            </p>
          </motion.div>
        </section>

        {/* Search Bar — full width */}
        <section className="mx-auto mb-6 max-w-6xl">
          <div className="rounded-2xl border border-border bg-card p-3 light-glow">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search by title, keyword, or skill…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-11 bg-background pl-9 text-sm"
                />
              </div>

              {/* Mobile filter trigger */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative h-11 px-4 lg:hidden">
                    <SlidersHorizontal className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Filters
                    {totalActiveFilters > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyShareLink}
                  aria-label="Copy filter link"
                  className="h-11 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
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
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="text-xs font-medium text-muted-foreground">Active:</span>
                    {allActiveChips.map(chip => (
                      <ActiveChip
                        key={`${chip.key}-${chip.value}`}
                        label={chip.label}
                        onRemove={() => toggleFilter(chip.key, chip.value)}
                      />
                    ))}
                    <button onClick={resetFilters} className="ml-1 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground">
                      Clear all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Main Layout: Sidebar + Grid */}
        <section className="mx-auto max-w-6xl">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24">
                <div className="rounded-2xl border border-border bg-card p-4 light-glow">
                  <ScrollArea className="max-h-[calc(100vh-10rem)]">
                    <FilterSidebarContent {...sidebarProps} />
                  </ScrollArea>
                </div>
              </div>
            </aside>

            {/* Job Listings */}
            <div className="min-w-0 flex-1">
              {/* Results header */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  <span className="font-semibold text-foreground">{filteredJobs.length}</span>{" "}
                  {filteredJobs.length === 1 ? "role" : "roles"}
                  {hasActiveFilters && (
                    <span className="text-muted-foreground"> · filtered from {openJobs.length}</span>
                  )}
                </p>
              </div>

              {/* Job Cards */}
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-6 light-glow">
                      <Skeleton className="mb-3 h-4 w-28" />
                      <Skeleton className="mb-3 h-6 w-1/2" />
                      <Skeleton className="mb-2 h-4 w-3/4" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease }}
                  className="rounded-2xl border border-border bg-card px-6 py-16 text-center light-glow"
                >
                  {hasActiveFilters ? (
                    <>
                      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Search className="h-7 w-7 text-primary" aria-hidden="true" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight text-foreground">No roles match your filters</h2>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        Try adjusting your search or clearing a filter or two to see more openings.
                      </p>
                      <Button variant="outline" size="sm" onClick={resetFilters} className="mt-5 rounded-xl">
                        <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Reset all filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Briefcase className="h-7 w-7 text-primary" aria-hidden="true" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight text-foreground">No open roles right now</h2>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        We're not actively hiring at the moment — but new roles open often. Explore our teams and check back soon.
                      </p>
                      <Button size="sm" asChild className="mt-5 h-11 rounded-xl px-6">
                        <Link to="/">
                          <Compass className="mr-2 h-4 w-4" aria-hidden="true" />
                          Browse by team
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </>
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
