import { useState } from "react";
import { Tag, Plus, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHART_SOFT_BORDERED, TONE_SOFT, TONE_BORDER } from "@/components/careers/statusColors";

const TAG_COLORS: Record<string, string> = {
  "Top Talent": `${TONE_SOFT.success} ${TONE_BORDER.success} border`,
  "Referred": CHART_SOFT_BORDERED[0],
  "Bahraini": CHART_SOFT_BORDERED[2],
  "Urgent": `${TONE_SOFT.danger} ${TONE_BORDER.danger} border`,
  "Senior": `${TONE_SOFT.warning} ${TONE_BORDER.warning} border`,
  "Remote": CHART_SOFT_BORDERED[1],
  "Internal": CHART_SOFT_BORDERED[3],
};

const SUGGESTED_TAGS = Object.keys(TAG_COLORS);

interface Props {
  candidateId: string;
  currentTags: string[];
  onUpdateTags: (candidateId: string, tags: string[]) => void;
  compact?: boolean;
}

export default function CandidateTags({ candidateId, currentTags, onUpdateTags, compact }: Props) {
  const [newTag, setNewTag] = useState("");

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || currentTags.includes(t)) return;
    onUpdateTags(candidateId, [...currentTags, t]);
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    onUpdateTags(candidateId, currentTags.filter(t => t !== tag));
  };

  const getColor = (tag: string) => TAG_COLORS[tag] || "bg-secondary text-foreground border-border";

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {currentTags.map(t => (
          <Badge key={t} variant="outline" className={`text-[10px] ${getColor(t)}`}>
            <Tag className="w-2.5 h-2.5 mr-0.5" />{t}
          </Badge>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <Input
              placeholder="Add tag..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag(newTag)}
              className="h-7 text-xs mb-2"
            />
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter(t => !currentTags.includes(t)).map(t => (
                <button key={t} onClick={() => addTag(t)}>
                  <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 ${getColor(t)}`}>{t}</Badge>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase">Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {currentTags.map(t => (
          <Badge key={t} variant="outline" className={`text-xs ${getColor(t)}`}>
            <Tag className="w-3 h-3 mr-1" />{t}
            <button onClick={() => removeTag(t)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add custom tag..."
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTag(newTag)}
          className="h-7 text-xs flex-1"
        />
        <Button size="sm" className="h-7 text-xs" onClick={() => addTag(newTag)} disabled={!newTag.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {SUGGESTED_TAGS.filter(t => !currentTags.includes(t)).map(t => (
          <button key={t} onClick={() => addTag(t)}>
            <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 ${getColor(t)}`}>+ {t}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
