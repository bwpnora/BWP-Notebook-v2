import React from "react";
import { observer } from "mobx-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { ChevronDown } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import type { TIssue } from "@plane/types";
import { CustomMenu } from "@plane/ui";
import { cn } from "@plane/utils";
// hooks
import { useUserPermissions } from "@/hooks/store/user";

type TIssueTaskTypeSelectProps = {
  control: Control<TIssue>;
  projectId: string | null;
  workspaceSlug?: string;
  handleFormChange: () => void;
};

export const IssueTaskTypeSelect = observer(function IssueTaskTypeSelect(props: TIssueTaskTypeSelectProps) {
  const { control, projectId, workspaceSlug, handleFormChange } = props;
  const { allowPermissions, isSuperAdmin } = useUserPermissions();
  const isManager = Boolean(
    isSuperAdmin ||
    (workspaceSlug && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, workspaceSlug)) ||
    (projectId && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId))
  );

  return (
    <Controller
      control={control}
      name="type_id"
      render={({ field: { value, onChange } }) => {
        const currentType = value === "other" ? "other" : "operational";
        const typeLabel = currentType === "other" ? "Công việc khác" : "Công việc vận hành";

        return (
          <div className="h-7">
            <CustomMenu
              customButton={
                <span
                  className={cn(
                    "text-xs flex h-7 items-center gap-1.5 rounded-sm border-[0.5px] px-2.5 py-1 font-medium whitespace-nowrap transition-colors select-none",
                    currentType === "other"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    !isManager && "cursor-default"
                  )}
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                  <span className="whitespace-nowrap">{typeLabel}</span>
                  {isManager && <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />}
                </span>
              }
              className="h-full"
              customButtonClassName="h-full flex items-center"
              closeOnSelect
              disabled={!isManager}
            >
              <CustomMenu.MenuItem
                onClick={() => {
                  onChange("operational");
                  handleFormChange();
                }}
                className="text-xs flex items-center gap-2"
              >
                <span className="bg-blue-500 h-2 w-2 flex-shrink-0 rounded-full" />
                <span>Công việc vận hành</span>
              </CustomMenu.MenuItem>
              <CustomMenu.MenuItem
                onClick={() => {
                  if (isManager) {
                    onChange("other");
                    handleFormChange();
                  }
                }}
                disabled={!isManager}
                className={cn("text-xs flex items-center gap-2", !isManager && "cursor-not-allowed opacity-50")}
              >
                <span className="bg-amber-500 h-2 w-2 flex-shrink-0 rounded-full" />
                <span>Công việc khác {!isManager && "(Chỉ quản lý)"}</span>
              </CustomMenu.MenuItem>
            </CustomMenu>
          </div>
        );
      }}
    />
  );
});
