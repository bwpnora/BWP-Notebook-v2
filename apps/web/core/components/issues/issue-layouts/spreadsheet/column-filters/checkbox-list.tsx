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
