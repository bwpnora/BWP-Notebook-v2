/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
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

export const SpreadsheetRoomColumn = observer(function SpreadsheetRoomColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState<string>(issue.room !== null && issue.room !== undefined ? String(issue.room) : "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setVal(issue.room !== null && issue.room !== undefined ? String(issue.room) : "");
    }
  }, [issue.room, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const trimmed = val.trim();
    const parsed = trimmed ? parseInt(trimmed, 10) : null;
    const currentRoom = issue.room !== null && issue.room !== undefined ? issue.room : null;
    if (parsed !== currentRoom) {
      onChange(
        issue,
        { room: parsed },
        {
          changed_property: "room",
          change_details: parsed,
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
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setVal(issue.room !== null && issue.room !== undefined ? String(issue.room) : "");
              setIsEditing(false);
              onClose?.();
            }
          }}
          className="text-xs w-full bg-transparent text-primary outline-none"
          placeholder="Số phòng"
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
      className="text-xs flex h-11 w-full items-center border-b-[0.5px] border-subtle px-3 text-left text-primary hover:bg-surface-2 disabled:cursor-not-allowed"
    >
      {issue.room !== null && issue.room !== undefined ? (
        <span>Phòng {issue.room}</span>
      ) : (
        <span className="text-placeholder">-</span>
      )}
    </button>
  );
});
