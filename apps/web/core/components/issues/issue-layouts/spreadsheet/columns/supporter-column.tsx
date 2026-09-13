/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import React from "react";
import { observer } from "mobx-react";
// types
import type { TIssue } from "@plane/types";
// components
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export const SpreadsheetSupporterColumn = observer(function SpreadsheetSupporterColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;

  return (
    <div className="h-11 border-b-[0.5px] border-subtle">
      <MemberDropdown
        value={issue?.supporter_ids ?? []}
        onChange={(data) => {
          onChange(
            issue,
            { supporter_ids: data },
            {
              changed_property: "supporters",
              change_details: data,
            }
          );
        }}
        projectId={issue?.project_id ?? undefined}
        disabled={disabled}
        multiple
        placeholder="Người hỗ trợ"
        buttonVariant={
          issue?.supporter_ids && issue.supporter_ids.length > 1 ? "transparent-without-text" : "transparent-with-text"
        }
        buttonClassName="text-left rounded-none group-[.selected-issue-row]:bg-accent-primary/5 group-[.selected-issue-row]:hover:bg-accent-primary/10 px-page-x"
        buttonContainerClassName="w-full"
        optionsClassName="z-[9]"
        onClose={onClose}
      />
    </div>
  );
});
