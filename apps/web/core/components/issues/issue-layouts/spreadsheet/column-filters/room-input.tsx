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
        // oxlint-disable-next-line jsx_a11y/no-autofocus
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
