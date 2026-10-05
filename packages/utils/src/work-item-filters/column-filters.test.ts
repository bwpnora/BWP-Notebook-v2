// packages/utils/src/work-item-filters/column-filters.test.ts
import { describe, expect, it } from "vitest";
import {
  columnFiltersFromConditions,
  getWorkTypeKey,
  isEmptyColumnFilterValue,
  matchesColumnFilters,
} from "./column-filters";
import type { TColumnFilterableIssue } from "./column-filters";

const base: TColumnFilterableIssue = {
  state_id: "s1",
  priority: "high",
  assignee_ids: ["a1"],
  supporter_ids: ["u1"],
  room: 1733,
  created_at: "2026-10-03T09:15:00+07:00",
  type_id: null,
  type_detail: null,
};

describe("matchesColumnFilters", () => {
  it("passes when no filters", () => {
    expect(matchesColumnFilters(base, {})).toBe(true);
  });

  it("ORs values within a column", () => {
    expect(matchesColumnFilters(base, { state_id: ["s2", "s1"] })).toBe(true);
    expect(matchesColumnFilters(base, { state_id: ["s2"] })).toBe(false);
  });

  it("ANDs across columns", () => {
    expect(matchesColumnFilters(base, { state_id: ["s1"], priority: ["low"] })).toBe(false);
    expect(matchesColumnFilters(base, { state_id: ["s1"], priority: ["high"] })).toBe(true);
  });

  it("matches members by any overlap", () => {
    expect(matchesColumnFilters(base, { assignee_id: ["x", "a1"] })).toBe(true);
    expect(matchesColumnFilters(base, { supporter_id: ["x"] })).toBe(false);
    expect(matchesColumnFilters({ ...base, supporter_ids: [] }, { supporter_id: ["u1"] })).toBe(false);
  });

  it("keeps rows whose data is not loaded (server decides)", () => {
    expect(matchesColumnFilters({ ...base, supporter_ids: undefined }, { supporter_id: ["zzz"] })).toBe(true);
    expect(matchesColumnFilters({ ...base, room: undefined }, { room_search: "99" })).toBe(true);
    expect(matchesColumnFilters({ ...base, created_at: undefined }, { created_at: ["2026-01-01", "2026-01-02"] })).toBe(
      true
    );
  });

  it("matches room as substring and excludes empty room", () => {
    expect(matchesColumnFilters(base, { room_search: "17" })).toBe(true);
    expect(matchesColumnFilters(base, { room_search: "73" })).toBe(true);
    expect(matchesColumnFilters(base, { room_search: "18" })).toBe(false);
    expect(matchesColumnFilters({ ...base, room: null }, { room_search: "17" })).toBe(false);
  });

  it("treats created_at range as inclusive whole days", () => {
    expect(matchesColumnFilters(base, { created_at: ["2026-10-03", "2026-10-03"] })).toBe(true);
    expect(matchesColumnFilters(base, { created_at: ["2026-10-01", "2026-10-02"] })).toBe(false);
    expect(matchesColumnFilters(base, { created_at: ["2026-10-04", "2026-10-05"] })).toBe(false);
  });

  it("filters by work type", () => {
    const other = { ...base, type_id: "t-other", type_detail: { name: "Công việc khác" } };
    expect(matchesColumnFilters(other, { work_type: ["other"] })).toBe(true);
    expect(matchesColumnFilters(other, { work_type: ["operational"] })).toBe(false);
    expect(matchesColumnFilters(base, { work_type: ["operational"] })).toBe(true);
    // type set but detail not loaded -> unknown -> keep
    expect(matchesColumnFilters({ ...base, type_id: "uuid" }, { work_type: ["other"] })).toBe(true);
  });
});

describe("getWorkTypeKey", () => {
  it("classifies like the type column", () => {
    expect(getWorkTypeKey({ type_id: "other" })).toBe("other");
    expect(getWorkTypeKey({ type_id: "x", type_detail: { external_id: "other" } })).toBe("other");
    expect(getWorkTypeKey({ type_id: "operational" })).toBe("operational");
    expect(getWorkTypeKey({ type_id: null })).toBe("operational");
    expect(getWorkTypeKey({ type_id: "x", type_detail: { name: "Công việc vận hành" } })).toBe("operational");
    expect(getWorkTypeKey({ type_id: "x" })).toBeUndefined();
  });
});

describe("columnFiltersFromConditions", () => {
  it("maps rich filter conditions to column values", () => {
    expect(
      columnFiltersFromConditions([
        { property: "state_id", operator: "in", value: ["s1", "s2"] },
        { property: "priority", operator: "exact", value: "high" },
        { property: "room_search", operator: "exact", value: "17" },
        { property: "created_at", operator: "range", value: ["2026-10-01", "2026-10-05"] },
        { property: "created_at", operator: "exact", value: "2026-10-03" },
        { property: "label_id", operator: "in", value: ["l1"] },
      ])
    ).toEqual({
      state_id: ["s1", "s2"],
      priority: ["high"],
      room_search: "17",
      created_at: ["2026-10-01", "2026-10-05"],
    });
  });
});

describe("isEmptyColumnFilterValue", () => {
  it("detects empty values", () => {
    expect(isEmptyColumnFilterValue(undefined)).toBe(true);
    expect(isEmptyColumnFilterValue([])).toBe(true);
    expect(isEmptyColumnFilterValue("")).toBe(true);
    expect(isEmptyColumnFilterValue(["a"])).toBe(false);
    expect(isEmptyColumnFilterValue("1")).toBe(false);
  });
});
