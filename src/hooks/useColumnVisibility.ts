import { useState, useCallback } from "react";
import type { ColumnItem } from "@/components/table-components/ColumnVisibilityDropdown";

export function useColumnVisibility(columns: ColumnItem[], storageKey: string) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const isColVisible = useCallback(
    (key: string) => visibleColumns[key] !== false,
    [visibleColumns]
  );

  const handleToggleColumn = useCallback(
    (key: string) => {
      setVisibleColumns((prev) => {
        const currentlyVisible = prev[key] !== false;
        const willBeVisible = !currentlyVisible;
        const countAfter = columns.filter((c) =>
          c.key === key ? willBeVisible : prev[c.key] !== false
        ).length;
        if (countAfter === 0) return prev;
        const next = { ...prev, [key]: willBeVisible };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    },
    [columns, storageKey]
  );

  const handleResetColumns = useCallback(() => {
    const resetState: Record<string, boolean> = {};
    columns.forEach((c) => {
      resetState[c.key] = true;
    });
    setVisibleColumns(resetState);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
  }, [columns, storageKey]);

  const activeVisibleColumnCount = columns.filter((c) => isColVisible(c.key)).length;

  return {
    visibleColumns,
    isColVisible,
    handleToggleColumn,
    handleResetColumns,
    activeVisibleColumnCount,
  };
}
