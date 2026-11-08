import { useState, useEffect, useMemo, useCallback } from "react";
import {
  hasPermission,
  getActiveUserPermissions,
  type CrudAction,
} from "@/utils/permission-utils";
import { isUserAdmin } from "@/utils/branch-storage";

export function usePermission() {
  const isAdmin = useMemo(() => isUserAdmin(), []);
  const [permissions, setPermissions] = useState<string[]>(() => getActiveUserPermissions());

  useEffect(() => {
    setPermissions(getActiveUserPermissions());

    const handleUpdate = () => {
      setPermissions(getActiveUserPermissions());
    };

    window.addEventListener("permissions-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("permissions-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const can = useCallback(
    (action: CrudAction, module: string): boolean => {
      return hasPermission(action, module, permissions);
    },
    [permissions]
  );

  const canRead = useCallback((module: string): boolean => can("read", module), [can]);
  const canCreate = useCallback((module: string): boolean => can("create", module), [can]);
  const canUpdate = useCallback((module: string): boolean => can("update", module), [can]);
  const canDelete = useCallback((module: string): boolean => can("delete", module), [can]);

  return {
    isAdmin,
    permissions,
    can,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  };
}

export default usePermission;
