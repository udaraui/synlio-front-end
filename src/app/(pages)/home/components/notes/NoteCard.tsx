"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Save,
  Palette,
  CornerDownLeft,
} from "lucide-react";
import type { NoteItem } from "@/services/notes.service";
import ShareNotePopover from "./ShareNotePopover";

// ─── Sticky-note color palette ──────────────────────────────────────────────
export const NOTE_COLORS = [
  { id: "default", label: "Default",  bg: "",        border: "",        dot: "" },
  { id: "yellow",  label: "Yellow",   bg: "#fef9c3", border: "#fde047", dot: "bg-yellow-300" },
  { id: "green",   label: "Green",    bg: "#dcfce7", border: "#86efac", dot: "bg-green-300" },
  { id: "blue",    label: "Blue",     bg: "#dbeafe", border: "#93c5fd", dot: "bg-blue-300" },
  { id: "pink",    label: "Pink",     bg: "#fce7f3", border: "#f9a8d4", dot: "bg-pink-300" },
  { id: "purple",  label: "Purple",   bg: "#f3e8ff", border: "#d8b4fe", dot: "bg-purple-300" },
  { id: "orange",  label: "Orange",   bg: "#ffedd5", border: "#fdba74", dot: "bg-orange-300" },
  { id: "red",     label: "Red",      bg: "#fee2e2", border: "#fca5a5", dot: "bg-red-300" },
] as const;

export type NoteColorId = (typeof NOTE_COLORS)[number]["id"];

function getNoteColor(id: NoteColorId) {
  return NOTE_COLORS.find((c) => c.id === id) ?? NOTE_COLORS[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NoteCardProps {
  note: NoteItem;
  isExpanded: boolean;
  readOnly?: boolean;
  onToggle: (id: number) => void;
  onSaveEdit?: (content: string) => Promise<void>;
  onSaveColor?: (color: NoteColorId) => Promise<void>;
  onDelete?: (id: number) => void;
  onShare?: (note: NoteItem) => void;
  onShared?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Inline editor ────────────────────────────────────────────────────────────
function NoteCardEditor({
  initialContent,
  onSave,
  onCancel,
  readOnly,
  noteId,
  onDelete,
  noteColor,
  onColorChange,
  ownerInfo,
  onShared,
}: {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
  noteId: number;
  onDelete?: () => void;
  noteColor: NoteColorId;
  onColorChange: (id: NoteColorId) => void;
  ownerInfo?: { name: string; email?: string; profilePicture?: string };
  onShared?: () => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ref so the keyboard handler always calls the latest save fn
  const saveRef = React.useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[60px] px-3 py-2 outline-none focus:outline-none text-sm",
      },
      handleKeyDown(_view, event) {
        // Enter → save · Shift+Enter → new line (handled by TipTap)
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          saveRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      setIsDirty(editor.getHTML() !== initialContent);
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const applyLink = () => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor
        ?.chain()
        .focus()
        .setLink({ href: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}` })
        .run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editor?.getHTML() ?? "");
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };
  // Keep ref pointed at latest handleSave (guard: only save when dirty)
  saveRef.current = () => { if (isDirty && !saving) void handleSave(); };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    editor?.commands.setContent(initialContent);
    setIsDirty(false);
    onCancel();
  };

  const colorCfg = getNoteColor(noteColor);
  // When a custom colour is active, replace the muted action-bar bg with a
  // very subtle dark overlay so the swatch colour shows through.
  const barStyle = colorCfg.bg
    ? { backgroundColor: `color-mix(in srgb, ${colorCfg.bg} 80%, #000 5%)`, color: "#1a1a1a" }
    : undefined;
  const barClass = colorCfg.bg
    ? "flex items-center gap-1 px-1.5 py-1"
    : "flex items-center gap-1 bg-muted/30 px-1.5 py-1";

  return (
    <div className="flex flex-col">
      {/* Editable content */}
      <div className="cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Shared-note footer: owner info instead of action bar */}
      {readOnly && ownerInfo ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate">{ownerInfo.name}</span>
            {ownerInfo.email && (
              <span className="text-[10px] text-muted-foreground truncate">{ownerInfo.email}</span>
            )}
          </div>
        </div>
      ) : (
        /* Bottom action bar */
        <div className={barClass} style={barStyle}>
          {/* Left: formatting toggles */}
          <div className="flex items-center gap-1">
            {!readOnly && (
              <>
                <Button
                  size="sm" variant="ghost"
                  className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("bold") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  title="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("italic") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  title="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("underline") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  title="Underline">
                  <UnderlineIcon className="h-3.5 w-3.5" />
                </Button>
                <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("link") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
                      title="Link">
                      <LinkIcon className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start" side="top">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-muted-foreground">URL</p>
                      <div className="flex gap-1.5">
                        <Input
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://…"
                          className="h-7 text-xs"
                          onKeyDown={(e) => { if (e.key === "Enter") applyLink(); }}
                        />
                        <Button size="sm" className="h-7 px-2 text-xs" onClick={applyLink}>
                          Apply
                        </Button>
                      </div>
                      {editor?.isActive("link") && (
                        <Button
                          size="sm" variant="ghost" className="h-6 text-destructive text-xs"
                          onClick={() => {
                            editor.chain().focus().unsetLink().run();
                            setLinkPopoverOpen(false);
                          }}>
                          Remove link
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => editor?.chain().focus().setHardBreak().run()}
                  aria-label="New line (Shift+Enter)"
                  title="New line (Shift+Enter)">
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Right: save/cancel + colour picker + share + delete */}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {isDirty && (
              <>
                <Button
                  size="sm" variant="ghost" title="Cancel"
                  className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
                  onClick={handleCancel} disabled={saving}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm" variant="ghost" title="Save"
                  className="h-6 w-6 p-0 hover:bg-transparent text-primary hover:text-primary/80"
                  onClick={handleSave} disabled={saving}>
                  {saving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Save className="h-3.5 w-3.5" />}
                </Button>
                <span className="h-4 w-px bg-border" />
              </>
            )}

            {/* Colour picker */}
            {!readOnly && (
              <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm" variant="ghost"
                    title="Note color"
                    className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}>
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2" align="end" side="top"
                  onClick={(e) => e.stopPropagation()}>
                  {/*<p className="text-xs text-muted-foreground mb-1.5">Note color</p>*/}
                  <div className="grid grid-cols-4 gap-1.5">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        title={c.label}
                        onClick={() => { onColorChange(c.id as NoteColorId); setPaletteOpen(false); }}
                        className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${
                          noteColor === c.id ? "ring-2 ring-offset-1 ring-foreground/40 scale-110" : ""
                        } ${c.dot}`}
                        style={
                          c.bg
                            ? { backgroundColor: c.bg, borderColor: noteColor === c.id ? c.border : c.border }
                            : {
                                background: "linear-gradient(135deg, #fff 50%, #e5e7eb 50%)",
                                borderColor: noteColor === c.id ? "#6b7280" : "#d1d5db",
                              }
                        }
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {!readOnly && <ShareNotePopover noteId={noteId} onShared={onShared} />}

            {!readOnly && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm" variant="ghost" title="Delete"
                    className="h-6 w-6 p-0 hover:bg-transparent text-destructive hover:text-destructive"
                    aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Note</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this note? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={onDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────
export default function NoteCard({
  note,
  isExpanded,
  readOnly = false,
  onToggle,
  onSaveEdit,
  onSaveColor,
  onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onShare,
  onShared,
}: NoteCardProps) {
  const preview = stripHtml(note.content ?? "") || "Empty note";

  // Colour state — initialised from note.color, falls back to localStorage
  const [noteColor, setNoteColor] = useState<NoteColorId>(() => {
    if (note.color) return note.color as NoteColorId;
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem(`note-color-${note.id}`) as NoteColorId) ?? "default";
  });

  const handleColorChange = (id: NoteColorId) => {
    setNoteColor(id);
    // Persist locally for instant feedback
    if (id === "default") {
      localStorage.removeItem(`note-color-${note.id}`);
    } else {
      localStorage.setItem(`note-color-${note.id}`, id);
    }
    // Auto-save to backend
    void onSaveColor?.(id);
  };

  const colorCfg = getNoteColor(noteColor);

  const cardStyle: React.CSSProperties = colorCfg.bg
    ? { backgroundColor: colorCfg.bg, color: "#1a1a1a" }
    : {};

  const cardClass = colorCfg.bg 
    ? "transition-all" 
    : "transition-all bg-muted/30 hover:bg-gray-100 dark:hover:bg-muted/50";

  return (
    <div className={cardClass} style={cardStyle}>
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-2 px-3 py-3 text-left min-w-0"
        onClick={() => onToggle(note.id)}
        style={colorCfg.bg ? { color: "#1a1a1a" } : undefined}
      >
        {/* Sender avatar — shown for shared notes */}
        {note.ownerName && (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-medium flex-shrink-0 overflow-hidden text-[9px] ${note.ownerProfilePicture ? "" : "bg-primary text-primary-foreground"}`}>
            {note.ownerProfilePicture ? (
              <img
                src={note.ownerProfilePicture}
                alt={note.ownerName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              getInitials(note.ownerName)
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Always show truncated preview */}
          <p
            className="text-xs truncate transition-colors"
            style={
              colorCfg.bg
                ? { color: isExpanded ? "rgba(26,26,26,0.45)" : "#1a1a1a" }
                : undefined
            }
          >
            {!colorCfg.bg && (
              <span className={isExpanded ? "text-muted-foreground/50" : "text-foreground"}>
                {preview.slice(0, 30)}...
              </span>
            )}
            {colorCfg.bg && <>{preview.slice(0, 30)}...</>}
          </p>
        </div>
        <span
          className="text-xs shrink-0"
          style={colorCfg.bg ? { color: "rgba(26,26,26,0.5)" } : undefined}
        >
          <span className={colorCfg.bg ? "" : "text-muted-foreground/50"}>
            {timeAgo(note.updatedAt)}
          </span>
        </span>
        {isExpanded
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0" style={colorCfg.bg ? { color: "rgba(26,26,26,0.5)" } : undefined} />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0" style={colorCfg.bg ? { color: "rgba(26,26,26,0.5)" } : undefined} />}
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <NoteCardEditor
          initialContent={note.content ?? ""}
          readOnly={readOnly}
          noteId={note.id}
          onSave={async (content) => { await onSaveEdit?.(content); }}
          onCancel={() => {}}
          onDelete={onDelete ? () => onDelete(note.id) : undefined}
          noteColor={noteColor}
          onColorChange={handleColorChange}
          onShared={onShared}
          ownerInfo={note.ownerName ? {
            name: note.ownerName,
            email: note.ownerEmail,
            profilePicture: note.ownerProfilePicture,
          } : undefined}
        />
      )}
    </div>
  );
}
