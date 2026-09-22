import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormLabel, FormMessage } from "./form";

function InlineCheckboxMulti({
  label,
  items,                  // [{ id:number, label:string }]
  value,                  // number[]
  onChange,               // (ids:number[]) => void
  placeholder = "Select...",
  maxHeight = 240,
}: {
  label: string;
  items: { id: number; label: string }[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  maxHeight?: number;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };

  // close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-2">
      <FormLabel>{label}</FormLabel>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setOpen(s => !s)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {value.length ? `${value.length} selected` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>

        {open && (
          <div
            className={cn(
              "absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
            )}
            style={{ maxHeight, overflow: "auto" }}
            role="listbox"
          >
            <ScrollArea className="w-full">
              <ul className="p-2 space-y-1">
                {items.length === 0 && (
                  <li className="px-2 py-1 text-sm text-muted-foreground">No items.</li>
                )}
                {items.map((it) => {
                  const checked = value.includes(it.id);
                  return (
                    <li
                      key={it.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                      onClick={() => toggle(it.id)}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(it.id)} />
                      <span className="text-sm">{it.label}</span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
            <div className="border-t p-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => onChange([])}>
                Clear
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      <FormMessage />
    </div>
  );
}

export default InlineCheckboxMulti;