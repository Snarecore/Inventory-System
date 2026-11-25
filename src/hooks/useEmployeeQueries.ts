import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { GLOBAL_STALE_TIME } from "@/api/query-client";
import {
  employeeListQueryKey,
  employeeBranchPermissionsQueryKey,
  organizationPermissionsQueryKey,
  branchPermissionsQueryKey,
} from "@/config/query-key";
import {
  getEmployeeList,
  insertEmployee,
  updateEmployee,
  createEmployeeBranchPermission,
  updateEmployeeBranchPermission,
  deleteEmployeeBranchPermission,
  getEmployeeBranchPermissions,
  getOrganizationPermissions,
  getBranchPermissions,
} from "@/services/employee-service";
import type {
  EmployeeItem,
  EmployeeInsertPayload,
  EmployeeUpdatePayload,
  EmployeeBranchPermissionPayload,
} from "@/types/employee.types";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";

export interface EmployeeMutationCallbacks<TData = any, TVariables = any> {
  onSuccess?: (data: TData, variables: TVariables, context?: unknown) => void;
  onError?: (error: Error, variables: TVariables, context?: unknown) => void;
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context?: unknown
  ) => void;
}

/**
 * 1. Hook to fetch employee list for an organization
 */
export const useEmployeeListQuery = (
  organizationId?: number,
  options?: Omit<UseQueryOptions<EmployeeItem[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<EmployeeItem[], Error>({
    queryKey: [employeeListQueryKey, organizationId],
    queryFn: () => getEmployeeList(organizationId),
    staleTime: GLOBAL_STALE_TIME,
    ...options,
  });
};

/**
 * 2. Hook to create a new employee
 */
export const useInsertEmployeeMutation = (callbacks?: EmployeeMutationCallbacks) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Partial<EmployeeInsertPayload>>({
    mutationFn: (form) => insertEmployee(form),
    onSuccess: (data, variables, context) => {
      showSuccessToast("Employee created successfully!");
      queryClient.invalidateQueries({ queryKey: [employeeListQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to create employee");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 3. Hook to update an existing employee
 */
export const useUpdateEmployeeMutation = (callbacks?: EmployeeMutationCallbacks) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: number; data: Partial<EmployeeUpdatePayload> }>({
    mutationFn: ({ id, data }) => updateEmployee(id, data),
    onSuccess: (data, variables, context) => {
      const empId = Number(variables.id);
      if (empId) {
        queryClient.setQueriesData<EmployeeItem[]>(
          { queryKey: [employeeListQueryKey] },
          (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((emp) => {
              const currentId = Number(emp.id || (emp as any)?.employeeId);
              if (currentId === empId) {
                const nextActive =
                  variables.data.active !== undefined
                    ? Boolean(variables.data.active)
                    : variables.data.status !== undefined
                    ? String(variables.data.status).toLowerCase() === "active"
                    : emp.active;

                return {
                  ...emp,
                  ...variables.data,
                  active: nextActive,
                  status: nextActive ? "ACTIVE" : "INACTIVE",
                  isActive: nextActive,
                  is_active: nextActive ? 1 : 0,
                };
              }
              return emp;
            });
          }
        );
      }

      showSuccessToast("Employee updated successfully!");
      queryClient.invalidateQueries({ queryKey: [employeeListQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update employee");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 4. Hook to fetch branch permissions for a specific employee
 */
export const useEmployeeBranchPermissionsQuery = (
  employeeId: number,
  options?: Omit<UseQueryOptions<any[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<any[], Error>({
    queryKey: [employeeBranchPermissionsQueryKey, employeeId],
    queryFn: () => getEmployeeBranchPermissions(employeeId),
    enabled: Boolean(employeeId),
    staleTime: GLOBAL_STALE_TIME,
    ...options,
  });
};

/**
 * 5. Hook to assign branch permission to an employee
 */
export const useCreateEmployeeBranchPermissionMutation = (
  callbacks?: EmployeeMutationCallbacks
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, EmployeeBranchPermissionPayload>({
    mutationFn: (payload) => createEmployeeBranchPermission(payload),
    onSuccess: (data, variables, context) => {
      showSuccessToast("Branch permission assigned successfully!");
      queryClient.invalidateQueries({ queryKey: [employeeBranchPermissionsQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to assign branch permission");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 6. Hook to update branch permission for an employee
 */
export const useUpdateEmployeeBranchPermissionMutation = (
  callbacks?: EmployeeMutationCallbacks
) => {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    { permissionId?: number; id?: number; data?: Partial<EmployeeBranchPermissionPayload> }
  >({
    mutationFn: (param: any) => {
      const pId = Number(param.permissionId ?? param.id);
      const dataPayload = param.data || param;
      return updateEmployeeBranchPermission(pId, dataPayload);
    },
    onSuccess: (data, variables, context) => {
      showSuccessToast("Branch permission updated successfully!");
      queryClient.invalidateQueries({ queryKey: [employeeBranchPermissionsQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to update branch permission");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 7. Hook to revoke / delete branch permission
 */
export const useDeleteEmployeeBranchPermissionMutation = (
  callbacks?: EmployeeMutationCallbacks
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number | { permissionId: number; employeeId?: number }>({
    mutationFn: (param) => {
      if (typeof param === "number") {
        return deleteEmployeeBranchPermission(param);
      }
      return deleteEmployeeBranchPermission(param.permissionId, param.employeeId);
    },
    onSuccess: (data, variables, context) => {
      showSuccessToast("Branch permission removed successfully!");
      queryClient.invalidateQueries({ queryKey: [employeeBranchPermissionsQueryKey] });
      callbacks?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      showErrorToast(error?.message || "Failed to remove branch permission");
      callbacks?.onError?.(error, variables, context);
    },
    onSettled: callbacks?.onSettled,
  });
};

/**
 * 8. Hook to fetch organization-wide permissions catalog
 */
export const useOrganizationPermissionsQuery = (
  organizationId?: number,
  options?: Omit<UseQueryOptions<any[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<any[], Error>({
    queryKey: [organizationPermissionsQueryKey, organizationId],
    queryFn: () => getOrganizationPermissions(organizationId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * 9. Hook to fetch branch-specific permission settings
 */
export const useBranchPermissionsQuery = (
  branchId: number,
  options?: Omit<UseQueryOptions<any, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<any, Error>({
    queryKey: [branchPermissionsQueryKey, branchId],
    queryFn: () => getBranchPermissions(branchId),
    enabled: Boolean(branchId),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

