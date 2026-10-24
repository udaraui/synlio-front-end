import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnResizeConfig {
  id: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  isResizable?: boolean;
}

export function useTableColumnResize(
  storageKey: string,
  columns: ColumnResizeConfig[]
) {
  // Initialize widths from localStorage or defaults
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const merged: Record<string, number> = {};
          columns.forEach((col) => {
            merged[col.id] = typeof parsed[col.id] === 'number' && parsed[col.id] >= (col.minWidth ?? 40)
              ? parsed[col.id]
              : col.defaultWidth;
          });
          return merged;
        }
      } catch (e) {
        console.error('Failed to parse saved column widths', e);
      }
    }
    return Object.fromEntries(columns.map((c) => [c.id, c.defaultWidth]));
  });

  const [activeResizingCol, setActiveResizingCol] = useState<string | null>(null);

  const dragInfoRef = useRef<{
    colId: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);

  const cleanupListenersRef = useRef<(() => void) | null>(null);

  const onMouseDown = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const colDef = columns.find((c) => c.id === colId);
      if (colDef && colDef.isResizable === false) return;

      const currentWidth = columnWidths[colId] ?? colDef?.defaultWidth ?? 120;
      const minW = colDef?.minWidth ?? 60;
      const maxW = colDef?.maxWidth ?? 1200;

      dragInfoRef.current = {
        colId,
        startX: e.clientX,
        startWidth: currentWidth,
        minWidth: minW,
        maxWidth: maxW,
      };

      setActiveResizingCol(colId);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragInfoRef.current) return;
        const delta = moveEvent.clientX - dragInfoRef.current.startX;
        const newWidth = Math.min(
          Math.max(dragInfoRef.current.startWidth + delta, dragInfoRef.current.minWidth),
          dragInfoRef.current.maxWidth
        );

        setColumnWidths((prev) => {
          if (prev[colId] === newWidth) return prev;
          return { ...prev, [colId]: newWidth };
        });
      };

      const handleMouseUp = () => {
        if (cleanupListenersRef.current) {
          cleanupListenersRef.current();
          cleanupListenersRef.current = null;
        }

        setActiveResizingCol(null);
        dragInfoRef.current = null;

        // Persist latest state into localStorage
        setColumnWidths((latest) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(latest));
          } catch (err) {
            console.error('Failed to save column widths', err);
          }
          return latest;
        });
      };

      const prevCursor = document.body.style.cursor;
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      cleanupListenersRef.current = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevUserSelect;
      };
    },
    [columnWidths, columns, storageKey]
  );

  const resetColumnWidth = useCallback(
    (colId: string) => {
      const defaultW = columns.find((c) => c.id === colId)?.defaultWidth;
      if (defaultW !== undefined) {
        setColumnWidths((prev) => {
          const updated = { ...prev, [colId]: defaultW };
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    },
    [columns, storageKey]
  );

  const resetAllColumnWidths = useCallback(() => {
    const defaults = Object.fromEntries(columns.map((c) => [c.id, c.defaultWidth]));
    setColumnWidths(defaults);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [columns, storageKey]);

  useEffect(() => {
    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
      }
    };
  }, []);

  const totalTableWidth = columns.reduce((acc, col) => acc + (columnWidths[col.id] ?? col.defaultWidth), 0);

  return {
    columnWidths,
    isResizing: activeResizingCol !== null,
    activeResizingCol,
    onMouseDown,
    resetColumnWidth,
    resetAllColumnWidths,
    totalTableWidth,
  };
}
