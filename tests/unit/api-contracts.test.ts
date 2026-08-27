import { describe, expect, it } from "vitest";
import { analyticsQuerySchema, paginate } from "@/services/api/contracts";

describe("analytics API contracts", () => {
  it("coerces pagination query values and applies defaults", () => {
    expect(analyticsQuerySchema.parse({ seasonId: "00000000-0000-4000-8000-000000000001", page: "2", pageSize: "10" })).toEqual({
      seasonId: "00000000-0000-4000-8000-000000000001",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects malformed IDs and unknown query keys", () => {
    expect(() => analyticsQuerySchema.parse({ seasonId: "not-a-uuid" })).toThrow();
    expect(() => analyticsQuerySchema.parse({ seasonId: "00000000-0000-4000-8000-000000000001", sort: "secret" })).toThrow();
  });

  it("paginates deterministically and reports empty totals", () => {
    expect(paginate(["a", "b", "c"], 2, 2)).toEqual({ data: ["c"], meta: { page: 2, pageSize: 2, total: 3, totalPages: 2 } });
    expect(paginate([], 1, 25).meta).toEqual({ page: 1, pageSize: 25, total: 0, totalPages: 0 });
  });
});
