import { useState, useRef, useEffect } from "react";
import { Loader2, Pencil } from "lucide-react";

interface EditableTextProps {
  value: string;
  /** Persist the new (trimmed) value. Throw to keep the field in edit mode for a retry. */
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  /** Classes applied to BOTH the display text and the input, so the field reads the same. */
  className?: string;
  inputType?: "text" | "email" | "tel" | "url";
  ariaLabel?: string;
}

/**
 * Click-to-edit text, Notion-style: shows the value with a faint pencil on hover;
 * clicking turns it into an input that auto-saves on blur or Enter and cancels on
 * Escape. No-op save when the value is unchanged.
 */
export default function EditableText({
  value, onSave, placeholder = "—", className = "", inputType = "text", ariaLabel,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      // focus + select after the input mounts
      requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
    }
  }, [editing, value]);

  const commit = async () => {
    if (saving) return;
    const next = draft.trim();
    if (next === (value || "").trim()) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(next); setEditing(false); }
    catch { /* parent surfaces the error; stay in edit mode for a retry */ }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <span className="inline-flex w-full items-center gap-1.5">
        <input
          ref={inputRef}
          type={inputType}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }}
          className={`w-full min-w-0 rounded-md border border-primary/40 bg-background px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
          aria-label={ariaLabel}
        />
        {saving && <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-primary" aria-hidden="true" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group/edit -mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 text-left transition-colors hover:bg-[hsl(var(--intel-card-hover))]`}
      aria-label={ariaLabel ? `Edit ${ariaLabel}` : "Edit"}
    >
      <span className={`truncate ${value ? "" : "text-muted-foreground/50"} ${className}`}>{value || placeholder}</span>
      <Pencil className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover/edit:opacity-50" aria-hidden="true" />
    </button>
  );
}
