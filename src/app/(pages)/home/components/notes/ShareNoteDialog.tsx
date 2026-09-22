"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Search, Loader2, Check } from "lucide-react";
import { load } from "@/services/user-service";
import { getNoteShareList, shareNote, type SharedUser } from "@/services/notes.service";
import { useDebounce } from "@/hooks/use-debounce";
import { API_URL } from "@/services/API/api";
import { useAuth } from "@/contexts/auth.context";

interface ShareNoteDialogProps {
  open: boolean;
  noteId: number | null;
  onClose: () => void;
  onShared?: () => void;
}

interface UserSearchResult {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function buildAvatarUrl(pic?: string): string | undefined {
  if (!pic) return undefined;
  if (pic.startsWith("http")) return pic;
  return `${API_URL}/${pic.replace(/^\//, "")}`;
}

export default function ShareNoteDialog({
  open,
  noteId,
  onClose,
  onShared,
}: ShareNoteDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<SharedUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const debouncedSearch = useDebounce(search, 300);

  // Load current share list when dialog opens
  useEffect(() => {
    if (open && noteId) {
      getNoteShareList(noteId).then(({ sharedWith }) => {
        setSelected(sharedWith);
      }).catch(() => setSelected([]));
    }
    if (!open) {
      setSearch("");
      setResults([]);
      setSelected([]);
      setDropdownOpen(false);
    }
  }, [open, noteId]);

  // Search users
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    load({
      filters: [
        { field: "first_name", matchMode: "contains", value: debouncedSearch },
      ],
      rows: 10,
      page: 0,
    })
      .then(({ data }) => {
        // deduplicate by id and hide the logged-in user from results
        const seen = new Set<number>();
        const all = (data as UserSearchResult[]).filter((u) => {
          if (u.id === user?.id) return false;
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        setResults(all);
        setDropdownOpen(all.length > 0);
      })
      .catch(() => {
        setResults([]);
        setDropdownOpen(false);
      })
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const addUser = (user: UserSearchResult) => {
    const isSelected = selected.some((s) => s.userId === user.id);
    if (isSelected) {
      setSelected((prev) => prev.filter((s) => s.userId !== user.id));
    } else {
      setSelected((prev) => [
        ...prev,
        {
          userId: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        },
      ]);
    }
    // keep search open so user can toggle more
  };

  const removeUser = (userId: number) => {
    setSelected((prev) => prev.filter((s) => s.userId !== userId));
  };

  const handleSave = async () => {
    if (!noteId) return;
    setSaving(true);
    try {
      await shareNote(
        noteId,
        selected.map((s) => s.userId)
      );
      onShared?.();
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
        </DialogHeader>

        {/* Selected users */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {selected.map((u) => (
              <Badge
                key={u.userId}
                variant="secondary"
                className="flex items-center gap-1 pl-0.5 pr-1 text-xs"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">
                    {getInitials(u.first_name, u.last_name)}
                  </AvatarFallback>
                </Avatar>
                {u.first_name} {u.last_name}
                <button
                  onClick={() => removeUser(u.userId)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="Search users by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Shadcn Command dropdown results */}
        {dropdownOpen && results.length > 0 && (
          <div className="border rounded-md shadow-sm overflow-hidden">
            <Command shouldFilter={false}>
              <CommandList className="max-h-48">
                <CommandGroup>
                  {results.map((u) => {
                    const isChecked = selected.some((s) => s.userId === u.id);
                    return (
                    <CommandItem
                      key={u.id}
                      value={String(u.id)}
                      onSelect={() => addUser(u)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {u.profile_picture && (
                          <AvatarImage
                            src={buildAvatarUrl(u.profile_picture)}
                            alt={`${u.first_name} ${u.last_name}`}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(u.first_name, u.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                      {isChecked && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandEmpty className="py-3 text-sm text-center text-muted-foreground">
                  No users found.
                </CommandEmpty>
              </CommandList>
            </Command>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />Sharing…</>
            ) : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

