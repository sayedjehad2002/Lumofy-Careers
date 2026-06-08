import { useState } from "react";
import { Search, X, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TONE_SOFT } from "@/components/careers/statusColors";

interface Props {
  onSearch: (query: string, parsed: ParsedQuery) => void;
}

export interface ParsedQuery {
  include: string[];
  exclude: string[];
  raw: string;
}

function parseQuery(raw: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];

  if (!raw.trim()) return { include: [], exclude: [], raw };

  // Split by AND (case insensitive)
  const andParts = raw.split(/\s+AND\s+/i);

  for (const part of andParts) {
    // Check for NOT
    const notParts = part.split(/\s+NOT\s+/i);
    const positive = notParts[0]?.trim();
    if (positive) include.push(positive.toLowerCase());
    for (let i = 1; i < notParts.length; i++) {
      const neg = notParts[i]?.trim();
      if (neg) exclude.push(neg.toLowerCase());
    }
  }

  return { include, exclude, raw };
}

export default function SmartSearch({ onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const handleSearch = (val: string) => {
    setQuery(val);
    const parsed = parseQuery(val);
    onSearch(val, parsed);
  };

  const handleSubmit = () => {
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches(prev => [query.trim(), ...prev].slice(0, 5));
    }
  };

  const parsed = parseQuery(query);

  return (
    <div className="space-y-2">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder='Smart search: "Python AND Finance NOT Junior"'
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="pl-9 pr-8"
          />
          {query && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => handleSearch("")}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              <p className="font-semibold mb-1">Boolean Search Operators</p>
              <p><strong>AND</strong>: all terms must match</p>
              <p><strong>NOT</strong>: exclude terms</p>
              <p className="mt-1 text-muted-foreground">Example: Python AND Finance NOT Junior</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Active query tokens */}
      {(parsed.include.length > 0 || parsed.exclude.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {parsed.include.map((t, i) => (
            <Badge key={`inc-${i}`} variant="secondary" className={`text-[10px] ${TONE_SOFT.success}`}>
              + {t}
            </Badge>
          ))}
          {parsed.exclude.map((t, i) => (
            <Badge key={`exc-${i}`} variant="secondary" className={`text-[10px] ${TONE_SOFT.danger}`}>
              − {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && !query && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Recent:</span>
          {recentSearches.map((s, i) => (
            <button key={i} onClick={() => handleSearch(s)} className="text-[10px] text-primary hover:underline">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export { parseQuery };
