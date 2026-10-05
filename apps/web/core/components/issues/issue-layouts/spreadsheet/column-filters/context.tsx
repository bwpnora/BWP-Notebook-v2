/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

  const values = useMemo(() => {
    const committed = columnFiltersFromConditions(filter?.allConditions ?? []);
    const merged: TColumnFilterValues = { ...committed };
    (Object.keys(drafts) as TColumnFilterKey[]).forEach((key) => {
      const draft = drafts[key];
      if (isEmptyColumnFilterValue(draft)) delete merged[key];
      else (merged as Record<string, unknown>)[key] = draft;
    });
    return merged;
  }, [filter?.allConditions, drafts]);

  const hasActiveFilters = useMemo(
    () => Object.values(values).some((value) => !isEmptyColumnFilterValue(value)),
    [values]
  );

  const contextValue = useMemo(
    () => ({ isAvailable: !!filter, values, hasActiveFilters, setValue, clearAll }),
    [filter, values, hasActiveFilters, setValue, clearAll]
  );

  return (
    <SpreadsheetColumnFiltersContext.Provider value={contextValue}>{children}</SpreadsheetColumnFiltersContext.Provider>
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
