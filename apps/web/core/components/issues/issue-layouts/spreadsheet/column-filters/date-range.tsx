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

  const valueFrom = value?.[0];
  const valueTo = value?.[1];

  useEffect(() => {
    setFrom(valueFrom ?? "");
    setTo(valueTo ?? "");
  }, [valueFrom, valueTo]);

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
          onKeyDown={(e) => e.stopPropagation()}
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
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
      {from && to && from > to && (
        <p className="text-11 text-danger-primary">&quot;Từ ngày&quot; phải trước &quot;Đến ngày&quot;</p>
      )}
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
