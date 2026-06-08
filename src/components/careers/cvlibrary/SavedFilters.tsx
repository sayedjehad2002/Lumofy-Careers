import { useState, useEffect } from "react";
import { Bookmark, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export interface SavedFilter {
  id: string;
  name: string;
  searchQuery: string;
  filterDept: string;
  filterStatus: string;
  filterConfidence: string;
  sortBy: string;
  selectedFolder: string;
  createdAt: string;
}

interface Props {
  currentFilters: {
    searchQuery: string;
    filterDept: string;
    filterStatus: string;
    filterConfidence: string;
    sortBy: string;
    selectedFolder: string;
  };
  onApply: (f: SavedFilter) => void;
}

const STORAGE_KEY = "cv-library-saved-filters";

export default function SavedFilters({ currentFilters, onApply }: Props) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFilters(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (list: SavedFilter[]) => {
    setFilters(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      ...currentFilters,
      createdAt: new Date().toISOString(),
    };
    save([newFilter, ...filters]);
    setNewName("");
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    save(filters.filter(f => f.id !== id));
  };

  const hasActiveFilters = currentFilters.searchQuery || currentFilters.filterDept !== "all" ||
    currentFilters.filterStatus !== "all" || currentFilters.filterConfidence !== "all" ||
    currentFilters.selectedFolder !== "all";

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Saved Views:</span>

        {filters.map(f => (
          <div key={f.id} className="flex items-center gap-0.5">
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => onApply(f)}>
              {f.name}
            </Button>
            <button onClick={() => handleDelete(f.id)} className="text-muted-foreground hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => setShowSave(true)}>
            <Plus className="w-3 h-3" /> Save current
          </Button>
        )}

        {filters.length === 0 && !hasActiveFilters && (
          <span className="text-[10px] text-muted-foreground italic">Apply filters then save as a view</span>
        )}
      </div>

      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save Filter View</DialogTitle></DialogHeader>
          <Input placeholder="e.g. Senior Engineers in Bahrain" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()} />
          <div className="text-xs text-muted-foreground space-y-1">
            {currentFilters.searchQuery && <p>Search: "{currentFilters.searchQuery}"</p>}
            {currentFilters.filterDept !== "all" && <p>Department: {currentFilters.filterDept}</p>}
            {currentFilters.filterStatus !== "all" && <p>Status: {currentFilters.filterStatus}</p>}
            {currentFilters.filterConfidence !== "all" && <p>Confidence: {currentFilters.filterConfidence}</p>}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={handleSave} disabled={!newName.trim()}>
              <Check className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
