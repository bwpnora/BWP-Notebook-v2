/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by IT Leon
 */

import React, { useState, useRef, useEffect } from "react";
import { observer } from "mobx-react";
// types
import type { TIssue } from "@plane/types";

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export const SpreadsheetNotesColumn = observer(function SpreadsheetNotesColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState<string>(issue.notes ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const cleaned = val.trim() || null;
    if (cleaned !== (issue.notes ?? null)) {
      onChange(
        issue,
        { notes: cleaned },
        {
          changed_property: "notes",
          change_details: cleaned,
        }
      );
    }
    onClose?.();
  };

  if (isEditing && !disabled) {
    return (
      <div className="flex h-11 items-center border-b-[0.5px] border-subtle px-3">
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setVal(issue.notes ?? "");
              setIsEditing(false);
              onClose?.();
            }
          }}
          className="text-xs w-full bg-transparent text-primary outline-none"
          placeholder="Ghi chú công việc"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) setIsEditing(true);
      }}
      disabled={disabled}
      className="text-xs flex h-11 w-full items-center truncate border-b-[0.5px] border-subtle px-3 text-left text-primary hover:bg-surface-2 disabled:cursor-not-allowed"
      title={issue.notes ?? undefined}
    >
      {issue.notes ? <span className="truncate">{issue.notes}</span> : <span className="text-placeholder">-</span>}
    </button>
  );
});
