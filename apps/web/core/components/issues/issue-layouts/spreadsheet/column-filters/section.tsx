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
