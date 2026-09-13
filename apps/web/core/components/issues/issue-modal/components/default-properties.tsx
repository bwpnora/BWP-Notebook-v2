/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { ETabIndices, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ParentPropertyIcon } from "@plane/propel/icons";
// types
import type { ISearchIssueResponse, TIssue } from "@plane/types";
// ui
import { CustomMenu } from "@plane/ui";
import { getDate, renderFormattedPayloadDate, getTabIndex, cn } from "@plane/utils";
// components
import { CycleDropdown } from "@/components/dropdowns/cycle";
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { ModuleDropdown } from "@/components/dropdowns/module/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { ParentIssuesListModal } from "@/components/issues/parent-issues-list-modal";
import { IssueLabelSelect } from "@/components/issues/select";
import { IssueIdentifier } from "@/components/issues/issue-detail/issue-identifier";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { usePlatformOS } from "@/hooks/use-platform-os";

type TIssueDefaultPropertiesProps = {
  control: Control<TIssue>;
  id: string | undefined;
  projectId: string | null;
  workspaceSlug: string;
  selectedParentIssue: ISearchIssueResponse | null;
  startDate: string | null;
  targetDate: string | null;
  parentId: string | null;
  isDraft: boolean;
  handleFormChange: () => void;
  setSelectedParentIssue: (issue: ISearchIssueResponse) => void;
};

export const IssueDefaultProperties = observer(function IssueDefaultProperties(props: TIssueDefaultPropertiesProps) {
  const {
    control,
    id,
    projectId,
    workspaceSlug,
    selectedParentIssue,
    startDate,
    targetDate,
    parentId,
    isDraft,
    handleFormChange,
    setSelectedParentIssue,
  } = props;
  // states
  const [parentIssueListModalOpen, setParentIssueListModalOpen] = useState(false);
  // store hooks
  const { t } = useTranslation();
  const { areEstimateEnabledByProjectId } = useProjectEstimates();
  const { getProjectById } = useProject();
  const { isMobile } = usePlatformOS();
  const { allowPermissions } = useUserPermissions();
  // derived values
  const projectDetails = getProjectById(projectId);

  const { getIndex } = getTabIndex(ETabIndices.ISSUE_FORM, isMobile);

  const canCreateLabel =
    projectId && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);

  const minDate = getDate(startDate);
  minDate?.setDate(minDate.getDate());

  const maxDate = getDate(targetDate);
  maxDate?.setDate(maxDate.getDate());

  const isManager = Boolean(
    projectId && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* BWP-Notebook-v2 task type selector */}
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
                  <button
                    type="button"
                    className={cn(
                      "text-xs flex h-7 items-center gap-1.5 rounded border px-2.5 font-medium transition-colors",
                      currentType === "other"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{typeLabel}</span>
                  </button>
                }
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
                  <span className="bg-blue-500 h-2 w-2 rounded-full" />
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
                  <span className="bg-amber-500 h-2 w-2 rounded-full" />
                  <span>Công việc khác {!isManager && "(Chỉ quản lý)"}</span>
                </CustomMenu.MenuItem>
              </CustomMenu>
            </div>
          );
        }}
      />
      <Controller
        control={control}
        name="state_id"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <StateDropdown
              value={value}
              onChange={(stateId) => {
                onChange(stateId);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              buttonVariant="border-with-text"
              tabIndex={getIndex("state_id")}
              isForWorkItemCreation={!id}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="priority"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <PriorityDropdown
              value={value}
              onChange={(priority) => {
                onChange(priority);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              tabIndex={getIndex("priority")}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="assignee_ids"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <MemberDropdown
              projectId={projectId ?? undefined}
              value={value}
              onChange={(assigneeIds) => {
                onChange(assigneeIds);
                handleFormChange();
              }}
              buttonVariant={value?.length > 0 ? "transparent-without-text" : "border-with-text"}
              buttonClassName={value?.length > 0 ? "hover:bg-transparent" : ""}
              placeholder={t("assignees")}
              multiple
              tabIndex={getIndex("assignee_ids")}
            />
          </div>
        )}
      />
      {/* BWP-Notebook-v2 supporters multi-select */}
      <Controller
        control={control}
        name="supporter_ids"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <MemberDropdown
              projectId={projectId ?? undefined}
              value={value ?? []}
              onChange={(supporterIds) => {
                onChange(supporterIds);
                handleFormChange();
              }}
              buttonVariant={value && value.length > 0 ? "transparent-without-text" : "border-with-text"}
              buttonClassName={value && value.length > 0 ? "hover:bg-transparent" : ""}
              placeholder="Người hỗ trợ"
              multiple
              tabIndex={getIndex("assignee_ids")}
            />
          </div>
        )}
      />
      {/* BWP-Notebook-v2 room number */}
      <Controller
        control={control}
        name="room"
        render={({ field: { value, onChange } }) => (
          <div className="border-custom-border-200 bg-custom-background-100 text-xs text-custom-text-200 flex h-7 items-center rounded border px-2">
            <span className="text-custom-text-400 mr-1 font-medium">Phòng:</span>
            <input
              type="number"
              value={value ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                onChange(val);
                handleFormChange();
              }}
              placeholder="Số phòng"
              className="text-xs text-custom-text-100 placeholder:text-custom-text-400 w-16 bg-transparent outline-none"
            />
          </div>
        )}
      />
      {/* BWP-Notebook-v2 task notes */}
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange } }) => (
          <div className="border-custom-border-200 bg-custom-background-100 text-xs text-custom-text-200 flex h-7 items-center rounded border px-2">
            <span className="text-custom-text-400 mr-1 font-medium">Ghi chú:</span>
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => {
                onChange(e.target.value || null);
                handleFormChange();
              }}
              placeholder="Ghi chú công việc"
              className="text-xs text-custom-text-100 placeholder:text-custom-text-400 w-32 bg-transparent outline-none"
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="label_ids"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <IssueLabelSelect
              value={value}
              onChange={(labelIds) => {
                onChange(labelIds);
                handleFormChange();
              }}
              projectId={projectId ?? undefined}
              tabIndex={getIndex("label_ids")}
              createLabelEnabled={!!canCreateLabel}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="start_date"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              maxDate={maxDate ?? undefined}
              placeholder={t("start_date")}
              tabIndex={getIndex("start_date")}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="target_date"
        render={({ field: { value, onChange } }) => (
          <div className="h-7">
            <DateDropdown
              value={value}
              onChange={(date) => {
                onChange(date ? renderFormattedPayloadDate(date) : null);
                handleFormChange();
              }}
              buttonVariant="border-with-text"
              minDate={minDate ?? undefined}
              placeholder={t("due_date")}
              tabIndex={getIndex("target_date")}
            />
          </div>
        )}
      />
      {projectDetails?.cycle_view && (
        <Controller
          control={control}
          name="cycle_id"
          render={({ field: { value, onChange } }) => (
            <div className="h-7">
              <CycleDropdown
                projectId={projectId ?? undefined}
                onChange={(cycleId) => {
                  onChange(cycleId);
                  handleFormChange();
                }}
                placeholder={t("cycle.label", { count: 1 })}
                value={value}
                buttonVariant="border-with-text"
                tabIndex={getIndex("cycle_id")}
              />
            </div>
          )}
        />
      )}
      {projectDetails?.module_view && workspaceSlug && (
        <Controller
          control={control}
          name="module_ids"
          render={({ field: { value, onChange } }) => (
            <div className="h-7">
              <ModuleDropdown
                projectId={projectId ?? undefined}
                value={value ?? []}
                onChange={(moduleIds) => {
                  onChange(moduleIds);
                  handleFormChange();
                }}
                placeholder={t("modules")}
                buttonVariant="border-with-text"
                tabIndex={getIndex("module_ids")}
                multiple
                showCount
              />
            </div>
          )}
        />
      )}
      {projectId && areEstimateEnabledByProjectId(projectId) && (
        <Controller
          control={control}
          name="estimate_point"
          render={({ field: { value, onChange } }) => (
            <div className="h-7">
              <EstimateDropdown
                value={value || undefined}
                onChange={(estimatePoint) => {
                  onChange(estimatePoint);
                  handleFormChange();
                }}
                projectId={projectId}
                buttonVariant="border-with-text"
                tabIndex={getIndex("estimate_point")}
                placeholder={t("estimate")}
              />
            </div>
          )}
        />
      )}
      <div className="h-7">
        {parentId ? (
          <CustomMenu
            customButton={
              <button
                type="button"
                className="flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1"
              >
                {selectedParentIssue?.project_id && (
                  <IssueIdentifier
                    projectId={selectedParentIssue.project_id}
                    issueTypeId={selectedParentIssue.type_id}
                    projectIdentifier={selectedParentIssue?.project__identifier}
                    issueSequenceId={selectedParentIssue.sequence_id}
                    size="xs"
                  />
                )}
              </button>
            }
            placement="bottom-start"
            className="h-full w-full"
            customButtonClassName="h-full"
            tabIndex={getIndex("parent_id")}
          >
            <>
              <CustomMenu.MenuItem className="!p-1" onClick={() => setParentIssueListModalOpen(true)}>
                {t("change_parent_issue")}
              </CustomMenu.MenuItem>
              <Controller
                control={control}
                name="parent_id"
                render={({ field: { onChange } }) => (
                  <CustomMenu.MenuItem
                    className="!p-1"
                    onClick={() => {
                      onChange(null);
                      handleFormChange();
                    }}
                  >
                    {t("remove_parent_issue")}
                  </CustomMenu.MenuItem>
                )}
              />
            </>
          </CustomMenu>
        ) : (
          <button
            type="button"
            className="flex h-full cursor-pointer items-center justify-between gap-1 rounded-sm border-[0.5px] border-strong px-2 py-0.5 text-caption-sm-regular hover:bg-layer-1"
            onClick={() => setParentIssueListModalOpen(true)}
          >
            <ParentPropertyIcon className="h-3 w-3 flex-shrink-0" />
            <span className="whitespace-nowrap">{t("add_parent")}</span>
          </button>
        )}
      </div>
      <Controller
        control={control}
        name="parent_id"
        render={({ field: { onChange } }) => (
          <ParentIssuesListModal
            isOpen={parentIssueListModalOpen}
            handleClose={() => setParentIssueListModalOpen(false)}
            onChange={(issue) => {
              onChange(issue.id);
              handleFormChange();
              setSelectedParentIssue(issue);
            }}
            projectId={projectId ?? undefined}
            issueId={isDraft ? undefined : id}
          />
        )}
      />
    </div>
  );
});
