import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import { activeFilterCount, NO_FILTERS, type RosterFilterState } from "@/lib/applicantMetrics";
import { STATUS_COLORS } from "../statusColors";

interface RosterFiltersProps {
  value: RosterFilterState;
  onChange: (next: RosterFilterState) => void;
}

/**
 * The filters the chips cannot express: a specific stage, a score band, a date
 * window.
 *
 * Deliberately four controls, not eight. The page it replaces also offered a
 * ranking-tier filter (the same 85/70/50 cut as the score range, twice) and a
 * nationality filter over a field recorded on 87 of 367 candidates.
 */
export default function RosterFilters({ value, onChange }: RosterFiltersProps) {
  const active = activeFilterCount(value);
  const set = (patch: Partial<RosterFilterState>) => onChange({ ...value, ...patch });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-xl text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums text-primary-foreground">
              {active}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Filters
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-[11px]"
            disabled={active === 0}
            onClick={() => onChange(NO_FILTERS)}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="roster-stage">Stage</label>
          <Select
            value={value.stage}
            onValueChange={(v) => set({ stage: v as ApplicantStatus | "all" })}
          >
            <SelectTrigger id="roster-stage" className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any stage</SelectItem>
              {APPLICANT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s.value] }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-foreground">AI fit score</span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {value.scoreMin}–{value.scoreMax}
            </span>
          </div>
          <Slider
            value={[value.scoreMin, value.scoreMax]}
            min={0}
            max={100}
            step={5}
            onValueChange={([min, max]) => set({ scoreMin: min, scoreMax: max })}
            aria-label="AI fit score range"
          />
          {/* Says the quiet part out loud: narrowing the range hides everyone who
              has not been scored. The old filter silently included them. */}
          {(value.scoreMin > 0 || value.scoreMax < 100) && (
            <p className="text-[10px] text-muted-foreground">
              Unscored candidates are excluded while a range is set.
            </p>
          )}
        </div>

        {/* Stacked, not side by side. A native date input needs ~130px before its
            calendar button, so two of them plus a separator overflowed the
            popover and clipped the second one against its right edge. */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">Applied between</span>
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
            <label htmlFor="roster-applied-from" className="text-[11px] text-muted-foreground">From</label>
            <Input
              id="roster-applied-from"
              type="date"
              value={value.appliedFrom}
              max={value.appliedTo || undefined}
              onChange={(e) => set({ appliedFrom: e.target.value })}
              className="h-8 w-full min-w-0 text-xs"
            />
            <label htmlFor="roster-applied-to" className="text-[11px] text-muted-foreground">To</label>
            <Input
              id="roster-applied-to"
              type="date"
              value={value.appliedTo}
              min={value.appliedFrom || undefined}
              onChange={(e) => set({ appliedTo: e.target.value })}
              className="h-8 w-full min-w-0 text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
