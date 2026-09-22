'use client';

import React, { useState, useEffect } from 'react';
import {
  Paperclip,
  Trash2,
  Download,
  FileText, // For PDF
  FileSpreadsheet, // For Excel
  File as FileIcon, // Generic
  X,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  TaskAttachment,
  createTaskAttachment,
  getTaskAttachmentsByTask,
  deleteTaskAttachment,
  uploadTaskAttachment,
} from '@/services/comment-service';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TaskAttachmentsProps {
  taskId: number;
  onAttachmentCountChange?: (count: number) => void;
}

export function TaskAttachments({
                                  taskId,
                                  onAttachmentCountChange,
                                }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const data = await getTaskAttachmentsByTask(taskId);
      setAttachments(data);
      onAttachmentCountChange?.(data.length);
    } catch (error) {
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      for (const file of files) {
        const link = await uploadTaskAttachment(file);
        await createTaskAttachment(taskId, link);
      }
      toast.success('Uploaded');
      await loadAttachments();
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: number) => {
    try {
      await deleteTaskAttachment(attachmentId);
      toast.success('Deleted');
      setDeleteConfirm(null);
      await loadAttachments();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // --- File Type Logic ---

  const getCleanExtension = (url: string): string => {
    if (!url) return '';
    // Strip query params (like ?token=...) to get the real extension
    return url.split('')[0].split('.').pop()?.toLowerCase() || '';
  };

  const getFileName = (url: string) => {
    if (!url) return 'File';
    const cleanUrl = url.split('?')[0];
    return decodeURIComponent(cleanUrl.split('/').pop() || 'Attachment');
  };

  const isImage = (url: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(getCleanExtension(url));
  };

  const isPdf = (url: string) => {
    return getCleanExtension(url) === 'pdf';
  };

  // Files supported by Google Docs Viewer
  const isOfficeDoc = (url: string) => {
    return ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'csv'].includes(getCleanExtension(url));
  };

  // Helper to choose the right icon
  const renderIcon = (url: string) => {
    const ext = getCleanExtension(url);
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="h-10 w-10 text-green-600" />;
    if (ext === 'pdf') return <FileText className="h-10 w-10 text-red-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="h-10 w-10 text-blue-600" />;
    return <FileIcon className="h-10 w-10 text-gray-400" />;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments ({attachments.length})
          </div>
          <div>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="task-attachment-input"
              disabled={uploading}
            />
            <label htmlFor="task-attachment-input">
              <Button type="button" size="sm" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  <Paperclip className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Add'}
                </span>
              </Button>
            </label>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No attachments</div>
        ) : (
          // Horizontal Scrollable List
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-gray-200">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative flex-shrink-0 w-36 h-36 bg-white dark:bg-gray-800 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setPreviewAttachment(attachment)}
              >
                {/* Content Area */}
                <div className="h-full w-full p-2 flex flex-col items-center justify-center overflow-hidden">
                  {isImage(attachment.link) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachment.link}
                      alt="Thumbnail"
                      className="h-20 w-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-20 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-md">
                      {renderIcon(attachment.link)}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-center font-medium text-gray-600 dark:text-gray-300 truncate w-full px-1">
                    {getFileName(attachment.link)}
                  </div>
                </div>

                {/* Hover Actions (Delete/Download) */}
                <div
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 dark:bg-black/50 rounded-md p-1 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={attachment.link}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:text-blue-600 text-gray-600"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(attachment.id);
                    }}
                    className="p-1 hover:text-destructive text-destructive hover:bg-destructive/10 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- PREVIEW MODAL --- */}
        <Dialog
          open={!!previewAttachment}
          onOpenChange={(open) => !open && setPreviewAttachment(null)}
        >
          <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
            <DialogHeader className="p-3 bg-white dark:bg-gray-800 border-b flex flex-row items-center justify-between space-y-0">
              <DialogTitle className="truncate pr-4">
                {previewAttachment ? getFileName(previewAttachment.link) : 'Preview'}
              </DialogTitle>
              {/* Header Actions */}
              <div className="flex gap-2">
                {previewAttachment && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewAttachment.link} target="_blank" rel="noreferrer">
                      Open Original
                    </a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setPreviewAttachment(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 w-full h-full relative bg-white flex items-center justify-center overflow-auto">
              {previewAttachment && (() => {
                const url = previewAttachment.link;

                // 1. IMAGE
                if (isImage(url)) {
                  // eslint-disable-next-line @next/next/no-img-element
                  return <img src={url} alt="Full Preview" className="max-w-full max-h-full object-contain" />;
                }

                // 2. PDF (Native Browser Viewer)
                if (isPdf(url)) {
                  return (
                    <iframe
                      src={url}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  );
                }

                // 3. OFFICE DOCS (Google Viewer)
                if (isOfficeDoc(url)) {
                  // Use Google Docs Viewer for Excel/Word/PPT
                  // NOTE: 'embedded=true' removes the Google header
                  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
                  return (
                    <iframe
                      src={googleViewerUrl}
                      className="w-full h-full border-none"
                      title="Office Preview"
                      onError={() => toast.error("Could not load preview. File might be private")}
                    />
                  );
                }

                // 4. UNSUPPORTED
                return (
                  <div className="text-center p-8">
                    <FileIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">No preview available for this file type.</p>
                    <Button asChild>
                      <a href={url} download>Download File</a>
                    </Button>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog
          open={deleteConfirm !== null}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>Are you sure?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}