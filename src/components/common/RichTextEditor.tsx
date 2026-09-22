'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link as Link2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  className,
  editorClassName,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-1 text-base md:text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  }, [placeholder]);

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleAddLink = () => {
    if (linkUrl) {
      // If there's selected text, add link to it
      if (linkText) {
        editor.chain().focus().insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href: linkUrl } }],
        }).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }

      // Reset and close
      setLinkUrl('');
      setLinkText('');
      setIsLinkPopoverOpen(false);
    }
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
    setIsLinkPopoverOpen(false);
  };

  const openLinkPopover = () => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '');

    // Get current link if cursor is on one
    const attrs = editor.getAttributes('link');
    if (attrs.href) {
      setLinkUrl(attrs.href);
      setLinkText(text);
    } else if (text) {
      setLinkText(text);
      setLinkUrl('');
    } else {
      setLinkText('');
      setLinkUrl('');
    }

    setIsLinkPopoverOpen(true);
  };

  return (
    <div className={cn('border rounded-md overflow-hidden bg-white dark:bg-gray-900', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        {/* Text formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bold') && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('italic') && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('underline') && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bulletList') && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('orderedList') && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'left' }) && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'center' }) && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'right' }) && 'bg-muted'
          )}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link */}
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                editor.isActive('link') && 'bg-muted'
              )}
              onClick={openLinkPopover}
              title="Add Link"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Add Link</h4>
                <p className="text-xs text-muted-foreground">
                  {editor.isActive('link')
                    ? 'Edit or remove the link'
                    : 'Add a link to your text'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="link-text" className="text-xs">
                    Text (optional)
                  </Label>
                  <Input
                    id="link-text"
                    placeholder="Link text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="link-url" className="text-xs">
                    URL *
                  </Label>
                  <Input
                    id="link-url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLink();
                      }
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  {editor.isActive('link') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLink}
                      className="h-8 text-xs text-destructive hover:text-destructive"
                    >
                      Remove Link
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLinkPopoverOpen(false);
                      setLinkUrl('');
                      setLinkText('');
                    }}
                    className="h-8 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddLink}
                    disabled={!linkUrl}
                    className="h-8 text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className={cn("min-h-[120px] overflow-y-auto", editorClassName)} />

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror {
          font-size: 16px;
          color: inherit;
        }
        
        @media (min-width: 768px) {
          .ProseMirror {
            font-size: 14px;
          }
        }
        
        .ProseMirror p {
          margin: 0;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .dark .ProseMirror {
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}

