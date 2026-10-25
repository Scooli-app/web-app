"use client";

import { Input } from "@/components/ui/input";
import { MAX_LENGTHS } from "@/shared/config/constants";
import { useState } from "react";

/** The document title in an editor's top bar: a line of text that becomes an input on click. */
export function InlineTitle({ title, onSave, disabled }: { title: string; onSave: (title: string) => Promise<void>; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const commit = () => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== title) void onSave(next);
    else setValue(title);
  };
  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        maxLength={MAX_LENGTHS.DOCUMENT_TITLE}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className="h-8 max-w-md text-sm font-semibold"
      />
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setValue(title);
        setEditing(true);
      }}
      className="min-w-0 truncate rounded px-1 -mx-1 text-left text-sm font-semibold text-foreground enabled:hover:bg-accent"
      title={title}
    >
      {title}
    </button>
  );
}
