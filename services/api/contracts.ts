import { z } from "zod";

export const analyticsQuerySchema = z.object({
  seasonId: z.string().uuid(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const teamAnalyticsQuerySchema = analyticsQuerySchema.extend({
  recentWindow: z.coerce.number().int().min(1).max(20).default(5),
}).strict();

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiMeta = {
  requestId: string;
  methodologyVersion?: string;
  cached: boolean;
  pagination?: PaginationMeta;
};

export function paginate<T>(items: T[], page: number, pageSize: number): { data: T[]; meta: PaginationMeta } {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages },
  };
}
