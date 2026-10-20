import { useState, type FormEvent } from "react";
import { Plus, X, Tags } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The standing tags HR reaches for, each with a colour that carries meaning
 * (urgent is danger, top talent is success, senior is warning) or, where there
 * is no meaning to carry, one of the brand accents so they stay tellable apart.
 * Colour lives on a small dot, not the whole chip: a row of fully tinted pills
 * read as a rainbow rather than as information.
 */
const TAG_DOTS: Record<string, string> = {
  "Top Talent": "hsl(var(--intel-success))",
  "Referred": "hsl(var(--chart-1))",
  "Bahraini": "hsl(var(--chart-3))",
  "Urgent": "hsl(var(--destructive))",
  "Senior": "hsl(var(--intel-warning))",
  "Remote": "hsl(var(--chart-2))",
  "Internal": "hsl(var(--chart-4))",
};

const SUGGESTED_TAGS = Object.keys(TAG_DOTS);
const dotFor = (tag: string) => TAG_DOTS[tag] ?? "var(--dx-ink-3)";

interface Props {
  candidateId: string;
  currentTags: string[];
  onUpdateTags: (candidateId: string, tags: string[]) => void;
  compact?: boolean;
}

/** Text field + suggestions for adding a tag; shared by both layouts' popover. */
function AddTagForm({
  currentTags, onAdd, autoFocus,
}: { currentTags: string[]; onAdd: (tag: string) => void; autoFocus?: boolean }) {
  const [value, setValue] = useState("");
  const remaining = SUGGESTED_TAGS.filter((t) => !currentTags.includes(t));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
  };
  return (
    <div className="tg-form">
      <form onSubmit={submit} className="tg-form__row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a tag and press Enter"
          aria-label="New tag"
          className="tg-form__input"
          autoFocus={autoFocus}
          maxLength={40}
        />
        <button type="submit" className="tg-form__add" disabled={!value.trim()}>Add</button>
      </form>
      {remaining.length > 0 && (
        <div className="tg-form__suggest">
          <p className="tg-form__label">Suggested</p>
          <div className="tg-list">
            {remaining.map((t) => (
              <button key={t} type="button" className="tg-chip tg-chip--suggest" onClick={() => onAdd(t)}>
                <i style={{ background: dotFor(t) }} aria-hidden="true" />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateTags({ candidateId, currentTags, onUpdateTags, compact }: Props) {
  const [open, setOpen] = useState(false);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || currentTags.includes(t)) return;
    onUpdateTags(candidateId, [...currentTags, t]);
  };

  const removeTag = (tag: string) => {
    onUpdateTags(candidateId, currentTags.filter((t) => t !== tag));
  };

  // ── Compact: inside a list row. Read-only chips plus a small add button. ──
  if (compact) {
    return (
      <div className="tg-list tg-list--compact">
        {currentTags.map((t) => (
          <span key={t} className="tg-chip tg-chip--sm">
            <i style={{ background: dotFor(t) }} aria-hidden="true" />
            {t}
          </span>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="tg-add tg-add--icon" aria-label="Add a tag" title="Add a tag">
              <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <AddTagForm currentTags={currentTags} onAdd={addTag} autoFocus />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // ── Full: the profile. Applied tags first, one-click suggestions, custom in a popover. ──
  const remaining = SUGGESTED_TAGS.filter((t) => !currentTags.includes(t));
  return (
    <div className="tg">
      <div className="tg-head">
        <p className="dx-label">
          <Tags className="h-3.5 w-3.5" aria-hidden="true" />
          Tags
          {currentTags.length > 0 && <span className="dx-label__n">{currentTags.length}</span>}
        </p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="tg-add">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Custom tag
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <AddTagForm currentTags={currentTags} onAdd={(t) => { addTag(t); setOpen(false); }} autoFocus />
          </PopoverContent>
        </Popover>
      </div>

      {currentTags.length > 0 ? (
        <ul className="tg-list" aria-label="Applied tags">
          {currentTags.map((t) => (
            <li key={t} className="tg-chip tg-chip--on">
              <i style={{ background: dotFor(t) }} aria-hidden="true" />
              {t}
              <button type="button" className="tg-chip__x" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tg-empty">No tags yet. Tags make this person easy to find again from Smart search and saved filters.</p>
      )}

      {remaining.length > 0 && (
        <div className="tg-quick">
          <span className="tg-quick__label">Quick add</span>
          <div className="tg-list">
            {remaining.map((t) => (
              <button key={t} type="button" className="tg-chip tg-chip--suggest" onClick={() => addTag(t)} aria-label={`Add tag ${t}`}>
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
