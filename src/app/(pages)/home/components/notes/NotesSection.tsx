"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, Search, StickyNote } from "lucide-react";
import {
  getMyNotes,
  getSharedWithMe,
  createNote,
  updateNote,
  deleteNote,
  type NoteItem,
} from "@/services/home/notes.service";
import NoteCard from "./NoteCard";
import NoteInlineEditor from "./NoteInlineEditor";
import ShareNoteDialog from "./ShareNoteDialog";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function NotesSection() {
  const [myNotes, setMyNotes] = useState<NoteItem[]>([]);
  const [sharedNotes, setSharedNotes] = useState<NoteItem[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);

  const [activeTab, setActiveTab] = useState<"my" | "sharedByMe" | "shared">("my");
  const [expandedSharedByMeId, setExpandedSharedByMeId] = useState<number | null>(null);

  // Derived state to split myNotes
  const unsharedNotes = myNotes.filter((n: any) => !n.sharedWith || n.sharedWith.length === 0);
  const sharedByMeNotes = myNotes.filter((n: any) => n.sharedWith && n.sharedWith.length > 0);

  // Search bars for tabs
  const [mySearch, setMySearch] = useState("");
  const [sharedByMeSearch, setSharedByMeSearch] = useState("");
  const [sharedSearch, setSharedSearch] = useState("");
  const matchesSearch = (note: NoteItem, query: string) =>
    !query.trim() ||
    stripHtml(note.content ?? "").toLowerCase().includes(query.trim().toLowerCase());
  const filteredUnsharedNotes = unsharedNotes.filter((n) => matchesSearch(n, mySearch));
  const filteredSharedByMeNotes = sharedByMeNotes.filter((n) => matchesSearch(n, sharedByMeSearch));
  const filteredSharedNotes = sharedNotes.filter((n) => matchesSearch(n, sharedSearch));

  // Accordion: which note id is expanded (null = all collapsed)
  const [expandedMyId, setExpandedMyId] = useState<number | null>(null);
  const [expandedSharedId, setExpandedSharedId] = useState<number | null>(null);

  // Inline create card at top
  const [savingNew, setSavingNew] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // bump to reset editor

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingNoteId, setSharingNoteId] = useState<number | null>(null);

  // Info hover popover
  const [infoOpen, setInfoOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const handleInfoEnter = () => { cancelTimers(); openTimer.current = setTimeout(() => setInfoOpen(true), 200); };
  const handleInfoLeave = () => { cancelTimers(); closeTimer.current = setTimeout(() => setInfoOpen(false), 150); };

  const fetchMyNotes = useCallback(async () => {
    setLoadingMy(true);
    try {
      setMyNotes(await getMyNotes());
    } catch {
      // silent
    } finally {
      setLoadingMy(false);
    }
  }, []);

  const fetchSharedNotes = useCallback(async () => {
    setLoadingShared(true);
    try {
      setSharedNotes(await getSharedWithMe());
    } catch {
      // silent
    } finally {
      setLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    void fetchMyNotes();
    void fetchSharedNotes();
  }, []);

  const toggleMy = (id: number) =>
    setExpandedMyId((prev) => (prev === id ? null : id));

  const toggleSharedByMe = (id: number) =>
    setExpandedSharedByMeId((prev) => (prev === id ? null : id));

  const toggleShared = (id: number) =>
    setExpandedSharedId((prev) => (prev === id ? null : id));

  // Create inline
  const handleCreate = async (content: string, color: import("./NoteCard").NoteColorId) => {
    setSavingNew(true);
    try {
      const created = await createNote({
        content,
        ...(color !== "default" ? { color } : {}),
      });
      // Also persist locally for instant feedback
      if (color !== "default" && typeof window !== "undefined") {
        localStorage.setItem(`note-color-${created.id}`, color);
      }
      setMyNotes((prev) => [created, ...prev]);
      setEditorKey((k) => k + 1);
      setExpandedMyId(null);
    } finally {
      setSavingNew(false);
    }
  };

  // Edit inline (called from NoteCard)
  const handleEdit = (note: NoteItem) =>
    async (content: string) => {
      const updated = await updateNote(note.id, { content });
      setMyNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    };

  const handleSaveColor = (note: NoteItem) =>
    async (color: import("./NoteCard").NoteColorId) => {
      const updated = await updateNote(note.id, { color });
      setMyNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    };

  const handleDelete = async (id: number) => {
    await deleteNote(id);
    setMyNotes((prev) => prev.filter((n) => n.id !== id));
    if (expandedMyId === id) setExpandedMyId(null);
  };

  const handleShare = (note: NoteItem) => {
    setSharingNoteId(note.id);
    setShareOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with tab switcher */}
      <div className="flex items-center justify-between p-2 border-b shrink-0">
        <div className="flex gap-1 bg-background border border-border rounded-md p-0.5 shrink-0">
          <Button
            size="sm"
            className="h-6 text-xs px-2.5"
            variant={activeTab === "my" ? "default" : "ghost"}
            onClick={() => setActiveTab("my")}
          >
            My Notes
            {unsharedNotes.length > 0 && activeTab !== "my" && (
              <span className="text-muted-foreground">{unsharedNotes.length}</span>
            )}
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2.5"
            variant={activeTab === "sharedByMe" ? "default" : "ghost"}
            onClick={() => setActiveTab("sharedByMe")}
          >
            Shared by Me
            {sharedByMeNotes.length > 0 && activeTab !== "sharedByMe" && (
              <span className="text-muted-foreground">{sharedByMeNotes.length}</span>
            )}
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2.5"
            variant={activeTab === "shared" ? "default" : "ghost"}
            onClick={() => setActiveTab("shared")}
          >
            Shared with Me
            {sharedNotes.length > 0 && activeTab !== "shared" && (
              <span className="text-muted-foreground">{sharedNotes.length}</span>
            )}
          </Button>
        </div>

        {/* Info hover card */}
        <Popover open={infoOpen} onOpenChange={setInfoOpen}>
          <PopoverTrigger asChild>
            <span
              className="inline-flex cursor-pointer"
              onMouseEnter={handleInfoEnter}
              onMouseLeave={handleInfoLeave}
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
            </span>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            className="w-64 p-3 text-xs"
            onMouseEnter={handleInfoEnter}
            onMouseLeave={handleInfoLeave}
          >
            <div className="space-y-2">
              <div className="space-y-0.5">
                <p className="text-xs font-medium">Write &amp; Edit Notes</p>
                <p className="text-muted-foreground leading-relaxed">Create and edit personal notes inline.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium">Color Code</p>
                <p className="text-muted-foreground leading-relaxed">Color code notes to organise and spotlight what matters.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium">Share</p>
                <p className="text-muted-foreground leading-relaxed">Share any note with teammates directly from the card.</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium">Shared with Me</p>
                <p className="text-muted-foreground leading-relaxed">See all notes others have shared with you in one place.</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* My Notes panel */}
      {activeTab === "my" && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Search bar — pinned above scroll area */}
          <div className="relative h-[46px] flex items-center px-3 border-b border-border shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-full w-full pl-7 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent rounded-none"
              placeholder="Search notes…"
              value={mySearch}
              onChange={(e) => setMySearch(e.target.value)}
            />
          </div>

          {/* Create form — pinned above scroll area */}
          <div className="border-b border-border shrink-0">
            <NoteInlineEditor
              key={editorKey}
              saving={savingNew}
              onSave={handleCreate}
              onCancel={() => setEditorKey((k) => k + 1)}
              autoFocus={false}
            />
          </div>

          {/* Notes list only scrolls */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col h-full">
              {loadingMy ? (
                <div className="divide-y divide-border border-b border-border">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 rounded" />
                      </div>
                      <Skeleton className="h-2.5 w-8 rounded shrink-0" />
                      <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredUnsharedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 p-4">
                  {/* <StickyNote className="h-7 w-7 text-muted-foreground/30" /> */}
                  <p className="text-sm font-medium text-muted-foreground">
                    {mySearch.trim() ? "No matching notes" : "No notes"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {mySearch.trim() ? "Try a different search." : "Write above to create one."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border-b border-border">
                  {filteredUnsharedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isExpanded={expandedMyId === note.id}
                      onToggle={toggleMy}
                      onSaveEdit={handleEdit(note)}
                      onSaveColor={handleSaveColor(note)}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onShared={() => void fetchMyNotes()}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Shared By Me panel */}
      {activeTab === "sharedByMe" && (
        <div className="flex-1 min-h-0 flex flex-col">


          {/* Search bar — pinned above scroll area */}
          <div className="relative h-[46px] flex items-center px-3 border-b border-border shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-full w-full pl-7 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent rounded-none"
              placeholder="Search notes…"
              value={sharedByMeSearch}
              onChange={(e) => setSharedByMeSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col h-full">
              {loadingMy ? (
                <div className="divide-y divide-border border-b border-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 rounded" />
                      </div>
                      <Skeleton className="h-2.5 w-8 rounded shrink-0" />
                      <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredSharedByMeNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 p-4">
                  {/* <StickyNote className="h-7 w-7 text-muted-foreground/30" /> */}
                  <p className="text-sm font-medium text-muted-foreground">
                    {sharedByMeSearch.trim() ? "No matching notes" : "No shared notes"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {sharedByMeSearch.trim() ? "Try a different search." : "You haven't shared any notes yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border-b border-border">
                  {filteredSharedByMeNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isExpanded={expandedSharedByMeId === note.id}
                      onToggle={toggleSharedByMe}
                      onSaveEdit={handleEdit(note)}
                      onSaveColor={handleSaveColor(note)}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onShared={() => void fetchMyNotes()}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Shared With Me panel */}
      {activeTab === "shared" && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Search bar — pinned above scroll area */}
          <div className="relative h-[46px] flex items-center px-3 border-b border-border shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="h-full w-full pl-7 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent rounded-none"
              placeholder="Search notes…"
              value={sharedSearch}
              onChange={(e) => setSharedSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col h-full">
              {loadingShared ? (
                <div className="divide-y divide-border border-b border-border">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-3">
                      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 rounded" />
                      </div>
                      <Skeleton className="h-2.5 w-8 rounded shrink-0" />
                      <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                    </div>
                  ))}
                </div>
              ) : filteredSharedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center gap-2 p-4">
                  {/* <StickyNote className="h-7 w-7 text-muted-foreground/30" /> */}
                  <p className="text-sm font-medium text-muted-foreground">
                    {sharedSearch.trim() ? "No matching notes" : "No shared notes"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {sharedSearch.trim() ? "Try a different search." : "No notes shared with you yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border-b border-border">
                  {filteredSharedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isExpanded={expandedSharedId === note.id}
                      onToggle={toggleShared}
                      readOnly
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Share dialog */}
      <ShareNoteDialog
        open={shareOpen}
        noteId={sharingNoteId}
        onClose={() => {
          setShareOpen(false);
          setSharingNoteId(null);
        }}
        onShared={() => void fetchMyNotes()}
      />
    </div>
  );
}
