'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Edit2,
  Paperclip,
  Upload,
  Send,
  X,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Archive,
  Film,
  Music,
  File,
  FileCode,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Comment,
  createComment,
  getCommentsByPost,
  deleteComment,
  updateComment,
  uploadFile,
} from '@/services/common/comment-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CommentSectionProps {
  postId: number;
  postType: 'Task' | 'Ticket';
  onCommentCountChange?: (count: number) => void;
  /** View-only mode: hides the compose box, Reply, and the edit/delete menu. */
  readOnly?: boolean;
}

interface FormData { text: string; files: File[]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truncateFilename = (f: string): string => {
  if (!f) return f;
  const clean = f.split('?')[0].split('&')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1) return clean.length > 10 ? clean.slice(0, 5) + '...' : clean;
  const ext = clean.slice(dot), name = clean.slice(0, dot);
  return name.length <= 5 ? clean : name.slice(0, 5) + '...' + ext;
};

const getInitials = (n: string) =>
  n?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const formatDate = (d: string) => {
  const date = new Date(d), s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString();
};

const isImageUrl = (url: string): boolean => {
  const clean = url.split('?')[0].split('&')[0];
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(clean);
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const raw = decodeURIComponent(url.split('?')[0]).split('/').pop() || url;
    // Strip the "{userId}-{UUID}-" prefix added by the Azure upload helper
    // e.g. "42-550e8400-e29b-41d4-a716-446655440000-report.pdf" → "report.pdf"
    return raw.replace(/^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
  } catch {
    return url;
  }
};

const getFileTypeInfo = (
  fileName: string,
): { icon: LucideIcon; bg: string; color: string; label: string } => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')
    return { icon: FileText, bg: 'bg-red-500/10', color: 'text-red-500', label: 'PDF' };
  if (['xlsx', 'xls'].includes(ext))
    return { icon: FileSpreadsheet, bg: 'bg-green-500/10', color: 'text-green-600', label: ext.toUpperCase() };
  if (ext === 'csv')
    return { icon: FileSpreadsheet, bg: 'bg-emerald-500/10', color: 'text-emerald-600', label: 'CSV' };
  if (['doc', 'docx'].includes(ext))
    return { icon: FileText, bg: 'bg-blue-500/10', color: 'text-blue-500', label: ext.toUpperCase() };
  if (['ppt', 'pptx'].includes(ext))
    return { icon: Paperclip, bg: 'bg-orange-500/10', color: 'text-orange-500', label: ext.toUpperCase() };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
    return { icon: Archive, bg: 'bg-yellow-500/10', color: 'text-yellow-600', label: ext.toUpperCase() };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext))
    return { icon: Film, bg: 'bg-purple-500/10', color: 'text-purple-500', label: ext.toUpperCase() };
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext))
    return { icon: Music, bg: 'bg-pink-500/10', color: 'text-pink-500', label: ext.toUpperCase() };
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'php'].includes(ext))
    return { icon: FileCode, bg: 'bg-cyan-500/10', color: 'text-cyan-600', label: ext.toUpperCase() };
  if (['txt', 'md', 'log'].includes(ext))
    return { icon: FileText, bg: 'bg-muted', color: 'text-muted-foreground', label: ext.toUpperCase() };
  return { icon: File, bg: 'bg-muted', color: 'text-muted-foreground', label: ext.toUpperCase() || 'FILE' };
};

// ─── Shared: drag & drop / paste handlers for a compose box ──────────────────

function useFileDropZone(onFilesAdd: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) onFilesAdd(droppedFiles);
  };

  useEffect(() => {
    if (!isHovering) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      const pastedFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length === 0) return;
      e.preventDefault();
      onFilesAdd(pastedFiles);
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [isHovering, onFilesAdd]);

  return {
    isDragging,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onMouseEnter: () => setIsHovering(true),
      onMouseLeave: () => setIsHovering(false),
    },
  };
}

// ─── Shared: pending (not-yet-uploaded) file preview grid ────────────────────

function PendingFileGrid({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="grid grid-cols-4 gap-1.5 px-2.5 pb-1.5">
      {files.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : null;
        const typeInfo = getFileTypeInfo(file.name);
        const TypeIcon = typeInfo.icon;
        return (
          <div
            key={`pending-${index}-${file.name}`}
            className="relative group rounded-lg border overflow-hidden h-[70px] flex flex-col"
            title={file.name}
          >
            {isImage && previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.name} className="w-full flex-1 object-cover min-h-0" />
            ) : (
              <div className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 min-h-0', typeInfo.bg)}>
                <TypeIcon className={cn('w-5 h-5', typeInfo.color)} />
                <span className={cn('text-[8px] font-semibold rounded px-1', typeInfo.color)}>
                  {typeInfo.label}
                </span>
              </div>
            )}
            <div className="bg-white dark:bg-gray-800/50 border-t px-1 py-0.5 shrink-0">
              <span className="text-[9px] text-muted-foreground truncate block">{truncateFilename(file.name)}</span>
            </div>
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <button
                type="button"
                title="Remove"
                onClick={() => onRemove(index)}
                className="p-1 rounded-full bg-red-500/70 hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Left-side compose box ────────────────────────────────────────────────────

function ComposeBox({
  placeholder, inputId, value, files, submitting,
  onTextChange, onFilesAdd, onFileRemove, onSubmit, onCancel, submitLabel = 'Post',
}: {
  placeholder: string; inputId: string; value: string; files: File[];
  submitting: boolean; onTextChange: (v: string) => void;
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (i: number) => void; onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void; submitLabel?: string;
}) {
  const { isDragging, dropZoneProps } = useFileDropZone(onFilesAdd);
  return (
    <form onSubmit={onSubmit} className="flex flex-col h-full">
      <div
        {...dropZoneProps}
        className={cn(
          'rounded-md border focus-within:ring-1 focus-within:ring-ring overflow-hidden transition-shadow flex flex-col flex-1',
          isDragging && 'ring-1 ring-primary border-primary bg-primary/5',
        )}
      >
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onTextChange(e.target.value)}
          className="flex-1 min-h-[120px] text-xs resize-none border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2.5 py-2"
        />

        <PendingFileGrid files={files} onRemove={onFileRemove} />

        <div className="flex items-center justify-between px-1.5 py-1 border-t bg-muted/20">
          <div>
            <input
              type="file"
              multiple
              onChange={(e) => { onFilesAdd(Array.from(e.target.files || [])); e.target.value = ''; }}
              className="hidden"
              id={inputId}
            />
            <label htmlFor={inputId} className="cursor-pointer inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span className="text-xs">Click, drop, or paste to upload</span>
            </label>
          </div>
          <div className="flex items-center gap-1">
            {onCancel && (
              <button type="button" onClick={onCancel} className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            )}
            <Button type="submit" size="sm" disabled={submitting} className="h-6 text-[11px] px-2.5 gap-1">
              <Send className="h-3 w-3" />
              {submitting ? 'Posting...' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Inline reply input (simple "Reply as Me" style) ─────────────────────────

function InlineReplyInput({
  displayName, picUrl, inputId, value, files, submitting,
  onTextChange, onFilesAdd, onFileRemove, onSubmit, onCancel,
}: {
  displayName: string; picUrl?: string; inputId: string; value: string;
  files: File[]; submitting: boolean; onTextChange: (v: string) => void;
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (i: number) => void; onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const { isDragging, dropZoneProps } = useFileDropZone(onFilesAdd);
  return (
    <div className="flex gap-2 items-start">
      <Avatar className="h-6 w-6 shrink-0 mt-1">
        <AvatarImage src={picUrl ?? ''} alt={displayName} />
        <AvatarFallback className="text-[9px] font-semibold bg-primary text-primary-foreground">{getInitials(displayName)}</AvatarFallback>
      </Avatar>
      <form onSubmit={onSubmit} className="flex-1 min-w-0 bg-white dark:bg-gray-900">
        <div
          {...dropZoneProps}
          className={cn(
            'rounded-md border focus-within:ring-1 focus-within:ring-ring overflow-hidden transition-shadow',
            isDragging && 'ring-1 ring-primary border-primary bg-primary/5',
          )}
        >
          <Textarea
            placeholder={`Reply to ${displayName}...`}
            style={{ fontSize: '11px' }}
            value={value}
            onChange={(e) => onTextChange(e.target.value)}
            onFocus={() => setFocused(true)}
            className={cn(
              'text-xs resize-none border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2.5 py-1.5 transition-all',
              focused || value ? 'min-h-[64px]' : 'min-h-[32px]',
            )}
          />
          <PendingFileGrid files={files} onRemove={onFileRemove} />
          <div className="flex items-center justify-between px-1.5 py-1 border-t bg-muted/20">
            <div>
              <input
                type="file"
                multiple
                onChange={(e) => { onFilesAdd(Array.from(e.target.files || [])); e.target.value = ''; }}
                className="hidden"
                id={inputId}
              />
              <label htmlFor={inputId} className="cursor-pointer inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="h-3 w-3" />
                <span className="text-[11px]">Click, drop, or paste to upload</span>
              </label>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={onCancel} className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <Button type="submit" size="sm" disabled={submitting} className="h-5 text-[10px] px-2 gap-1">
                <Send className="h-2.5 w-2.5" />
                {submitting ? 'Posting...' : 'Reply'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommentSection({ postId, postType, onCommentCountChange, readOnly = false }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<FormData>({ text: '', files: [] });
  const [editText, setEditText] = useState('');

  // Guard to prevent double-loading in React StrictMode
  const lastLoadedKey = useRef<string>('');

  // current user info from localStorage
  const [currentUser, setCurrentUser] = useState<{ name: string; picUrl?: string }>({ name: 'Me' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Me';
        const picUrl = u.profile_picture ? u.profile_picture : undefined;
        setCurrentUser({ name, picUrl });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const key = `${postId}-${postType}`;
    if (lastLoadedKey.current === key) return;
    lastLoadedKey.current = key;
    loadComments();
  }, [postId, postType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getCommentsByPost(postId, postType);
      setComments(data);
      onCommentCountChange?.(data.length);
      // Auto-collapse all replies on initial load
      const parentIds = new Set<number>(
        data.filter((c) => (c.childComments?.length ?? 0) > 0).map((c) => c.id)
      );
      setCollapsedReplies(parentIds);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim() && formData.files.length === 0) { toast.error('Please enter a comment or attach a file'); return; }
    try {
      setSubmitting(true);
      const links: string[] = [];
      for (const f of formData.files) links.push(await uploadFile(f));
      await createComment({ comment: formData.text, postId, postType, parentId: replyingTo || undefined, attachmentLinks: links.length > 0 ? links : undefined });
      toast.success(replyingTo ? 'Reply posted' : 'Comment posted');
      setFormData({ text: '', files: [] });
      setReplyingTo(null);
      await loadComments();
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (id: number) => {
    if (!editText.trim()) { toast.error('Comment cannot be empty'); return; }
    try {
      await updateComment(id, { comment: editText });
      toast.success('Comment updated');
      setEditingComment(null);
      await loadComments();
    } catch { toast.error('Failed to update comment'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteComment(id);
      toast.success('Comment deleted');
      setDeleteConfirm(null);
      await loadComments();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to delete comment'); }
  };

  const toggleReplies = (id: number) => {
    setCollapsedReplies((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  };

  // ── Render one comment card ────────────────────────────────────────────────

  const renderComment = (comment: Comment, depth = 0): React.ReactNode => {
    const isEditing = editingComment === comment.id;
    const repliesCollapsed = collapsedReplies.has(comment.id);
    const hasReplies = (comment.childComments?.length ?? 0) > 0;
    const isReplying = replyingTo === comment.id;

    const displayName = comment.createdByUser
      ? `${comment.createdByUser.first_name || ''} ${comment.createdByUser.last_name || ''}`.trim() || comment.createdBy
      : comment.createdBy;

    const picUrl = comment.createdByUser?.profile_picture;

    return (
      <div key={comment.id} className={cn('flex gap-1.5', depth > 0 && 'ml-5 mt-1')}>

        {/* Avatar */}
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          <AvatarImage src={picUrl ?? ''} alt={displayName} />
          <AvatarFallback className="text-[9px] font-semibold bg-primary text-primary-foreground">{getInitials(displayName)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1 ">
          <div className="rounded-md border overflow-hidden">

            {/* ── Single meta row: name · time · Reply ··· Hide ⋮ ── */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 border-b bg-white dark:bg-gray-900">
              {/* Left */}
              <span className="text-[11px] font-semibold shrink-0">{displayName}</span>
              <span className="text-muted-foreground text-[10px]">·</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(comment.createdAt)}</span>
              {!readOnly && (
                <>
                  <span className="text-muted-foreground text-[10px]">·</span>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                    className="text-[10px] font-medium text-primary hover:underline shrink-0"
                  >
                    Reply
                  </button>
                </>
              )}

              {/* Right */}
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {hasReplies && (
                  <button
                    type="button"
                    onClick={() => toggleReplies(comment.id)}
                    className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {repliesCollapsed
                      ? <><ChevronRight className="h-3 w-3" />{comment.childComments!.length} {comment.childComments!.length === 1 ? 'reply' : 'replies'}</>
                      : <><ChevronDown className="h-3 w-3" />Hide</>}
                  </button>
                )}
                {!readOnly && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[100px]">
                      <DropdownMenuItem className="text-xs gap-2" onClick={() => { setEditingComment(comment.id); setEditText(comment.comment); }}>
                        <Edit2 className="h-3 w-3" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 text-destructive focus:text-destructive" onClick={() => setDeleteConfirm(comment.id)}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-2.5 pb-2 bg-white dark:bg-gray-900">
              {isEditing ? (
                <div className="space-y-1">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[48px] text-xs resize-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => { setEditingComment(null); setEditText(''); }} className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
                    <Button type="button" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleEdit(comment.id)}>Save</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-foreground leading-relaxed break-words whitespace-pre-wrap">{comment.comment}</p>
                  {comment.commentAttachments && comment.commentAttachments.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {comment.commentAttachments.map((att) => {
                        const fileName = getFileNameFromUrl(att.link);
                        const isImage = isImageUrl(att.link);
                        const typeInfo = getFileTypeInfo(fileName);
                        const TypeIcon = typeInfo.icon;
                        return (
                          <div
                            key={att.id}
                            className="relative group rounded-lg border overflow-hidden h-[88px] flex flex-col"
                            title={fileName}
                          >
                            {isImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.link}
                                alt={fileName}
                                className="w-full flex-1 object-cover min-h-0"
                              />
                            ) : (
                              <div className={cn('flex-1 flex flex-col items-center justify-center gap-1 min-h-0', typeInfo.bg)}>
                                <TypeIcon className={cn('w-7 h-7', typeInfo.color)} />
                                <span className={cn('text-[9px] font-semibold rounded px-1', typeInfo.color)}>
                                  {typeInfo.label}
                                </span>
                              </div>
                            )}
                            <div className="bg-background border-t px-1.5 py-0.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground truncate block">{fileName}</span>
                            </div>
                            {/* Hover overlay — open only */}
                            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <button
                                type="button"
                                title="Open"
                                onClick={() => window.open(att.link, '_blank')}
                                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Inline reply compose */}
          {!readOnly && isReplying && (
            <InlineReplyInput
              displayName={currentUser.name}
              picUrl={currentUser.picUrl}
              inputId={`reply-file-${comment.id}`}
              value={formData.text}
              files={formData.files}
              submitting={submitting}
              onTextChange={(v) => setFormData((p) => ({ ...p, text: v }))}
              onFilesAdd={(newFiles) => setFormData((p) => ({ ...p, files: [...p.files, ...newFiles] }))}
              onFileRemove={(i) => setFormData((p) => ({ ...p, files: p.files.filter((_, idx) => idx !== i) }))}
              onSubmit={handleSubmit}
              onCancel={() => { setReplyingTo(null); setFormData({ text: '', files: [] }); }}
            />
          )}

          {/* Nested replies */}
          {hasReplies && !repliesCollapsed && (
            <div className="space-y-1">
              {comment.childComments!.map((r) => renderComment(r, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const topLevel = comments.filter((c) => !c.parentId);

  return (
    <div className="space-y-2">

      {/* ── Compose box (top) ── */}
      {!readOnly && (
        <div className="bg-white dark:bg-gray-900 rounded-md">
          <ComposeBox
            placeholder="Write a comment..."
            inputId="comment-file-input"
            value={replyingTo ? '' : formData.text}
            files={replyingTo ? [] : formData.files}
            submitting={submitting && !replyingTo}
            onTextChange={(v) => !replyingTo && setFormData((p) => ({ ...p, text: v }))}
            onFilesAdd={(newFiles) => !replyingTo && setFormData((p) => ({ ...p, files: [...p.files, ...newFiles] }))}
            onFileRemove={(i) => !replyingTo && setFormData((p) => ({ ...p, files: p.files.filter((_, idx) => idx !== i) }))}
            onSubmit={(e) => { if (!replyingTo) handleSubmit(e); }}
          />
        </div>
      )}

      {/* ── Comment list (below) ── */}
      <div className="rounded-md">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-muted border-t-foreground" />
            Loading...
          </div>
        ) : topLevel.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground">
            <MessageSquare className="h-7 w-7 opacity-25" />
            <p className="text-xs">No comments yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {topLevel.map((c) => renderComment(c))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
