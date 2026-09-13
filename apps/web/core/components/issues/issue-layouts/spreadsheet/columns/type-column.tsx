/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import React from "react";
import { observer } from "mobx-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
// types
import type { TIssue } from "@plane/types";
// ui
import { CustomMenu } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkspace } from "@/hooks/store/use-workspace";

type Props = {
  issue: TIssue;
  onClose: () => void;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates: any) => void;
  disabled: boolean;
};

export const SpreadsheetTypeColumn = observer(function SpreadsheetTypeColumn(props: Props) {
  const { issue, onChange, disabled, onClose } = props;
  const { currentWorkspace } = useWorkspace();
  const { allowPermissions, isSuperAdmin } = useUserPermissions();

  const isManager = Boolean(
    isSuperAdmin ||
    (currentWorkspace?.slug &&
      (allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, currentWorkspace.slug) ||
        (issue.project_id &&
          allowPermissions(
            [EUserPermissions.ADMIN],
            EUserPermissionsLevel.PROJECT,
            currentWorkspace.slug,
            issue.project_id
          ))))
  );

  const isOther = issue.type_detail?.name === "Công việc khác" || issue.type_id === "other";
  const label = isOther ? "Công việc khác" : "Công việc vận hành";

  return (
    <div className="flex h-11 items-center border-b-[0.5px] border-subtle px-3">
      <CustomMenu
        customButton={
          <span
            className={cn(
              "flex h-6 items-center gap-1.5 rounded-sm border-[0.5px] px-2 text-[11px] font-medium whitespace-nowrap transition-colors",
              isOther
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
            <span className="whitespace-nowrap">{label}</span>
          </span>
        }
        className="flex items-center"
        customButtonClassName="flex items-center"
        closeOnSelect
        disabled={disabled || !isManager}
      >
        <CustomMenu.MenuItem
          onClick={() => {
            onChange(issue, { type_id: "operational" }, { changed_property: "type_id", change_details: "operational" });
            onClose?.();
          }}
          className="text-xs flex items-center gap-2"
        >
          <span className="bg-blue-500 h-2 w-2 rounded-full" />
          <span>Công việc vận hành</span>
        </CustomMenu.MenuItem>
        <CustomMenu.MenuItem
          onClick={() => {
            if (isManager) {
              onChange(issue, { type_id: "other" }, { changed_property: "type_id", change_details: "other" });
              onClose?.();
            }
          }}
          disabled={!isManager}
          className={cn("text-xs flex items-center gap-2", !isManager && "cursor-not-allowed opacity-50")}
        >
          <span className="bg-amber-500 h-2 w-2 rounded-full" />
          <span>Công việc khác {!isManager && "(Chỉ quản lý)"}</span>
        </CustomMenu.MenuItem>
      </CustomMenu>
    </div>
  );
});
