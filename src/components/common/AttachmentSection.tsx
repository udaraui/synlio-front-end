'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  ExternalLink,
  Trash2,
  FileText,
  FileSpreadsheet,
  Archive,
  Film,
  Music,
  File,
  FileCode,
  Paperclip,
  Loader2,
  Eye,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  patchTicketAttachment,
  getTicketAttachments,
  deleteTicketAttachment,
} from '@/services/ticket-management/ticket-attachment.service';
import {
  uploadTaskAttachment,
  createTaskAttachment,
  getTaskAttachmentsByTask,
  deleteTaskAttachment,
} from '@/services/common/comment-service';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface AttachmentItem {
  id: number;
  link: string;
}

export interface AttachmentSectionProps {
  /** Which entity these attachments belong to */
  entityType: 'Ticket' | 'Task';
  /**
   * The entity's ID.
   * • Provide a number when editing / viewing an existing entity → auto-save mode.
   * • Omit (or pass undefined) when creating a new entity → buffer-mode; the parent
   *   must upload the files itself during form submit.
   */
  entityId?: number;
  /**
   * Pending (not-yet-saved) files controlled by the parent.
   * Only meaningful in create-mode (entityId = undefined).
   */
  pendingFiles?: File[];
  /** Called whenever pending files change (add / remove). */
  onPendingFilesChange?: (files: File[]) => void;
  /** Called whenever the list of saved attachments changes. */
  onAttachmentCountChange?: (count: number) => void;
}

interface PreviewItem {
  url: string;
  name: string;
  isBlob?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const getCleanExtension = (urlOrName: string): string => {
  if (!urlOrName) return '';
  const clean = urlOrName.split('?')[0];
  return clean.split('.').pop()?.toLowerCase() || '';
};

const isImageUrl = (urlOrName: string): boolean =>
  /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(urlOrName);

const isPdfUrl = (urlOrName: string): boolean =>
  getCleanExtension(urlOrName) === 'pdf';

const isVideoUrl = (urlOrName: string): boolean =>
  ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(getCleanExtension(urlOrName));

const isAudioUrl = (urlOrName: string): boolean =>
  ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(getCleanExtension(urlOrName));

const isOfficeDocUrl = (urlOrName: string): boolean =>
  ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'csv'].includes(getCleanExtension(urlOrName));

const isTextOrCodeUrl = (urlOrName: string): boolean =>
  ['txt', 'md', 'log', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'php', 'sql'].includes(
    getCleanExtension(urlOrName)
  );

const getFileTypeInfo = (
  fileName: string,
): { icon: LucideIcon; bg: string; color: string; label: string } => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf')
    return { icon: FileText, bg: 'bg-orange-500/10', color: 'text-orange-500', label: 'PDF' };
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
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'py', 'java', 'php', 'sql'].includes(ext))
    return { icon: FileCode, bg: 'bg-cyan-500/10', color: 'text-cyan-600', label: ext.toUpperCase() };
  if (['txt', 'md', 'log'].includes(ext))
    return { icon: FileText, bg: 'bg-muted', color: 'text-muted-foreground', label: ext.toUpperCase() };
  return { icon: File, bg: 'bg-muted', color: 'text-muted-foreground', label: ext.toUpperCase() || 'FILE' };
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AttachmentSection({
  entityType,
  entityId,
  pendingFiles = [],
  onPendingFilesChange,
  onAttachmentCountChange,
}: AttachmentSectionProps) {
  const [existingAttachments, setExistingAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragCounter = useRef(0);

  const isEditMode = entityId !== undefined;
  const inputId = `attachment-upload-${entityType}-${entityId ?? 'new'}`;

  // Guard to prevent double-loading in React StrictMode
  const lastLoadedKey = useRef<string>('');

  // Load saved attachments whenever we enter edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const key = `${entityType}-${entityId}`;
    if (lastLoadedKey.current === key) return;
    lastLoadedKey.current = key;
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType]);

  const loadAttachments = async () => {
    if (entityId === undefined) return;
    try {
      let data: AttachmentItem[];
      if (entityType === 'Ticket') {
        data = await getTicketAttachments(entityId);
      } else {
        const raw = await getTaskAttachmentsByTask(entityId);
        data = raw.map((a) => ({ id: a.id, link: a.link }));
      }
      setExistingAttachments(data);
      onAttachmentCountChange?.(data.length);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      toast.error('Failed to load attachments');
    }
  };

  // ── File selection ──────────────────────────────────────────────────────────

  const uploadFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    if (isEditMode && entityId !== undefined) {
      // Auto-save each file immediately
      for (const file of newFiles) {
        setUploadingFiles((prev) => [...prev, file.name]);
        try {
          let saved: AttachmentItem;
          if (entityType === 'Ticket') {
            saved = await patchTicketAttachment(file, entityId);
          } else {
            const link = await uploadTaskAttachment(file);
            const record = await createTaskAttachment(entityId, link);
            saved = { id: record.id, link: record.link };
          }
          setExistingAttachments((prev) => {
            const updated = [...prev, saved];
            onAttachmentCountChange?.(updated.length);
            return updated;
          });
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name));
        }
      }
    } else {
      // Create mode — hand files to the parent to upload on submit
      const updatedPending = [...pendingFiles, ...newFiles];
      onPendingFilesChange?.(updatedPending);
      onAttachmentCountChange?.(updatedPending.length);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    // Reset input so the same file can be picked again
    e.target.value = '';
    await uploadFiles(newFiles);
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    await uploadFiles(droppedFiles);
  };

  // ── Paste-to-upload (active while the cursor hovers the section) ───────────────

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  useEffect(() => {
    if (!isHovering) return;

    const onWindowPaste = async (e: ClipboardEvent) => {
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
      await uploadFiles(pastedFiles);
    };

    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovering, isEditMode, entityId, entityType, pendingFiles]);

  // ── Remove helpers ──────────────────────────────────────────────────────────

  const removePendingFile = (index: number) => {
    const updated = pendingFiles.filter((_, i) => i !== index);
    onPendingFilesChange?.(updated);
    onAttachmentCountChange?.(updated.length);
  };

  const confirmDelete = (id: number) => setDeleteConfirm(id);

  const doDelete = async () => {
    if (deleteConfirm === null) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    try {
      if (entityType === 'Ticket') {
        await deleteTicketAttachment(id);
      } else {
        await deleteTaskAttachment(id);
      }
      setExistingAttachments((prev) => {
        const updated = prev.filter((a) => a.id !== id);
        onAttachmentCountChange?.(updated.length);
        return updated;
      });
      toast.success('Attachment removed');
    } catch {
      toast.error('Failed to remove attachment');
    }
  };

  // ── Preview handlers ────────────────────────────────────────────────────────

  const openPreview = (url: string, name: string, isBlob: boolean = false) => {
    setPreviewItem({ url, name, isBlob });
  };

  const handleClosePreview = () => {
    if (previewItem?.isBlob && previewItem.url) {
      URL.revokeObjectURL(previewItem.url);
    }
    setPreviewItem(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const hasAnyFiles =
    existingAttachments.length > 0 || pendingFiles.length > 0 || uploadingFiles.length > 0;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'rounded-md border overflow-hidden transition-shadow',
        isDragging && 'ring-1 ring-primary border-primary bg-primary/5',
      )}
    >
      {/* Hidden file input */}
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id={inputId}
      />

      {/* Drop / paste area — files grid, or an empty-state hint when there's nothing yet.
          Height is capped to two rows of tiles; additional rows scroll. */}
      <div
        className={cn(
          'flex flex-col min-h-[120px] max-h-[212px] overflow-y-auto px-2.5 py-2 transition-colors',
          isDragging ? 'bg-primary/5' : 'bg-white dark:bg-gray-900',
        )}
      >
        {!hasAnyFiles ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
            {isDragging ? 'Drop to upload' : 'No attachments yet'}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {/* Saved attachments */}
            {existingAttachments.map((attachment) => {
              const fileName = getFileNameFromUrl(attachment.link);
              const isImage = isImageUrl(attachment.link);
              const typeInfo = getFileTypeInfo(fileName);
              const TypeIcon = typeInfo.icon;
              return (
                <div
                  key={`existing-${attachment.id}`}
                  onClick={() => openPreview(attachment.link, fileName, false)}
                  className="relative group rounded-lg border overflow-hidden h-[88px] flex flex-col cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
                  title={fileName}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.link}
                      alt={fileName}
                      className="w-full flex-1 object-cover min-h-0 bg-muted/20"
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex-1 flex flex-col items-center justify-center gap-1 min-h-0',
                        typeInfo.bg,
                      )}
                    >
                      <TypeIcon className={cn('w-7 h-7', typeInfo.color)} />
                      <span className={cn('text-[9px] font-semibold rounded px-1', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800/50 border-t px-1.5 py-0.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground truncate block">{fileName}</span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg">
                    <button
                      type="button"
                      title="Preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(attachment.link, fileName, false);
                      }}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      type="button"
                      title="Open in new window"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(attachment.link, '_blank');
                      }}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(attachment.id);
                      }}
                      className="p-1.5 rounded-full bg-red-500/70 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pending (buffered) files — create mode */}
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const previewUrl = isImage ? URL.createObjectURL(file) : null;
              const typeInfo = getFileTypeInfo(file.name);
              const TypeIcon = typeInfo.icon;
              return (
                <div
                  key={`pending-${index}`}
                  onClick={() => {
                    const blobUrl = URL.createObjectURL(file);
                    openPreview(blobUrl, file.name, true);
                  }}
                  className="relative group rounded-lg border overflow-hidden h-[88px] flex flex-col cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
                  title={file.name}
                >
                  {isImage && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-full flex-1 object-cover min-h-0 bg-muted/20"
                    />
                  ) : (
                    <div
                      className={cn(
                        'flex-1 flex flex-col items-center justify-center gap-1 min-h-0',
                        typeInfo.bg,
                      )}
                    >
                      <TypeIcon className={cn('w-7 h-7', typeInfo.color)} />
                      <span className={cn('text-[9px] font-semibold rounded px-1', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800/50 border-t px-1.5 py-0.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground truncate block">{file.name}</span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg">
                    <button
                      type="button"
                      title="Preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        const blobUrl = URL.createObjectURL(file);
                        openPreview(blobUrl, file.name, true);
                      }}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      type="button"
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePendingFile(index);
                      }}
                      className="p-1.5 rounded-full bg-red-500/70 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Uploading spinners — auto-save in progress */}
            {uploadingFiles.map((name) => (
              <div
                key={`uploading-${name}`}
                className="relative rounded-lg border overflow-hidden h-[88px] flex flex-col items-center justify-center bg-white dark:bg-gray-800/50"
                title={name}
              >
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-1" />
                <span className="text-[10px] text-muted-foreground text-center px-1 truncate w-full">
                  {name}
                </span>
              </div>
            ))}

            {/* Add tile — appears right after the last attachment */}
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-lg border border-dashed h-[88px] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span className="text-[10px] text-center px-1">
                {isDragging ? 'Drop to upload' : 'Click, drop, or paste'}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Bottom toolbar — click / drop / paste hint, shown only in the empty state */}
      {!hasAnyFiles && (
        <div className="flex items-center px-1.5 py-1.5 border-t bg-muted/20">
          <label
            htmlFor={inputId}
            className="cursor-pointer inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="text-xs">
              {isDragging ? 'Drop to upload' : 'Click, drop, or paste to upload'}
            </span>
          </label>
        </div>
      )}

      {/* ─── Attachment Preview Dialog ───────────────────────────────────────── */}
      <Dialog
        open={previewItem !== null}
        onOpenChange={(open) => {
          if (!open) handleClosePreview();
        }}
      >
        <DialogContent className="max-w-5xl w-[92vw] h-[85vh] p-0 flex flex-col overflow-hidden gap-0 rounded-xl bg-background border shadow-2xl">
          {/* Custom Header with Actions */}
          <DialogHeader className="px-4 py-3 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-4">
              {previewItem && (() => {
                const info = getFileTypeInfo(previewItem.name);
                const Icon = info.icon;
                return (
                  <div className={cn('p-1.5 rounded-md shrink-0', info.bg)}>
                    <Icon className={cn('w-4 h-4', info.color)} />
                  </div>
                );
              })()}
              <DialogTitle className="text-sm font-semibold truncate text-left" title={previewItem?.name}>
                {previewItem?.name || 'Attachment Preview'}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2 shrink-0 mr-6">
              {previewItem && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => window.open(previewItem.url, '_blank')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in new window
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    asChild
                  >
                    <a
                      href={previewItem.url}
                      download={previewItem.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          {/* Preview Container */}
          <div className="flex-1 w-full h-full relative bg-muted/10 dark:bg-gray-950 flex items-center justify-center overflow-auto p-4">
            {previewItem && (() => {
              const { url, name, isBlob } = previewItem;

              // 1. Image preview
              if (isImageUrl(name) || isImageUrl(url)) {
                return (
                  <div className="flex items-center justify-center w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={name}
                      className="max-w-full max-h-full object-contain rounded-md shadow-sm select-none"
                    />
                  </div>
                );
              }

              // 2. Video preview
              if (isVideoUrl(name) || isVideoUrl(url)) {
                return (
                  <div className="flex items-center justify-center w-full h-full">
                    <video
                      src={url}
                      controls
                      autoPlay
                      className="max-w-full max-h-full rounded-md shadow-sm"
                    >
                      Your browser does not support playing this video.
                    </video>
                  </div>
                );
              }

              // 3. Audio preview
              if (isAudioUrl(name) || isAudioUrl(url)) {
                const info = getFileTypeInfo(name);
                const Icon = info.icon;
                return (
                  <div className="flex flex-col items-center justify-center gap-6 p-8 bg-card rounded-xl border shadow-sm max-w-md w-full">
                    <div className={cn('p-6 rounded-2xl', info.bg)}>
                      <Icon className={cn('w-12 h-12', info.color)} />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold truncate mb-1">{name}</p>
                      <p className="text-xs text-muted-foreground">Audio file</p>
                    </div>
                    <audio src={url} controls className="w-full" />
                  </div>
                );
              }

              // 4. PDF preview (Native browser viewer)
              if (isPdfUrl(name) || isPdfUrl(url)) {
                return (
                  <iframe
                    src={url}
                    className="w-full h-full border-none rounded-md bg-white"
                    title={name}
                  />
                );
              }

              // 5. Office Documents (Word, Excel, PowerPoint)
              if (isOfficeDocUrl(name) || isOfficeDocUrl(url)) {
                if (!isBlob && url.startsWith('http')) {
                  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
                  return (
                    <iframe
                      src={googleViewerUrl}
                      className="w-full h-full border-none rounded-md bg-white"
                      title={name}
                      onError={() => toast.error('Could not load online preview')}
                    />
                  );
                }
              }

              // 6. Text & Code files
              if (isTextOrCodeUrl(name) || isTextOrCodeUrl(url)) {
                return (
                  <iframe
                    src={url}
                    className="w-full h-full border-none rounded-md bg-white dark:bg-gray-900 p-2"
                    title={name}
                  />
                );
              }

              // 7. Generic / Unsupported preview
              const typeInfo = getFileTypeInfo(name);
              const TypeIcon = typeInfo.icon;
              return (
                <div className="flex flex-col items-center justify-center gap-4 text-center max-w-md p-8 bg-card rounded-xl border shadow-sm">
                  <div className={cn('p-5 rounded-2xl', typeInfo.bg)}>
                    <TypeIcon className={cn('w-12 h-12', typeInfo.color)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground truncate max-w-xs">{name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Preview not directly embeddable for this format.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(url, '_blank')}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in new window
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      asChild
                    >
                      <a href={url} download={name} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
