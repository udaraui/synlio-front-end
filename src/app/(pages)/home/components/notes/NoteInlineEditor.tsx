"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  X,
  Loader2,
  Save,
  Palette,
  CornerDownLeft,
} from "lucide-react";
import { NOTE_COLORS, type NoteColorId } from "./NoteCard";

interface NoteInlineEditorProps {
  initialContent?: string;
  saving?: boolean;
  onSave: (content: string, color: NoteColorId) => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}

export default function NoteInlineEditor({
  initialContent = "",
  saving = false,
  onSave,
  onCancel,
  autoFocus = true,
}: NoteInlineEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialContent);
  const [noteColor, setNoteColor] = useState<NoteColorId>("default");

  // Ref so the keyboard handler always calls the latest save fn
  const saveRef = React.useRef<() => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Write a note…" }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[103px] p-2 outline-none focus:outline-none text-sm",
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
    autofocus: autoFocus ? "end" : false,
    onUpdate({ editor }) {
      setIsEmpty(editor.isEmpty);
    },
  });

  // Sync content when switching to edit mode
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
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
        .setLink({
          href: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`,
        })
        .run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  };

  const handleSave = async () => {
    await onSave(editor?.getHTML() ?? "", noteColor);
  };
  // Keep ref pointed at latest handleSave (and guard: don't save when empty)
  saveRef.current = () => { if (!isEmpty && !saving) void handleSave(); };

  const colorCfg = NOTE_COLORS.find((c) => c.id === noteColor) ?? NOTE_COLORS[0];

  const cardStyle: React.CSSProperties = colorCfg.bg
    ? { backgroundColor: colorCfg.bg, borderColor: colorCfg.border }
    : {};

  const barStyle: React.CSSProperties = colorCfg.bg
    ? { backgroundColor: `color-mix(in srgb, ${colorCfg.bg} 80%, #000 5%)` }
    : {};

  const barClass = colorCfg.bg
    ? "flex items-center gap-1 px-1.5 py-1"
    : "flex items-center gap-1 bg-muted/30 px-1.5 py-1";

  return (
    <div
      className="flex flex-col overflow-hidden transition-colors"
      style={colorCfg.bg ? cardStyle : undefined}
    >
      {/* Editor */}
      <div className="cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>

      {/* Bottom action bar */}
      <div className={barClass} style={colorCfg.bg ? barStyle : undefined}>
        {/* Left: formatting toggles */}
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("bold") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("italic") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("underline") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm" variant="ghost"
                className={`h-6 w-6 p-0 hover:bg-transparent ${editor?.isActive("link") ? "text-foreground" : "text-muted-foreground"} hover:text-foreground`}
                title="Link"
              >
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
                    placeholder="https://..."
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
                    }}
                  >
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
            title="New line (Shift+Enter)"
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Right: colour picker + cancel + save */}
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {/* Color picker */}
          <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm" variant="ghost"
                title="Note color"
                className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
                aria-label="Note color"
              >
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end" side="top">
              {/*<p className="text-xs text-muted-foreground mb-1.5">Note color</p>*/}
              <div className="grid grid-cols-4 gap-1.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => { setNoteColor(c.id as NoteColorId); setPaletteOpen(false); }}
                    className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${
                      noteColor === c.id ? "ring-2 ring-offset-1 ring-foreground/40 scale-110" : ""
                    } ${c.dot}`}
                    style={
                      c.bg
                        ? { backgroundColor: c.bg, borderColor: c.border }
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

          <Button
            size="sm" variant="ghost" title="Cancel"
            className="h-6 w-6 p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
            onClick={onCancel}
            disabled={saving || isEmpty}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" variant="ghost" title="Save"
            className="h-6 w-6 p-0 hover:bg-transparent text-primary hover:text-primary/80"
            onClick={handleSave}
            disabled={saving || isEmpty}
            aria-label="Save"
          >
            {saving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
