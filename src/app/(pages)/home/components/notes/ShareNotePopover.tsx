"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { load } from "@/services/user-service";
import { getNoteShareList, shareNote } from "@/services/notes.service";
import { API_URL } from "@/services/API/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth.context";

interface ShareNotePopoverProps {
  noteId: number;
  onShared?: () => void;
}

interface UserResult {
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

function UserAvatar({ user }: { user: UserResult }) {
  const url = buildAvatarUrl(user.profile_picture);
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center font-medium flex-shrink-0 overflow-hidden text-[10px] bg-primary text-primary-foreground">
      {url ? (
        <img
          src={url}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        getInitials(user.first_name, user.last_name)
      )}
    </div>
  );
}

export default function ShareNotePopover({ noteId, onShared }: ShareNotePopoverProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [usersMap, setUsersMap] = useState<Map<number, UserResult>>(new Map());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [initialIds, setInitialIds] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load current share list when popover opens
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }
    getNoteShareList(noteId)
      .then(({ sharedWith }) => {
        const ids = sharedWith.map((u) => u.userId);
        setSelectedIds(ids);
        setInitialIds(ids);
        setUsersMap((prev) => {
          const next = new Map(prev);
          sharedWith.forEach((u) => {
            next.set(u.userId, {
              id: u.userId,
              first_name: u.first_name,
              last_name: u.last_name,
              email: u.email,
              profile_picture: u.profile_picture,
            });
          });
          return next;
        });
      })
      .catch(() => { setSelectedIds([]); setInitialIds([]); });
  }, [open, noteId]);

  // Search users
  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults([]); return; }
    setSearching(true);
    load({
      filters: [{ field: "first_name", matchMode: "contains", value: debouncedSearch }],
      rows: 10, page: 0,
    })
      .then(({ data }) => {
        const seen = new Set<number>();
        const deduped = (data as UserResult[]).filter((u) => {
          if (u.id === user?.id) return false;
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        setSearchResults(deduped);
        setUsersMap((prev) => {
          const next = new Map(prev);
          deduped.forEach((u) => next.set(u.id, u));
          return next;
        });
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const handleToggle = async (userId: number) => {
    const isCurrentlySelected = selectedIds.includes(userId);

    if (isCurrentlySelected) {
      // Unchecking a shared user — remove and auto-save immediately
      const newIds = selectedIds.filter((id) => id !== userId);
      setSelectedIds(newIds);
      setSaving(true);
      try {
        await shareNote(noteId, newIds);
        setInitialIds(newIds);
        onShared?.();
      } catch {
        // Revert on failure
        setSelectedIds(selectedIds);
      } finally {
        setSaving(false);
      }
    } else {
      // Checking a new user — just stage the selection (saved via Share button)
      setSelectedIds((prev) => [...prev, userId]);
    }
  };

  const hasChanged = useMemo(() => {
    if (selectedIds.length !== initialIds.length) return true;
    return selectedIds.some((id) => !initialIds.includes(id));
  }, [selectedIds, initialIds]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await shareNote(noteId, selectedIds);
      setInitialIds(selectedIds);
      setOpen(false);
      onShared?.();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedIds(initialIds);
    setSearchQuery("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && hasChanged) setSelectedIds(initialIds);
    setOpen(next);
  };

  // When not searching: show selected users. When searching: show search results.
  const displayedUsers: UserResult[] = useMemo(() => {
    if (debouncedSearch.trim()) return searchResults;
    return selectedIds.map((id) => usersMap.get(id)).filter((u): u is UserResult => !!u);
  }, [debouncedSearch, searchResults, selectedIds, usersMap]);

  const sortedUsers = useMemo(() => {
    return [...displayedUsers].sort((a, b) => {
      const aVal = selectedIds.includes(a.id) ? 0 : 1;
      const bVal = selectedIds.includes(b.id) ? 0 : 1;
      return aVal - bVal;
    });
  }, [displayedUsers, selectedIds]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          size="sm" variant="ghost" title="Share"
          className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[300px] p-0" align="end" side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search users…"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-52">
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && sortedUsers.length === 0 && (
              <CommandEmpty>
                {debouncedSearch.trim() ? "No users found." : "No users shared yet. Search to add."}
              </CommandEmpty>
            )}
            {!searching && sortedUsers.length > 0 && (
              <CommandGroup>
                {sortedUsers.map((u, index) => {
                  const isSelected = selectedIds.includes(u.id);
                  const prev = sortedUsers[index - 1];
                  const showDivider = index > 0 && selectedIds.includes(prev.id) && !isSelected;
                  return (
                    <React.Fragment key={u.id}>
                      {showDivider && (
                        <div className="px-2 py-1 bg-muted/40">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Other users
                          </span>
                        </div>
                      )}
                      <CommandItem
                        value={`${u.first_name} ${u.last_name} ${u.email}`}
                        onSelect={() => handleToggle(u.id)}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")} />
                        <div className="flex items-center gap-2">
                          <UserAvatar user={u} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm truncate">{u.first_name} {u.last_name}</span>
                            {u.email && (
                              <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    </React.Fragment>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer — Share/Cancel only active when selection has changed */}
          <div className="flex items-center justify-end gap-1.5 p-2 border-t">
            {/*<Button*/}
            {/*  size="sm" variant="ghost" className="h-6 text-xs px-2"*/}
            {/*  onClick={handleCancel} disabled={saving || !hasChanged}*/}
            {/*>*/}
            {/*  Cancel*/}
            {/*</Button>*/}
            <Button
              size="sm" className="h-6 text-xs px-2"
              onClick={handleSave} disabled={saving || !hasChanged}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Share"}
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
