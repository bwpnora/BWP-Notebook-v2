# Spreadsheet Column Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the spreadsheet layout from each column header (State, Priority, Assignees, Supporters, Created on, Room, Work type) with instant client-side feedback and authoritative server-side results.

**Architecture:** Column menus read/write the existing rich filter instance (`IWorkItemFilterInstance`) for the current entity. A React context in the spreadsheet holds _draft_ values that are applied immediately by a pure predicate (`matchesColumnFilters`) on loaded issues, and commits them to the filter instance after 400ms; the filter instance then refetches from the API (`?filters=` → `ComplexFilterBackend` → `IssueFilterSet`). Three new backend filter keys are added: `supporter_id`, `work_type`, `room_search`.

**Tech Stack:** React + MobX (apps/web), `@plane/utils` / `@plane/types` / `@plane/constants`, `@plane/propel/popover` (base-ui), Django + django-filter (apps/api), pytest (Docker), vitest (new in `packages/utils`).

**Spec:** `docs/superpowers/specs/2026-10-05-spreadsheet-column-filters-design.md` (see section 8 "Implementation notes" for deviations discovered during planning).

## Global Constraints

- UI copy is hardcoded Vietnamese, consistent with existing BWP columns.
- Debounce for committing column filters to the server: **400ms**.
- Work type classification: `other` = `type.external_id == "other"` OR `type.name == "Công việc khác"` (frontend also accepts `type_id == "other"`); everything else, including no type, is `operational`.
- Room search: digits only; matches when the room number's decimal string **contains** the typed digits.
- Created-on range: inclusive whole days, `"YYYY-MM-DD,YYYY-MM-DD"`.
- Internal deps use `workspace:*`, external deps `catalog:`.
- Every task ends with `pnpm check` clean for touched packages (or the backend test command) and a commit.
- Backend tests: `docker compose -f docker-compose-test.yml run --rm api-tests pytest <path> -v` (prereq `./setup.sh` once).

## File Structure

| File                                                                                                                                          | Responsibility                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/api/plane/utils/filters/filterset.py` (modify)                                                                                          | New filters `supporter_id[__in]`, `work_type[__in]`, `room_search[__exact]` |
| `apps/api/plane/app/views/issue/base.py` (modify)                                                                                             | Add `supporter_ids` to `IssueListEndpoint` values                           |
| `apps/api/plane/tests/unit/utils/test_issue_filterset_bwp.py` (create)                                                                        | Backend tests                                                               |
| `packages/types/src/view-props.ts` (modify)                                                                                                   | Register new filter property keys                                           |
| `packages/constants/src/issue/filter.ts` (modify)                                                                                             | Show `supporter_id`, `work_type` in header "Add filter"                     |
| `packages/utils/src/work-item/base.ts` (modify)                                                                                               | Default-on `supporter` and `room` display properties                        |
| `packages/utils/src/work-item-filters/column-filters.ts` (create)                                                                             | Pure types + predicate + condition mapping                                  |
| `packages/utils/src/work-item-filters/column-filters.test.ts` (create)                                                                        | vitest                                                                      |
| `packages/utils/vitest.config.ts`, `packages/utils/package.json` (create/modify)                                                              | vitest setup                                                                |
| `packages/utils/src/work-item-filters/configs/filters/bwp.ts` (create)                                                                        | Rich filter configs for supporter / work type / room                        |
| `apps/web/core/hooks/work-item-filters/use-work-item-filters-config.tsx` (modify)                                                             | Register the 3 configs                                                      |
| `apps/web/core/components/work-item-filters/filters-hoc/base.tsx` (modify)                                                                    | Pass current room search value to configs                                   |
| `apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters/context.tsx` (create)                                               | Draft state, debounced commit, effective values                             |
| `.../column-filters/constants.ts` (create)                                                                                                    | Column property → filter key map                                            |
| `.../column-filters/checkbox-list.tsx`, `member-list.tsx`, `date-range.tsx`, `room-input.tsx`, `section.tsx`, `body.tsx`, `index.ts` (create) | Filter UI                                                                   |
| `.../spreadsheet/columns/header-column.tsx` (modify)                                                                                          | Popover with sort + filter, active indicator                                |
| `.../spreadsheet/spreadsheet-view.tsx` (modify)                                                                                               | Client-side row filtering, refresh bar, filtered-empty row                  |
| `.../spreadsheet/base-spreadsheet-root.tsx` (modify)                                                                                          | Mount provider, pass refresh flag                                           |

---

### Task 1: Backend filters + `supporter_ids` in IssueListEndpoint

**Files:**

- Modify: `apps/api/plane/utils/filters/filterset.py` (imports L5-11; `IssueFilterSet` L135-200; add methods at end of class)
- Modify: `apps/api/plane/app/views/issue/base.py:206-236`
- Test: `apps/api/plane/tests/unit/utils/test_issue_filterset_bwp.py`

**Interfaces:**

- Produces API filter keys (accepted inside `?filters=` JSON): `supporter_id`, `supporter_id__exact`, `supporter_id__in` (UUID CSV); `work_type`, `work_type__exact`, `work_type__in` (`operational`/`other` CSV); `room_search`, `room_search__exact` (digit string).

- [ ] **Step 1: Write the failing tests**

```python
# apps/api/plane/tests/unit/utils/test_issue_filterset_bwp.py
from uuid import uuid4

import pytest

from plane.db.models import Issue, IssueSupporter, IssueType, Project, ProjectMember, User
from plane.utils.filters.filterset import IssueFilterSet


@pytest.fixture
def project(db, workspace, create_user):
    project = Project.objects.create(
        name="BWP Filter Project", identifier="BFP", workspace=workspace, created_by=create_user
    )
    ProjectMember.objects.create(project=project, member=create_user, role=20, is_active=True)
    return project


@pytest.fixture
def supporter(db):
    suffix = uuid4().hex[:8]
    return User.objects.create(email=f"sup-{suffix}@bwp.vn", username=f"sup_{suffix}")


@pytest.fixture
def types(db, workspace, create_user):
    operational = IssueType.objects.create(
        workspace=workspace, name="Công việc vận hành", external_id="operational", created_by=create_user
    )
    other_by_external_id = IssueType.objects.create(
        workspace=workspace, name="Khác (ext)", external_id="other", created_by=create_user
    )
    other_by_name = IssueType.objects.create(
        workspace=workspace, name="Công việc khác", external_id=None, created_by=create_user
    )
    return {"operational": operational, "other_ext": other_by_external_id, "other_name": other_by_name}


def _issue(project, user, name, **kwargs):
    return Issue.objects.create(
        name=name, project=project, workspace=project.workspace, created_by=user, **kwargs
    )


def _filter(project, data):
    qs = Issue.objects.filter(project=project)
    fs = IssueFilterSet(data=data, queryset=qs)
    assert fs.is_valid(), fs.errors
    return set(fs.qs.values_list("name", flat=True))


@pytest.mark.unit
class TestDeclaredKeys:
    def test_new_keys_are_declared_for_complex_filter_backend(self):
        for key in [
            "supporter_id",
            "supporter_id__exact",
            "supporter_id__in",
            "work_type",
            "work_type__exact",
            "work_type__in",
            "room_search",
            "room_search__exact",
        ]:
            assert key in IssueFilterSet.base_filters, key


@pytest.mark.unit
class TestSupporterFilter:
    def test_in_matches_active_supporter_only(self, project, create_user, supporter):
        with_supporter = _issue(project, create_user, "with")
        removed = _issue(project, create_user, "removed")
        _issue(project, create_user, "without")
        IssueSupporter.objects.create(
            issue=with_supporter, supporter=supporter, project=project, workspace=project.workspace
        )
        link = IssueSupporter.objects.create(
            issue=removed, supporter=supporter, project=project, workspace=project.workspace
        )
        link.delete()  # soft delete

        assert _filter(project, {"supporter_id__in": str(supporter.id)}) == {"with"}
        assert _filter(project, {"supporter_id": str(supporter.id)}) == {"with"}


@pytest.mark.unit
class TestRoomSearchFilter:
    @pytest.fixture
    def rooms(self, project, create_user):
        _issue(project, create_user, "r1733", room=1733)
        _issue(project, create_user, "r170", room=170)
        _issue(project, create_user, "r217", room=217)
        _issue(project, create_user, "r101", room=101)
        _issue(project, create_user, "no-room", room=None)

    def test_partial_match(self, project, rooms):
        assert _filter(project, {"room_search__exact": "17"}) == {"r1733", "r170", "r217"}

    def test_exact_number_matches_itself(self, project, rooms):
        assert _filter(project, {"room_search": "101"}) == {"r101"}

    def test_non_digit_value_is_noop(self, project, rooms):
        assert _filter(project, {"room_search": "abc"}) == {"r1733", "r170", "r217", "r101", "no-room"}


@pytest.mark.unit
class TestWorkTypeFilter:
    @pytest.fixture
    def typed(self, project, create_user, types):
        _issue(project, create_user, "op", type=types["operational"])
        _issue(project, create_user, "other-ext", type=types["other_ext"])
        _issue(project, create_user, "other-name", type=types["other_name"])
        _issue(project, create_user, "untyped", type=None)

    def test_other(self, project, typed):
        assert _filter(project, {"work_type__in": "other"}) == {"other-ext", "other-name"}

    def test_operational_includes_untyped(self, project, typed):
        assert _filter(project, {"work_type": "operational"}) == {"op", "untyped"}

    def test_both_values_is_noop(self, project, typed):
        assert _filter(project, {"work_type__in": "operational,other"}) == {
            "op",
            "other-ext",
            "other-name",
            "untyped",
        }


@pytest.mark.unit
class TestCombined:
    def test_and_across_keys(self, project, create_user, types):
        _issue(project, create_user, "match", room=1701, type=types["other_ext"])
        _issue(project, create_user, "wrong-type", room=1701, type=types["operational"])
        _issue(project, create_user, "wrong-room", room=200, type=types["other_ext"])
        assert _filter(project, {"room_search": "17", "work_type__in": "other"}) == {"match"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/unit/utils/test_issue_filterset_bwp.py -v`
Expected: FAIL (`AssertionError: supporter_id` in `TestDeclaredKeys`, and `fs.is_valid()` / result mismatches elsewhere).

- [ ] **Step 3: Implement filters**

In `filterset.py` imports add:

```python
from django.db.models import CharField, Q
from django.db.models.functions import Cast
```

(replace the existing `from django.db.models import Q` line).

Add at module level, after `DateCSVRangeFilter`:

```python
WORK_TYPE_OPERATIONAL = "operational"
WORK_TYPE_OTHER = "other"
WORK_TYPE_OTHER_NAME = "Công việc khác"


def _work_type_other_q():
    return Q(type__external_id=WORK_TYPE_OTHER) | Q(type__name=WORK_TYPE_OTHER_NAME)
```

Inside `IssueFilterSet`, after the `label_id__in` declaration:

```python
    # BWP-Notebook-v2 spreadsheet column filters
    supporter_id = filters.UUIDFilter(method="filter_supporter_id")
    supporter_id__exact = filters.UUIDFilter(method="filter_supporter_id")
    supporter_id__in = UUIDInFilter(method="filter_supporter_id_in", lookup_expr="in")

    work_type = filters.CharFilter(method="filter_work_type")
    work_type__exact = filters.CharFilter(method="filter_work_type")
    work_type__in = CharInFilter(method="filter_work_type_in", lookup_expr="in")

    # The rich filter UI has no "contains" operator, so the search term travels as
    # `room_search__exact` and is matched as a substring of the room number here.
    room_search = filters.CharFilter(method="filter_room_search")
    room_search__exact = filters.CharFilter(method="filter_room_search")
```

Methods at the end of the class:

```python
    def filter_supporter_id(self, queryset, name, value):
        """Filter by supporter ID, excluding soft deleted supporter links"""
        return Q(issue_supporter__supporter_id=value, issue_supporter__deleted_at__isnull=True)

    def filter_supporter_id_in(self, queryset, name, value):
        """Filter by supporter IDs (in), excluding soft deleted supporter links"""
        return Q(issue_supporter__supporter_id__in=value, issue_supporter__deleted_at__isnull=True)

    def _work_type_q(self, values):
        selected = {v for v in values if v in (WORK_TYPE_OPERATIONAL, WORK_TYPE_OTHER)}
        if not selected or len(selected) == 2:
            return Q()
        other_q = _work_type_other_q()
        if selected == {WORK_TYPE_OTHER}:
            return other_q
        # operational = not "other", including issues without a type
        return Q(type__isnull=True) | (~Q(type__external_id=WORK_TYPE_OTHER) & ~Q(type__name=WORK_TYPE_OTHER_NAME))

    def filter_work_type(self, queryset, name, value):
        return self._work_type_q([value] if value else [])

    def filter_work_type_in(self, queryset, name, value):
        return self._work_type_q(value or [])

    def filter_room_search(self, queryset, name, value):
        term = (value or "").strip()
        if not term.isdigit():
            return Q()
        matching = (
            Issue.objects.filter(room__isnull=False)
            .annotate(room_text=Cast("room", CharField()))
            .filter(room_text__contains=term)
            .values("pk")
        )
        return Q(pk__in=matching)
```

In `apps/api/plane/app/views/issue/base.py` `IssueListEndpoint` values list (L222), add `"supporter_ids",` right after `"assignee_ids",`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/unit/utils/test_issue_filterset_bwp.py plane/tests/unit/utils/test_issue_datetime_filters.py plane/tests/unit/utils/test_issue_filters.py -v`
Expected: all PASS. If `test_operational_includes_untyped` fails because of null-join negation semantics, replace the operational branch with `~Q(pk__in=Issue.objects.filter(other_q).values("pk"))` and re-run.

- [ ] **Step 5: Commit**

```bash
git add apps/api/plane/utils/filters/filterset.py apps/api/plane/app/views/issue/base.py apps/api/plane/tests/unit/utils/test_issue_filterset_bwp.py
git commit -m "feat(api): add supporter, work type and room search issue filters"
```

---

### Task 2: Register filter keys, header filter list, default columns

**Files:**

- Modify: `packages/types/src/view-props.ts:96-112`
- Modify: `packages/constants/src/issue/filter.ts:206-219` (`ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters`)
- Modify: `packages/utils/src/work-item/base.ts:294-313`

**Interfaces:**

- Produces: `TWorkItemFilterProperty` now includes `"supporter_id" | "work_type" | "room_search"`.

- [ ] **Step 1: Add keys** — append to `WORK_ITEM_FILTER_PROPERTY_KEYS` after `"updated_at",`:

```ts
  // BWP-Notebook-v2 spreadsheet column filters
  "supporter_id",
  "work_type",
  "room_search",
```

- [ ] **Step 2: Show supporter/work type in header "Add filter"** — in `ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.filters` append `"supporter_id", "work_type"` after `"assignee_id"`. (Do **not** add `room_search`: the header row has no text input; it is only editable from the column menu.)

- [ ] **Step 3: Default-on columns** — in `getComputedDisplayProperties` add after `issue_type`:

```ts
  supporter: displayProperties?.supporter ?? true,
  room: displayProperties?.room ?? true,
```

- [ ] **Step 4: Verify**

Run: `pnpm turbo run check:types --filter=@plane/types --filter=@plane/constants --filter=@plane/utils`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/view-props.ts packages/constants/src/issue/filter.ts packages/utils/src/work-item/base.ts
git commit -m "feat(filters): register supporter, work type and room search filter keys"
```

---

### Task 3: Pure column filter logic + vitest

**Files:**

- Create: `packages/utils/src/work-item-filters/column-filters.ts`
- Create: `packages/utils/src/work-item-filters/column-filters.test.ts`
- Create: `packages/utils/vitest.config.ts`
- Modify: `packages/utils/package.json` (scripts + devDependencies)
- Modify: `packages/utils/src/work-item-filters/index.ts`

**Interfaces:**

- Consumes: `TWorkItemFilterProperty`, `TSupportedOperators` from `@plane/types` (Task 2).
- Produces (exported from `@plane/utils`):
  - `type TColumnFilterKey = "state_id" | "priority" | "assignee_id" | "supporter_id" | "work_type" | "room_search" | "created_at"`
  - `type TWorkTypeKey = "operational" | "other"`
  - `type TColumnFilterValues = { state_id?: string[]; priority?: string[]; assignee_id?: string[]; supporter_id?: string[]; work_type?: TWorkTypeKey[]; room_search?: string; created_at?: [string, string] }`
  - `type TColumnFilterableIssue`
  - `const COLUMN_FILTER_CONDITION: Record<TColumnFilterKey, { property: TColumnFilterKey; operator: "in" | "exact" | "range" }>`
  - `const WORK_TYPE_OPTIONS: { key: TWorkTypeKey; label: string }[]`
  - `isEmptyColumnFilterValue(value: unknown): boolean`
  - `getWorkTypeKey(issue: TColumnFilterableIssue): TWorkTypeKey | undefined`
  - `matchesColumnFilters(issue: TColumnFilterableIssue, filters: TColumnFilterValues): boolean`
  - `columnFiltersFromConditions(conditions: { property: string; operator: string; value: unknown }[]): TColumnFilterValues`

- [ ] **Step 1: Add vitest**

`packages/utils/package.json`: add script `"test": "vitest run"` and devDependency `"vitest": "catalog:"`. Create `packages/utils/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Run: `pnpm install`
Expected: lockfile updated, no errors.

- [ ] **Step 2: Write the failing tests**

```ts
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
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter=@plane/utils test`
Expected: FAIL — `Cannot find module './column-filters'`.

- [ ] **Step 4: Implement**

```ts
// packages/utils/src/work-item-filters/column-filters.ts
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
```

Append to `packages/utils/src/work-item-filters/index.ts`:

```ts
export * from "./column-filters";
```

- [ ] **Step 5: Run tests and checks**

Run: `pnpm --filter=@plane/utils test && pnpm turbo run check:types check:lint --filter=@plane/utils`
Expected: all tests PASS; types and lint clean. (`created_at` exact vs range: the test passes because range appears first and exact does not overwrite.)

- [ ] **Step 6: Commit**

```bash
git add packages/utils pnpm-lock.yaml
git commit -m "feat(utils): add spreadsheet column filter predicate with vitest"
```

---

### Task 4: Rich filter configs for supporter, work type, room search

**Files:**

- Create: `packages/utils/src/work-item-filters/configs/filters/bwp.ts`
- Modify: `packages/utils/src/work-item-filters/configs/filters/index.ts`
- Modify: `apps/web/core/hooks/work-item-filters/use-work-item-filters-config.tsx`
- Modify: `apps/web/core/components/work-item-filters/filters-hoc/base.tsx`

**Interfaces:**

- Consumes: `WORK_TYPE_OPTIONS`, `TWorkTypeKey` (Task 3).
- Produces: `getSupporterFilterConfig`, `getWorkTypeFilterConfig`, `getRoomSearchFilterConfig` (from `@plane/utils`); `TUseWorkItemFiltersConfigProps.roomSearchValues?: string[]`.

- [ ] **Step 1: Create factories**

```ts
// packages/utils/src/work-item-filters/configs/filters/bwp.ts
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import type { TFilterProperty } from "@plane/types";
import { COLLECTION_OPERATOR, EQUALITY_OPERATOR } from "@plane/types";
import type {
  IFilterIconConfig,
  TCreateFilterConfig,
  TCreateFilterConfigParams,
  TCreateUserFilterParams,
} from "../../../rich-filters";
import {
  createFilterConfig,
  createOperatorConfigEntry,
  getMemberMultiSelectConfig,
  getMultiSelectConfig,
  getSingleSelectConfig,
} from "../../../rich-filters";
import type { TWorkTypeKey } from "../../column-filters";
import { WORK_TYPE_OPTIONS } from "../../column-filters";

// ------------ Supporter filter ------------

export const getSupporterFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateUserFilterParams> =>
  (params: TCreateUserFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Người hỗ trợ",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getMemberMultiSelectConfig(updatedParams, EQUALITY_OPERATOR.EXACT)
        ),
      ]),
    });

// ------------ Work type filter ------------

export type TCreateWorkTypeFilterParams = TCreateFilterConfigParams & IFilterIconConfig<TWorkTypeKey>;

export const getWorkTypeFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateWorkTypeFilterParams> =>
  (params: TCreateWorkTypeFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Loại công việc",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getMultiSelectConfig<{ key: TWorkTypeKey; label: string }, TWorkTypeKey, TWorkTypeKey>(
            {
              items: WORK_TYPE_OPTIONS,
              getId: (option) => option.key,
              getLabel: (option) => option.label,
              getValue: (option) => option.key,
              getIconData: (option) => option.key,
            },
            { singleValueOperator: EQUALITY_OPERATOR.EXACT, ...updatedParams },
            { getOptionIcon: updatedParams.getOptionIcon }
          )
        ),
      ]),
    });

// ------------ Room search filter ------------
// Edited from the spreadsheet column menu; registered here so an applied condition
// renders correctly in the header filters row ("Số phòng: chứa 17").

export type TCreateRoomSearchFilterParams = TCreateFilterConfigParams &
  IFilterIconConfig<string> & {
    roomSearchValues: string[];
  };

export const getRoomSearchFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateRoomSearchFilterParams> =>
  (params: TCreateRoomSearchFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Số phòng",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(EQUALITY_OPERATOR.EXACT, params, (updatedParams) =>
          getSingleSelectConfig<string, string>(
            {
              items: updatedParams.roomSearchValues,
              getId: (value) => value,
              getLabel: (value) => `chứa ${value}`,
              getValue: (value) => value,
            },
            { ...updatedParams }
          )
        ),
      ]),
    });
```

Append to `configs/filters/index.ts`: `export * from "./bwp";`

Run: `pnpm turbo run check:types --filter=@plane/utils`
Expected: PASS. If `getSingleSelectConfig` / `IFilterIconConfig` are not re-exported from `../../../rich-filters`, add them to `packages/utils/src/rich-filters/factories/configs/index.ts` exports (they live in `core.ts` / `shared.ts`).

- [ ] **Step 2: Register configs in the hook**

In `use-work-item-filters-config.tsx`:

- Imports: add `DoorOpen, Layers` to the `lucide-react` import; add `getRoomSearchFilterConfig, getSupporterFilterConfig, getWorkTypeFilterConfig` to the `@plane/utils` import.
- Change props type:

```ts
export type TUseWorkItemFiltersConfigProps = {
  allowedFilters: TWorkItemFilterProperty[];
  roomSearchValues?: string[];
} & TWorkItemFiltersEntityProps;
```

- Destructure `roomSearchValues` in the hook.
- After `subscriberFilterConfig` add:

```tsx
// BWP-Notebook-v2: supporter filter config
const supporterFilterConfig = useMemo(
  () =>
    getSupporterFilterConfig<TWorkItemFilterProperty>("supporter_id")({
      isEnabled: isFilterEnabled("supporter_id") && members !== undefined,
      filterIcon: MembersPropertyIcon,
      members: members ?? [],
      getOptionIcon: (memberDetails) => (
        <Avatar
          name={memberDetails.display_name}
          src={getFileURL(memberDetails.avatar_url)}
          showTooltip={false}
          size="sm"
        />
      ),
      ...operatorConfigs,
    }),
  [isFilterEnabled, members, operatorConfigs]
);

// BWP-Notebook-v2: work type filter config
const workTypeFilterConfig = useMemo(
  () =>
    getWorkTypeFilterConfig<TWorkItemFilterProperty>("work_type")({
      isEnabled: isFilterEnabled("work_type"),
      filterIcon: Layers,
      getOptionIcon: (workType) => (
        <span
          className={`size-2 flex-shrink-0 rounded-full ${workType === "other" ? "bg-amber-500" : "bg-blue-500"}`}
        />
      ),
      ...operatorConfigs,
    }),
  [isFilterEnabled, operatorConfigs]
);

// BWP-Notebook-v2: room search filter config (edited from the spreadsheet column menu)
const roomSearchFilterConfig = useMemo(
  () =>
    getRoomSearchFilterConfig<TWorkItemFilterProperty>("room_search")({
      isEnabled: false,
      filterIcon: DoorOpen,
      roomSearchValues: roomSearchValues ?? [],
      ...operatorConfigs,
    }),
  [roomSearchValues, operatorConfigs]
);
```

- Add `supporterFilterConfig, workTypeFilterConfig, roomSearchFilterConfig` to the `configs` array, and `supporter_id: supporterFilterConfig, work_type: workTypeFilterConfig, room_search: roomSearchFilterConfig` to `configMap`.

- [ ] **Step 3: Feed the room value from the HOC**

In `filters-hoc/base.tsx` `WorkItemFilterRoot`: move the `useWorkItemFiltersConfig(...)` call **below** the `workItemLayoutFilter` `useMemo`, and pass the current value:

```tsx
const roomSearchValueKey = toFilterArray(
  workItemLayoutFilter.findFirstConditionByPropertyAndOperator("room_search", "exact")?.value
)
  .map(String)
  .join(",");
const roomSearchValues = useMemo(() => (roomSearchValueKey ? roomSearchValueKey.split(",") : []), [roomSearchValueKey]);
const workItemFiltersConfig = useWorkItemFiltersConfig({
  allowedFilters: filtersToShowByLayout ? filtersToShowByLayout : [],
  roomSearchValues,
  ...entityConfigProps,
});
```

Add `import { toFilterArray } from "@plane/utils";`.

- [ ] **Step 4: Verify**

Run: `pnpm turbo run check:types check:lint --filter=@plane/utils --filter=web`
Expected: PASS.

Manual (`pnpm dev`, project → Công việc): header "Bộ lọc" → "Add filter" lists "Người hỗ trợ" and "Loại công việc"; applying them filters the list (server side) and survives reload.

- [ ] **Step 5: Commit**

```bash
git add packages/utils/src/work-item-filters apps/web/core/hooks/work-item-filters/use-work-item-filters-config.tsx apps/web/core/components/work-item-filters/filters-hoc/base.tsx
git commit -m "feat(filters): add supporter, work type and room search filter configs"
```

---

### Task 5: Spreadsheet column filter context (draft + debounced commit)

**Files:**

- Create: `apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters/constants.ts`
- Create: `apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters/context.tsx`
- Create: `apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters/index.ts`

**Interfaces:**

- Consumes: `COLUMN_FILTER_CONDITION`, `columnFiltersFromConditions`, `isEmptyColumnFilterValue`, `TColumnFilterKey`, `TColumnFilterValues` (Task 3); `useWorkItemFilterInstance(entityType, entityId)` (`@/hooks/store/work-item-filters/use-work-item-filter-instance`).
- Produces:
  - `SPREADSHEET_COLUMN_FILTER_KEY: Partial<Record<keyof IIssueDisplayProperties, TColumnFilterKey>>`
  - `COLUMN_FILTER_COMMIT_DELAY_MS = 400`
  - `<SpreadsheetColumnFiltersProvider entityType entityId>`
  - `useSpreadsheetColumnFilters(): TSpreadsheetColumnFiltersContext` with `{ isAvailable: boolean; values: TColumnFilterValues; hasActiveFilters: boolean; setValue<K>(key: K, value: TColumnFilterValues[K]): void; clearAll(): void }`
  - `useSpreadsheetColumnFilter<K>(key: K): { isAvailable; value: TColumnFilterValues[K]; setValue(v): void; clear(): void; isActive: boolean; activeCount: number }`

- [ ] **Step 1: Constants**

```ts
// column-filters/constants.ts
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import type { IIssueDisplayProperties } from "@plane/types";
import type { TColumnFilterKey } from "@plane/utils";

export const COLUMN_FILTER_COMMIT_DELAY_MS = 400;

export const SPREADSHEET_COLUMN_FILTER_KEY: Partial<Record<keyof IIssueDisplayProperties, TColumnFilterKey>> = {
  state: "state_id",
  priority: "priority",
  assignee: "assignee_id",
  supporter: "supporter_id",
  created_on: "created_at",
  room: "room_search",
  issue_type: "work_type",
};
```

- [ ] **Step 2: Context**

```tsx
// column-filters/context.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import type { IWorkItemFilterInstance } from "@plane/shared-state";
import type { EIssuesStoreType } from "@plane/types";
import { LOGICAL_OPERATOR } from "@plane/types";
import type { TColumnFilterKey, TColumnFilterValues } from "@plane/utils";
import { COLUMN_FILTER_CONDITION, columnFiltersFromConditions, isEmptyColumnFilterValue } from "@plane/utils";
import { useWorkItemFilterInstance } from "@/hooks/store/work-item-filters/use-work-item-filter-instance";
import { COLUMN_FILTER_COMMIT_DELAY_MS } from "./constants";

type TSpreadsheetColumnFiltersContext = {
  isAvailable: boolean;
  values: TColumnFilterValues;
  hasActiveFilters: boolean;
  setValue: <K extends TColumnFilterKey>(key: K, value: TColumnFilterValues[K]) => void;
  clearAll: () => void;
};

const noop = () => {};

const SpreadsheetColumnFiltersContext = createContext<TSpreadsheetColumnFiltersContext>({
  isAvailable: false,
  values: {},
  hasActiveFilters: false,
  setValue: noop,
  clearAll: noop,
});

const commitToFilter = (filter: IWorkItemFilterInstance, key: TColumnFilterKey, value: unknown) => {
  const { property, operator } = COLUMN_FILTER_CONDITION[key];
  const existing =
    filter.findFirstConditionByPropertyAndOperator(property, operator) ??
    (operator === "in" ? filter.findFirstConditionByPropertyAndOperator(property, "exact") : undefined);
  const isEmpty = isEmptyColumnFilterValue(value);
  if (existing) {
    if (isEmpty) filter.removeCondition(existing.id);
    else filter.updateConditionValue(existing.id, value as string | string[]);
    return;
  }
  if (!isEmpty)
    filter.addCondition(LOGICAL_OPERATOR.AND, { property, operator, value: value as string | string[] }, false);
};

type TProviderProps = {
  entityType: EIssuesStoreType;
  entityId: string | undefined;
  children: React.ReactNode;
};

export const SpreadsheetColumnFiltersProvider = observer(function SpreadsheetColumnFiltersProvider(
  props: TProviderProps
) {
  const { entityType, entityId, children } = props;
  const filter = useWorkItemFilterInstance(entityType, entityId);
  // drafts: values typed/selected but not committed to the filter instance yet
  const [drafts, setDrafts] = useState<Partial<Record<TColumnFilterKey, unknown>>>({});
  const timers = useRef(new Map<TColumnFilterKey, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<TColumnFilterKey, unknown>());
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const flush = useCallback((key: TColumnFilterKey) => {
    const timer = timers.current.get(key);
    if (timer) clearTimeout(timer);
    timers.current.delete(key);
    if (!pending.current.has(key)) return;
    const value = pending.current.get(key);
    pending.current.delete(key);
    if (filterRef.current) commitToFilter(filterRef.current, key, value);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setValue = useCallback(
    <K extends TColumnFilterKey>(key: K, value: TColumnFilterValues[K]) => {
      setDrafts((prev) => ({ ...prev, [key]: value }));
      pending.current.set(key, value);
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => flush(key), COLUMN_FILTER_COMMIT_DELAY_MS)
      );
    },
    [flush]
  );

  const clearAll = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    pending.current.clear();
    setDrafts({});
    void filterRef.current?.clearFilters();
  }, []);

  // commit anything still pending when the spreadsheet unmounts
  useEffect(
    () => () => {
      Array.from(pending.current.keys()).forEach((key) => {
        const timer = timers.current.get(key);
        if (timer) clearTimeout(timer);
        if (filterRef.current) commitToFilter(filterRef.current, key, pending.current.get(key));
      });
      pending.current.clear();
      timers.current.clear();
    },
    []
  );

  const committed = columnFiltersFromConditions(filter?.allConditions ?? []);
  const values: TColumnFilterValues = { ...committed };
  (Object.keys(drafts) as TColumnFilterKey[]).forEach((key) => {
    const draft = drafts[key];
    if (isEmptyColumnFilterValue(draft)) delete values[key];
    else (values as Record<string, unknown>)[key] = draft;
  });
  const hasActiveFilters = Object.values(values).some((value) => !isEmptyColumnFilterValue(value));

  return (
    <SpreadsheetColumnFiltersContext.Provider
      value={{ isAvailable: !!filter, values, hasActiveFilters, setValue, clearAll }}
    >
      {children}
    </SpreadsheetColumnFiltersContext.Provider>
  );
});

export const useSpreadsheetColumnFilters = () => useContext(SpreadsheetColumnFiltersContext);

export const useSpreadsheetColumnFilter = <K extends TColumnFilterKey>(key: K) => {
  const { isAvailable, values, setValue } = useSpreadsheetColumnFilters();
  const value = values[key];
  const isActive = !isEmptyColumnFilterValue(value);
  const activeCount = !isActive ? 0 : Array.isArray(value) && key !== "created_at" ? value.length : 1;
  return {
    isAvailable,
    value,
    setValue: (next: TColumnFilterValues[K]) => setValue(key, next),
    clear: () => setValue(key, undefined),
    isActive,
    activeCount,
  };
};
```

```ts
// column-filters/index.ts
export * from "./constants";
export * from "./context";
```

- [ ] **Step 3: Verify**

Run: `pnpm turbo run check:types check:lint --filter=web`
Expected: PASS. (If `IWorkItemFilterInstance.updateConditionValue`'s generic rejects `string | string[]`, cast via `as SingleOrArray<TFilterValue>` imported from `@plane/types`.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters
git commit -m "feat(spreadsheet): add column filter context with debounced commit"
```

---

### Task 6: Column filter UI components

**Files (all under `apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters/`):**

- Create: `section.tsx`, `checkbox-list.tsx`, `member-list.tsx`, `date-range.tsx`, `room-input.tsx`, `body.tsx`
- Modify: `index.ts`

**Interfaces:**

- Consumes: `useSpreadsheetColumnFilter` (Task 5); `FilterOption` from `@/components/issues/issue-layouts/filters` (props `isChecked`, `onClick`, `icon`, `title`); `useProjectState().getProjectStates(projectId)`; `useMember()`; `ISSUE_PRIORITIES` from `@plane/constants`; `PriorityIcon`, `StateGroupIcon` from `@plane/propel/icons`; `WORK_TYPE_OPTIONS`, `renderFormattedPayloadDate` from `@plane/utils`.
- Produces: `<ColumnFilterBody filterKey: TColumnFilterKey projectId: string | undefined />`

- [ ] **Step 1: Section + checkbox list**

```tsx
// section.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

type Props = { activeCount: number; onClear: () => void; children: React.ReactNode };

export function ColumnFilterSection({ activeCount, onClear, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5 border-t-[0.5px] border-subtle px-2 pt-2 pb-1">
      <div className="flex items-center justify-between text-11 font-medium text-tertiary uppercase">
        <span>Lọc{activeCount > 0 ? ` (${activeCount})` : ""}</span>
        {activeCount > 0 && (
          <button type="button" className="text-accent-primary normal-case hover:underline" onClick={onClear}>
            Xóa lọc
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
```

```tsx
// checkbox-list.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { useMemo, useState } from "react";
import { FilterOption } from "@/components/issues/issue-layouts/filters";

export type TColumnFilterOption = { value: string; label: string; icon?: React.ReactNode };

type Props = {
  options: TColumnFilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
};

const SEARCH_THRESHOLD = 6;

export function ColumnFilterCheckboxList({ options, selected, onChange, searchPlaceholder = "Tìm..." }: Props) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div className="flex flex-col gap-1">
      {options.length >= SEARCH_THRESHOLD && (
        <input
          className="w-full rounded-sm border-[0.5px] border-subtle bg-surface-2 px-2 py-1 text-13 outline-none"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      <div className="vertical-scrollbar scrollbar-sm max-h-60 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-1 py-1 text-11 text-placeholder italic">Không có kết quả</p>
        ) : (
          visible.map((option) => (
            <FilterOption
              key={option.value}
              isChecked={selected.includes(option.value)}
              onClick={() => toggle(option.value)}
              icon={option.icon}
              title={option.label}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Member list**

```tsx
// member-list.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import { useMember } from "@/hooks/store/use-member";
import { ColumnFilterCheckboxList } from "./checkbox-list";

type Props = { projectId: string | undefined; selected: string[]; onChange: (next: string[]) => void };

export const ColumnFilterMemberList = observer(function ColumnFilterMemberList(props: Props) {
  const { projectId, selected, onChange } = props;
  const { workspaceSlug } = useParams();
  const {
    getUserDetails,
    project: { getProjectMemberIds, fetchProjectMembers },
  } = useMember();
  const memberIds = projectId ? getProjectMemberIds(projectId, false) : null;

  useEffect(() => {
    if (!memberIds && projectId && workspaceSlug) void fetchProjectMembers(workspaceSlug.toString(), projectId);
  }, [memberIds, projectId, workspaceSlug, fetchProjectMembers]);

  const options = (memberIds ?? []).flatMap((id) => {
    const user = getUserDetails(id);
    if (!user) return [];
    return [
      {
        value: id,
        label: user.display_name,
        icon: <Avatar name={user.display_name} src={getFileURL(user.avatar_url ?? "")} showTooltip={false} size="sm" />,
      },
    ];
  });

  return (
    <ColumnFilterCheckboxList
      options={options}
      selected={selected}
      onChange={onChange}
      searchPlaceholder="Tìm thành viên..."
    />
  );
});
```

- [ ] **Step 3: Date range**

```tsx
// date-range.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import { renderFormattedPayloadDate } from "@plane/utils";

type Props = { value: [string, string] | undefined; onChange: (next: [string, string] | undefined) => void };

const today = () => renderFormattedPayloadDate(new Date()) ?? "";
const daysAgo = (days: number) => renderFormattedPayloadDate(subDays(new Date(), days)) ?? "";

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "Hôm nay", range: () => [today(), today()] },
  { label: "7 ngày gần nhất", range: () => [daysAgo(6), today()] },
  { label: "30 ngày gần nhất", range: () => [daysAgo(29), today()] },
];

export function ColumnFilterDateRange({ value, onChange }: Props) {
  const [from, setFrom] = useState(value?.[0] ?? "");
  const [to, setTo] = useState(value?.[1] ?? "");

  useEffect(() => {
    setFrom(value?.[0] ?? "");
    setTo(value?.[1] ?? "");
  }, [value]);

  const isInvalid = !from || !to || from > to;
  const inputClass = "w-full rounded-sm border-[0.5px] border-subtle bg-surface-2 px-2 py-1 text-13 outline-none";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="rounded-sm border-[0.5px] border-subtle px-2 py-0.5 text-11 hover:bg-layer-1"
            onClick={() => onChange(preset.range())}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-0.5 text-11 text-tertiary">
        Từ ngày
        <input
          type="date"
          className={inputClass}
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-0.5 text-11 text-tertiary">
        Đến ngày
        <input
          type="date"
          className={inputClass}
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      {from && to && from > to && <p className="text-11 text-danger-primary">"Từ ngày" phải trước "Đến ngày"</p>}
      <button
        type="button"
        disabled={isInvalid}
        className="rounded-sm bg-accent-primary px-2 py-1 text-13 font-medium text-on-color disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onChange([from, to])}
      >
        Áp dụng
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Room input**

```tsx
// room-input.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { X } from "lucide-react";

type Props = { value: string | undefined; onChange: (next: string | undefined) => void };

export function ColumnFilterRoomInput({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-sm border-[0.5px] border-subtle bg-surface-2 px-2">
      <input
        autoFocus
        inputMode="numeric"
        className="w-full bg-transparent py-1 text-13 outline-none"
        placeholder="Nhập số phòng, ví dụ 17"
        value={value ?? ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits || undefined);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      />
      {value && (
        <button type="button" aria-label="Xóa số phòng" onClick={() => onChange(undefined)}>
          <X className="size-3.5 text-tertiary" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Body (per-column switch)**

```tsx
// body.tsx
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { observer } from "mobx-react";
import { ISSUE_PRIORITIES } from "@plane/constants";
import { PriorityIcon, StateGroupIcon } from "@plane/propel/icons";
import type { TColumnFilterKey, TWorkTypeKey } from "@plane/utils";
import { WORK_TYPE_OPTIONS } from "@plane/utils";
import { useProjectState } from "@/hooks/store/use-project-state";
import { ColumnFilterCheckboxList } from "./checkbox-list";
import { useSpreadsheetColumnFilter } from "./context";
import { ColumnFilterDateRange } from "./date-range";
import { ColumnFilterMemberList } from "./member-list";
import { ColumnFilterRoomInput } from "./room-input";
import { ColumnFilterSection } from "./section";

type Props = { filterKey: TColumnFilterKey; projectId: string | undefined };

export const ColumnFilterBody = observer(function ColumnFilterBody({ filterKey, projectId }: Props) {
  const { isAvailable, value, setValue, clear, activeCount } = useSpreadsheetColumnFilter(filterKey);
  const { getProjectStates } = useProjectState();
  if (!isAvailable) return null;

  const listValue = (Array.isArray(value) ? value : []) as string[];
  const setList = (next: string[]) => setValue((next.length ? next : undefined) as never);

  let content: React.ReactNode = null;
  switch (filterKey) {
    case "state_id":
      content = (
        <ColumnFilterCheckboxList
          options={(getProjectStates(projectId) ?? []).map((state) => ({
            value: state.id,
            label: state.name,
            icon: <StateGroupIcon stateGroup={state.group} color={state.color} />,
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "priority":
      content = (
        <ColumnFilterCheckboxList
          options={ISSUE_PRIORITIES.map((priority) => ({
            value: priority.key,
            label: priority.title,
            icon: <PriorityIcon priority={priority.key} />,
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "work_type":
      content = (
        <ColumnFilterCheckboxList
          options={WORK_TYPE_OPTIONS.map((option) => ({
            value: option.key,
            label: option.label,
            icon: (
              <span
                className={`size-2 rounded-full ${(option.key as TWorkTypeKey) === "other" ? "bg-amber-500" : "bg-blue-500"}`}
              />
            ),
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "assignee_id":
    case "supporter_id":
      content = <ColumnFilterMemberList projectId={projectId} selected={listValue} onChange={setList} />;
      break;
    case "created_at":
      content = (
        <ColumnFilterDateRange
          value={value as [string, string] | undefined}
          onChange={(next) => setValue(next as never)}
        />
      );
      break;
    case "room_search":
      content = (
        <ColumnFilterRoomInput value={value as string | undefined} onChange={(next) => setValue(next as never)} />
      );
      break;
  }

  return (
    <ColumnFilterSection activeCount={activeCount} onClear={clear}>
      {content}
    </ColumnFilterSection>
  );
});
```

Append to `index.ts`: `export * from "./body";`

- [ ] **Step 6: Verify**

Run: `pnpm turbo run check:types check:lint --filter=web`
Expected: PASS. Fix any Tailwind token names that do not exist in this repo by copying classes from neighbouring components (e.g. `filters/header/helpers/filter-option.tsx`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/core/components/issues/issue-layouts/spreadsheet/column-filters
git commit -m "feat(spreadsheet): add column filter UI components"
```

---

### Task 7: Header popover with sort + filter and active indicator

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/spreadsheet/columns/header-column.tsx` (full rewrite of the render; keep sort logic L31-46)

**Interfaces:**

- Consumes: `SPREADSHEET_COLUMN_FILTER_KEY`, `ColumnFilterBody`, `useSpreadsheetColumnFilter` (Tasks 5-6); `Popover` from `@plane/propel/popover`.
- Props of `HeaderColumn` unchanged.

- [ ] **Step 1: Rewrite render**

Replace the `CustomMenu` block with a controlled popover. Full component body after the existing hooks / `handleOrderBy`:

```tsx
const [isOpen, setIsOpen] = useState(false);
const { projectId } = useParams();
const filterKey = SPREADSHEET_COLUMN_FILTER_KEY[property];
// hooks must not be conditional: use a fallback key and ignore it when the column has no filter
const columnFilter = useSpreadsheetColumnFilter(filterKey ?? "state_id");
const isFiltered = !!filterKey && columnFilter.isAvailable && columnFilter.isActive;

const handleOpenChange = (open: boolean) => {
  setIsOpen(open);
  if (!open) onClose();
};

const sortItem = (orderKey: TIssueOrderByOptions, label: React.ReactNode, icon: React.ReactNode) => {
  const isSelected = selectedMenuItem === `${orderKey}_${property}`;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-sm px-2 py-1 text-13 hover:bg-layer-1",
        isSelected ? "text-primary" : "text-secondary hover:text-primary"
      )}
      onClick={() => {
        handleOrderBy(orderKey, property);
        handleOpenChange(false);
      }}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {isSelected && <CheckIcon className="h-3 w-3" />}
    </button>
  );
};

if (!propertyDetails) return null;

return (
  <Popover open={isOpen} onOpenChange={handleOpenChange}>
    <Popover.Button className="clickable w-full" tabIndex={-1}>
      <Row
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-1.5 py-2 text-13 hover:text-primary",
          isFiltered ? "text-accent-primary" : "text-secondary"
        )}
      >
        <div className="flex items-center gap-1.5">
          <SpreadSheetPropertyIcon
            iconKey={propertyDetails.icon}
            className={cn("h-4 w-4", isFiltered ? "text-accent-primary" : "text-placeholder")}
          />
          {property === "sub_issue_count" && isEpic ? t("issue.label", { count: 2 }) : t(propertyDetails.i18n_title)}
        </div>
        <div className="ml-3 flex items-center gap-1">
          {activeSortingProperty === property && (
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full">
              {propertyDetails.ascendingOrderKey === displayFilters.order_by ? (
                <ArrowDownWideNarrow className="h-3 w-3" />
              ) : (
                <ArrowUpNarrowWide className="h-3 w-3" />
              )}
            </div>
          )}
          {isFiltered ? (
            <span className="relative flex" title={`Đang lọc: ${columnFilter.activeCount}`}>
              <Filter className="h-3 w-3" />
              <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-accent-primary" />
            </span>
          ) : (
            <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
          )}
        </div>
      </Row>
    </Popover.Button>
    <Popover.Panel
      side="bottom"
      align="start"
      sideOffset={4}
      className="z-30 w-64 rounded-md border-[0.5px] border-strong bg-surface-1 py-1 shadow-raised-200"
    >
      <div className="px-1">
        {sortItem(
          propertyDetails.ascendingOrderKey,
          <>
            <span>{propertyDetails.ascendingOrderTitle}</span>
            <MoveRight className="h-3 w-3" />
            <span>{propertyDetails.descendingOrderTitle}</span>
          </>,
          <ArrowDownWideNarrow className="h-3 w-3 stroke-[1.5]" />
        )}
        {sortItem(
          propertyDetails.descendingOrderKey,
          <>
            <span>{propertyDetails.descendingOrderTitle}</span>
            <MoveRight className="h-3 w-3" />
            <span>{propertyDetails.ascendingOrderTitle}</span>
          </>,
          <ArrowUpNarrowWide className="h-3 w-3 stroke-[1.5]" />
        )}
        {selectedMenuItem &&
          displayFilters?.order_by !== "-created_at" &&
          selectedMenuItem.includes(property) &&
          sortItem("-created_at", t("common.actions.clear_sorting"), <Eraser className="h-3 w-3" />)}
      </div>
      {filterKey && <ColumnFilterBody filterKey={filterKey} projectId={projectId?.toString()} />}
    </Popover.Panel>
  </Popover>
);
```

Imports to add/replace:

```tsx
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CheckIcon,
  ChevronDownIcon,
  Eraser,
  Filter,
  MoveRight,
} from "lucide-react";
import { Popover } from "@plane/propel/popover";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
import { ColumnFilterBody, SPREADSHEET_COLUMN_FILTER_KEY, useSpreadsheetColumnFilter } from "../column-filters";
```

Remove the `CustomMenu` import. Wrap the component with `observer` (import from `mobx-react`) since it now reads observable filter state.

Note: the "clear sorting" item no longer shows a `bg-layer-1` selected background; behavior is otherwise identical.

- [ ] **Step 2: Verify**

Run: `pnpm turbo run check:types check:lint --filter=web`
Expected: PASS. If `Popover.Button` does not accept `className`/`tabIndex` typing, pass `render={<button type="button" className="clickable w-full" tabIndex={-1} />}` per base-ui Trigger API.

Manual: open a column menu → sort items work and close the popover; ticking checkboxes keeps the popover open.

- [ ] **Step 3: Commit**

```bash
git add apps/web/core/components/issues/issue-layouts/spreadsheet/columns/header-column.tsx
git commit -m "feat(spreadsheet): add filter section and active indicator to column headers"
```

---

### Task 8: Client-side row filtering, refresh bar, filtered-empty row

**Files:**

- Modify: `apps/web/core/components/issues/issue-layouts/spreadsheet/base-spreadsheet-root.tsx:114-133`
- Modify: `apps/web/core/components/issues/issue-layouts/spreadsheet/spreadsheet-view.tsx`

**Interfaces:**

- Consumes: `SpreadsheetColumnFiltersProvider`, `useSpreadsheetColumnFilters` (Task 5); `matchesColumnFilters` (Task 3); `useIssueDetail().issue.getIssueById`.
- Produces: `SpreadsheetView` prop `isRefreshing?: boolean`.

- [ ] **Step 1: Mount provider and refresh flag** — in `BaseSpreadsheetRoot` return:

```tsx
return (
  <IssueLayoutHOC layout={EIssueLayoutTypes.SPREADSHEET}>
    <SpreadsheetColumnFiltersProvider entityType={storeType} entityId={viewId ?? projectId?.toString()}>
      <SpreadsheetView
        displayProperties={issuesFilter.issueFilters?.displayProperties ?? {}}
        displayFilters={issuesFilter.issueFilters?.displayFilters ?? {}}
        handleDisplayFilterUpdate={handleDisplayFiltersUpdate}
        issueIds={issueIds}
        quickActions={renderQuickActions}
        updateIssue={updateIssue}
        canEditProperties={canEditProperties}
        quickAddCallback={quickAddIssue}
        enableQuickCreateIssue={enableQuickAdd}
        disableIssueCreation={!enableIssueCreation || !isEditingAllowed || isCompletedCycle}
        canLoadMoreIssues={!!nextPageResults}
        loadMoreIssues={fetchNextIssues}
        isEpic={isEpic}
        isRefreshing={issues.getIssueLoader() === "mutation"}
      />
    </SpreadsheetColumnFiltersProvider>
  </IssueLayoutHOC>
);
```

Import: `import { SpreadsheetColumnFiltersProvider } from "./column-filters";`

- [ ] **Step 2: Filter rows in `SpreadsheetView`**

Add prop `isRefreshing?: boolean;` to `Props` and destructure it. After the store hooks add:

```tsx
const {
  issue: { getIssueById },
} = useIssueDetail();
const columnFilters = useSpreadsheetColumnFilters();
// Instant client-side pass over loaded rows; the server result (refetched after the
// debounced commit) replaces issueIds. Re-applying the predicate on top also hides rows
// from any stale/failed response.
const visibleIssueIds = columnFilters.hasActiveFilters
  ? (issueIds ?? []).filter((id) => {
      const issue = getIssueById(id);
      return !issue || matchesColumnFilters(issue, columnFilters.values);
    })
  : issueIds;
const isFilteredEmpty = !!issueIds?.length && visibleIssueIds?.length === 0;
```

Imports: `import { matchesColumnFilters } from "@plane/utils";`, `import { useIssueDetail } from "@/hooks/store/use-issue-detail";`, `import { useSpreadsheetColumnFilters } from "./column-filters";`.

Then use `visibleIssueIds` in place of `issueIds` for `MultipleSelectGroup.entities[SPREADSHEET_SELECT_GROUP]` and `SpreadsheetTable issueIds`. Keep the early return `if (!issueIds || issueIds.length === 0) return <></>;` (server-empty is handled by the existing layout empty state, which already offers clearing filters).

Inside the outer `div` (it is `relative`), right after the portal div:

```tsx
{
  isRefreshing && <div className="absolute top-0 left-0 z-[20] h-0.5 w-full animate-pulse bg-accent-primary" />;
}
```

Directly after the `SpreadsheetTable` element (inside the scroll container):

```tsx
{
  isFilteredEmpty && (
    <div className="flex flex-col items-center gap-2 py-10 text-13 text-tertiary">
      <span>Không có công việc khớp bộ lọc</span>
      <button
        type="button"
        className="rounded-sm border-[0.5px] border-subtle px-3 py-1 text-13 text-primary hover:bg-layer-1"
        onClick={columnFilters.clearAll}
      >
        Xóa tất cả bộ lọc
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm turbo run check:types check:lint --filter=web`
Expected: PASS. If `TIssue` is not assignable to `TColumnFilterableIssue` (e.g. `priority` type), pass `issue as TColumnFilterableIssue`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/issues/issue-layouts/spreadsheet/base-spreadsheet-root.tsx apps/web/core/components/issues/issue-layouts/spreadsheet/spreadsheet-view.tsx
git commit -m "feat(spreadsheet): apply column filters client-side with refresh indicator"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Full checks**

Run: `pnpm check` and `pnpm --filter=@plane/utils test`
Expected: PASS.

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest plane/tests/unit/utils -v`
Expected: PASS.

- [ ] **Step 2: Manual scenarios on `pnpm dev` (project IT → Công việc → Bảng tính)**

1. Trạng thái: tick "Đang thực hiện" → rows update instantly; ~400ms later the refresh bar flashes; header shows the filter icon + dot.
2. Add "Hoàn thành" → both states shown (OR).
3. Ưu tiên + Người phụ trách together → AND.
4. Người hỗ trợ: pick "Võ Thiện Tâm" → only IT-114-like rows remain.
5. Thời gian tạo: "Hôm nay", then custom range with Từ > Đến → Áp dụng disabled.
6. Số phòng: type `17` → rows with rooms containing 17; ✕ clears.
7. Loại công việc: "Công việc khác" only.
8. Reload page → filters persist; header "Bộ lọc" row shows the same conditions (room shows "Số phòng: chứa 17").
9. Filter to zero rows client-side → "Không có công việc khớp bộ lọc" + "Xóa tất cả bộ lọc" works.
10. Cycle and Module spreadsheet: same behavior.

- [ ] **Step 3: Commit any fixes**, then hand off with superpowers:finishing-a-development-branch.
