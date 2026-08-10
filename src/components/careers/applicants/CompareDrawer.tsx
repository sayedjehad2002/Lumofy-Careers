import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { Applicant } from "@/types/careers";
import CandidateCompareView from "./CandidateCompareView";

interface CompareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicants: Applicant[];
  selectedIds: ReadonlySet<string>;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/**
 * Side-by-side over the current selection.
 *
 * This is where the old "AI Compare" and "Pinned" tabs land. They were two
 * separate destinations comparing the same six fields, and Pinned ran off an
 * ephemeral pin set that was lost on every tab switch — so the feature was
 * quietly broken. Comparison is something you do TO a selection, not a place you
 * visit, so it opens over the list you selected in.
 *
 * Read-only: nothing here writes, so there is no partial-failure state.
 */
export default function CompareDrawer({
  open, onOpenChange, applicants, selectedIds, onRemove, onClear,
}: CompareDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-3">
          <SheetTitle>Comparing {selectedIds.size} candidate{selectedIds.size === 1 ? "" : "s"}</SheetTitle>
          <SheetDescription>
            Remove anyone from the comparison to drop them from the selection too.
          </SheetDescription>
        </SheetHeader>
        <CandidateCompareView
          applicants={applicants}
          pinnedIds={selectedIds as Set<string>}
          onUnpin={onRemove}
          onClearAll={() => { onClear(); onOpenChange(false); }}
        />
      </SheetContent>
    </Sheet>
  );
}
