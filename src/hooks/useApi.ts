import { useMutation, UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData, putData, postFormData, patchFormData } from "../services/api-service";
import { showErrorToast, showSuccessToast } from "../utils/toast-utils";
import { getStoredToken } from "../utils/auth-storage";

export interface ApiResponse<T> {
    data: T;
    statusCode: number;
    message: string;
    total?: number;
    pageCount?: number;
}

export interface PaginateApiResponse<T> {
    statusCode: number;
    message: string;
    data: {
        data: T[];         
        total: number;     
        page: number;      
        limit: number;     
        pageCount: number; 
    };
}

export interface ErrorResponse {
    error: boolean;
    message: string;
}

export interface MutationProps {
    url: string;
    body?: Record<string, unknown>;
}

export interface HandleMutationProps<T> {
    mutation: UseMutationResult<T, ErrorResponse, { url: string; body: Record<string, unknown> }, unknown>;
    url: string;
    body: Record<string, unknown>;
    invalidateQueryKey?: string[];
    showSuccessMessage?: boolean;
    showErrorMessage?: boolean;
    requiredFields?: Array<{ key: string; value: string; label?: string; }>;
}

export interface GetResponseProps {
    queryKey: string[];
    url: string;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
    refetchInterval?: number;
    showToast?: boolean;
    staleTime?: number;
}

export interface ValidationProps {
    body: Record<string, unknown>;
    requiredFields?: Array<{ key: string; value: string; label?: string; }>;
}

export interface HandleDeleteProps {
    url: string;
    invalidateQueryKey?: string[];
    showSuccessMessage?: boolean;
}

export interface FetchDataProps {
    apiUrl: string;
}

const isSuccessfulResponse = <T extends { statusCode?: number; status?: string | number; error?: boolean }>(response: T): boolean => {
    if (!response) return false;
    if (response.error === true) return false;
    if (typeof response.status === 'string' && response.status.toLowerCase() === 'error') return false;
    if (typeof response.status === 'string' && response.status.toLowerCase() === 'success') return true;
    if (response.statusCode === 200 || response.statusCode === 201) return true;
    if (response.status === 200 || response.status === 201) return true;
    return response.error === false || (!response.error && ((response as any).data !== undefined || (response as any).productsList !== undefined));
};

const handleErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
        const errorObj = error as { 
            response?: { data?: { message?: string | string[]; msg?: string | string[] } }; 
            data?: { message?: string | string[]; msg?: string | string[] }; 
            message?: string | string[];
            msg?: string | string[];
        };
        const errorMessage = errorObj.response?.data?.msg || errorObj.response?.data?.message || errorObj.data?.msg || errorObj.data?.message || errorObj.msg || errorObj.message;
        if (errorMessage) {
            Array.isArray(errorMessage) ? errorMessage.forEach(showErrorToast) : showErrorToast(errorMessage);
        }
    }
};

export const useAPI = () => {
    const getToken = () => {
        return getStoredToken();
    };
    const queryClient = useQueryClient();

    const fetchData = async ({ apiUrl }: FetchDataProps) => {
        try {
            const response = await getData({ url: apiUrl, token: getToken() }) as any;
            if (response && !response.error) {
                if (response.statusCode === 200 || response.statusCode === 201) {
                    return response.data !== undefined ? response.data : response;
                } else if (response.data !== undefined) {
                    return response.data;
                } else if (response.message) {
                    showErrorToast(response.message);
                }
            } else if (response?.message) {
                showErrorToast(response.message);
            }
        } catch (e: any) {
            showErrorToast(e?.response?.data?.message || e?.data?.message || e?.message || "Failed to fetch data");
        }
    };

    const deleteMutation = useMutation({
        mutationFn: ({ url }: MutationProps) => deleteData({ url, token: getToken() })
    });

    const postMutation = useMutation<unknown, ErrorResponse, { url: string; body: Record<string, unknown> }>({
        mutationFn: ({ url, body }) => postData({ url, body, token: getToken() })
    });

    const patchMutation = useMutation({
        mutationFn: ({ url, body }: MutationProps) => patchData({ url, body: (body as Record<string, unknown>), token: getToken() })
    });

    const putMutation = useMutation({
        mutationFn: ({ url, body }: MutationProps) => putData({ url, body: (body as Record<string, unknown>), token: getToken() })
    });

    const postFormMutation = useMutation({
        mutationFn: ({ url, body }: MutationProps) => {
            if (!body || typeof body !== "object") {
                throw new Error("Invalid request body.");
            }

            const formData = new FormData();

            for (const [key, value] of Object.entries(body)) {
                if (value === undefined || value === null) {
                    continue;
                }
                if (value instanceof File) {
                    formData.append(key, value);
                } else if (Array.isArray(value)) {
                    const isObjectArray = value.every(item => typeof item === 'object' && !(item instanceof File));
                    if (isObjectArray) {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        value.forEach((item) => {
                            formData.append(key, item);
                        });
                    }
                } else if (typeof value === 'object' && value !== null) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value as any);
                }
            }

            return postFormData({ url, token: getToken(), body: formData });
        }
    });

    const patchFormMutation = useMutation({
        mutationFn: ({ url, body }: MutationProps) => {
            if (!body || typeof body !== "object") {
                throw new Error("Invalid request body.");
            }
            const formData = new FormData();
            for (const [key, value] of Object.entries(body)) {
                if (value === undefined || value === null) {
                    continue;
                }
                if (value instanceof File) {
                    formData.append(key, value);
                } else if (Array.isArray(value)) {
                    const isObjectArray = value.every(item => typeof item === 'object' && !(item instanceof File));
                    if (isObjectArray) {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        value.forEach((item) => {
                            formData.append(key, item);
                        });
                    }
                } else if (typeof value === 'object' && !(value instanceof File)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value as any);
                }
            }
            return patchFormData({ url, token: getToken(), body: formData }); 
        }
    });

    const usePaginatedQuery = <T>({
        queryKey,
        url,
        enabled = true,
        refetchOnWindowFocus = false,
        refetchOnMount = true,
        refetchInterval,
        showToast = true,
        staleTime = 30000
    }: GetResponseProps) => {
        const {
            data: response,
            error,
            isLoading,
            isFetching,
            ...queryProps
        } = useQuery<PaginateApiResponse<T> | ErrorResponse, Error, PaginateApiResponse<T>>({
            queryKey,
            queryFn: () => getData({ url, token: getToken() }) as any,
            refetchOnWindowFocus,
            refetchOnMount,
            staleTime,
            refetchInterval,
            enabled,
            placeholderData: (previousData) => previousData
        });

        let data: T[] = [];
        let totalItems = 0;
        let pageCount = 1;

        if (response && !(response as any).error) {
            const raw = (response as any).data !== undefined ? (response as any).data : response;
            if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
                data = raw.data as T[];
                totalItems = raw.total ?? data.length;
                pageCount = raw.pageCount ?? Math.max(1, Math.ceil(totalItems / 10));
            } else if (Array.isArray(raw)) {
                data = raw as T[];
                totalItems = (response as any).total ?? data.length;
                pageCount = (response as any).pageCount ?? Math.max(1, Math.ceil(totalItems / 10));
            } else if (Array.isArray((response as any).productsList)) {
                data = (response as any).productsList as T[];
                totalItems = (response as any).total ?? data.length;
                pageCount = (response as any).pageCount ?? Math.max(1, Math.ceil(totalItems / 10));
            }
        } else if (error) {
            const errorMessage = error?.message;
            if (showToast) {
                showErrorToast(errorMessage);
            } else {
                console.error(errorMessage);
            }
        }

        return { data, totalItems, pageCount, response: (response as any)?.data, isLoading, isFetching, ...queryProps };
    };

    const validateFormData = ({
        body,
        requiredFields
    }: ValidationProps): boolean => {
        if (requiredFields && requiredFields.length > 0) {
            for (const { key: fieldKey, value: fieldValue, label: fieldLabel } of requiredFields) {
                const fieldName = fieldValue || fieldKey;
                const fieldVariable = body[fieldKey];

                if (!fieldVariable || (typeof fieldVariable === 'string' && fieldVariable.length === 0) || (Array.isArray(fieldVariable) && fieldVariable.length === 0)) {
                    const action = fieldLabel === "image" ? "upload" : fieldLabel === "dropdown" ? "select" : "enter";
                    showErrorToast(`Please ${action} ${fieldName}.`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleApiMutation = async <T>({
        mutation,
        url,
        body = {},
        invalidateQueryKey = [],
        showSuccessMessage = true,
        showErrorMessage = true,
        requiredFields = []
    }: HandleMutationProps<T>) => {
        try {
            if (validateFormData({ body, requiredFields })) {
                const response = await (mutation as any).mutateAsync({ url, body }) as ApiResponse<T>;
                if (isSuccessfulResponse(response)) {
                    const successText = (response as any)?.msg || (response as any)?.message || "Operation successful!";
                    if (showSuccessMessage) showSuccessToast(successText);
                    if (invalidateQueryKey && invalidateQueryKey.length > 0) {
                        await Promise.all(
                            invalidateQueryKey
                                .filter(Boolean)
                                .map((singleKey) =>
                                    queryClient.invalidateQueries({
                                        queryKey: Array.isArray(singleKey) ? singleKey : [singleKey],
                                        exact: false,
                                        refetchType: "all",
                                    })
                                )
                        );
                    }
                    return { success: true, data: response };
                } else if (((response as any)?.message || (response as any)?.msg) && showErrorMessage) {
                    handleErrorMessage(response);
                }
            }
        } catch (e: any) {
            if (showErrorMessage) handleErrorMessage(e);
            return { success: false, error: e };
        }
    };

    const handleDeleteAPI = async <T>({
        url,
        invalidateQueryKey,
        showSuccessMessage = true
    }: HandleDeleteProps) => {
        try {
            const response = await deleteMutation.mutateAsync({ url }) as ApiResponse<T>;
            if (isSuccessfulResponse(response)) {
                if (showSuccessMessage) {
                    showSuccessToast(response.message || (response as any)?.msg || "Deleted successfully!");
                }
                if (invalidateQueryKey && invalidateQueryKey.length > 0) {
                    await Promise.all(
                        invalidateQueryKey
                            .filter(Boolean)
                            .map((singleKey) =>
                                queryClient.invalidateQueries({
                                    queryKey: Array.isArray(singleKey) ? singleKey : [singleKey],
                                    exact: false,
                                    refetchType: "all",
                                })
                            )
                    );
                }
                return response;
            } else {
                handleErrorMessage(response);
            }
        } catch (e: any) {
            handleErrorMessage(e);
        }
    };    

    return {
        deleteMutation,
        postMutation,
        patchMutation,
        putMutation,
        postFormMutation,
        patchFormMutation,
        fetchData,
        usePaginatedQuery,
        handleApiMutation,
        handleDeleteAPI
    };
};
