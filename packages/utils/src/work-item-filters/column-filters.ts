/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

export type TColumnFilterKey =
  | "state_id"
  | "priority"
  | "assignee_id"
  | "supporter_id"
  | "work_type"
  | "room_search"
  | "created_at";

export type TWorkTypeKey = "operational" | "other";

export type TColumnFilterValues = {
  state_id?: string[];
  priority?: string[];
  assignee_id?: string[];
  supporter_id?: string[];
  work_type?: TWorkTypeKey[];
  room_search?: string;
  created_at?: [string, string];
};

export type TColumnFilterableIssue = {
  state_id?: string | null;
  priority?: string | null;
  assignee_ids?: string[];
  supporter_ids?: string[];
  room?: number | null;
  created_at?: string;
  type_id?: string | null;
  type_detail?: { name?: string; external_id?: string } | null;
};

type TColumnFilterOperator = "in" | "exact" | "range";

export const COLUMN_FILTER_CONDITION: Record<
  TColumnFilterKey,
  { property: TColumnFilterKey; operator: TColumnFilterOperator }
> = {
  state_id: { property: "state_id", operator: "in" },
  priority: { property: "priority", operator: "in" },
  assignee_id: { property: "assignee_id", operator: "in" },
  supporter_id: { property: "supporter_id", operator: "in" },
  work_type: { property: "work_type", operator: "in" },
  room_search: { property: "room_search", operator: "exact" },
  created_at: { property: "created_at", operator: "range" },
};

export const WORK_TYPE_OTHER_NAME = "Công việc khác";

export const WORK_TYPE_OPTIONS: { key: TWorkTypeKey; label: string }[] = [
  { key: "operational", label: "Công việc vận hành" },
  { key: "other", label: WORK_TYPE_OTHER_NAME },
];

const LIST_KEYS = ["state_id", "priority", "assignee_id", "supporter_id", "work_type"] as const;

export const isEmptyColumnFilterValue = (value: unknown): boolean =>
  value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

export const getWorkTypeKey = (issue: TColumnFilterableIssue): TWorkTypeKey | undefined => {
  if (
    issue.type_id === "other" ||
    issue.type_detail?.external_id === "other" ||
    issue.type_detail?.name === WORK_TYPE_OTHER_NAME
  )
    return "other";
  if (issue.type_id === null || issue.type_id === "operational" || issue.type_detail) return "operational";
  return undefined;
};

// `undefined` actual value means "not loaded" -> keep the row and let the server decide.
const matchesSingle = (selected: string[], actual: string | null | undefined) =>
  actual === undefined ? true : actual !== null && selected.includes(actual);

const matchesAny = (selected: string[], actual: string[] | undefined) =>
  actual === undefined ? true : actual.some((value) => selected.includes(value));

export const matchesColumnFilters = (issue: TColumnFilterableIssue, filters: TColumnFilterValues): boolean => {
  if (filters.state_id?.length && !matchesSingle(filters.state_id, issue.state_id)) return false;
  if (filters.priority?.length && !matchesSingle(filters.priority, issue.priority)) return false;
  if (filters.assignee_id?.length && !matchesAny(filters.assignee_id, issue.assignee_ids)) return false;
  if (filters.supporter_id?.length && !matchesAny(filters.supporter_id, issue.supporter_ids)) return false;

  if (filters.work_type?.length) {
    const workType = getWorkTypeKey(issue);
    if (workType !== undefined && !filters.work_type.includes(workType)) return false;
  }

  if (filters.room_search) {
    if (issue.room === null) return false;
    if (issue.room !== undefined && !String(issue.room).includes(filters.room_search)) return false;
  }

  if (filters.created_at) {
    const [from, to] = filters.created_at;
    const day = issue.created_at?.slice(0, 10);
    if (day && (day < from || day > to)) return false;
  }

  return true;
};

const toStringArray = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter((v) => v !== undefined && v !== null && v !== "").map(String);

export const columnFiltersFromConditions = (
  conditions: { property: string; operator: string; value: unknown }[]
): TColumnFilterValues => {
  const result: TColumnFilterValues = {};
  for (const condition of conditions) {
    const { property, operator, value } = condition;
    if ((LIST_KEYS as readonly string[]).includes(property) && (operator === "in" || operator === "exact")) {
      const values = toStringArray(value);
      if (values.length) (result as Record<string, string[]>)[property] = values;
    } else if (property === "room_search" && operator === "exact") {
      const term = toStringArray(value)[0];
      if (term) result.room_search = term;
    } else if (property === "created_at") {
      const values = toStringArray(value);
      if (operator === "range" && values.length === 2) result.created_at = [values[0], values[1]];
      if (operator === "exact" && values.length === 1 && !result.created_at) result.created_at = [values[0], values[0]];
    }
  }
  return result;
};
