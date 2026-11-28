export interface PaginatedApiResult<T> {
  data: T[];
  totalItems: number;
  pageCount: number;
}

type ResponseRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ResponseRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getPositiveNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

export function normalizePaginatedResponse<T>(
  response: unknown,
  limit: number
): PaginatedApiResult<T> {
  const root = isRecord(response) ? response : undefined;
  const raw = root?.data !== undefined ? root.data : response;
  const rawRecord = isRecord(raw) ? raw : undefined;
  const items = Array.isArray(rawRecord?.data)
    ? rawRecord.data
    : Array.isArray(raw)
      ? raw
      : Array.isArray(root?.productsList)
        ? root.productsList
        : [];
  const totalItems =
    getPositiveNumber(rawRecord?.total) ??
    getPositiveNumber(root?.total) ??
    items.length;
  const pageCount =
    getPositiveNumber(rawRecord?.pageCount) ??
    getPositiveNumber(root?.pageCount) ??
    Math.max(1, Math.ceil(totalItems / limit));

  return { data: items as T[], totalItems, pageCount };
}
