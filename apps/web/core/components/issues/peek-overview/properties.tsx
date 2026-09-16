/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// i18n
import { useTranslation } from "@plane/i18n";
// ui icons
import {
  CycleIcon,
  StatePropertyIcon,
  ModuleIcon,
  MembersPropertyIcon,
  PriorityPropertyIcon,
  StartDatePropertyIcon,
  DueDatePropertyIcon,
  LabelPropertyIcon,
  UserCirclePropertyIcon,
  EstimatePropertyIcon,
  ParentPropertyIcon,
} from "@plane/propel/icons";
import { Hash, FileText, Layers } from "lucide-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { CustomMenu } from "@plane/ui";
import { cn, getDate, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
// components
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
// helpers
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUserPermissions } from "@/hooks/store/user";
// plane web components
import { IssueParentSelectRoot } from "@/components/issues/parent-select-root";
import type { TIssueOperations } from "../issue-detail";
import { IssueCycleSelect } from "../issue-detail/cycle-select";
import { IssueLabel } from "../issue-detail/label";
import { IssueModuleSelect } from "../issue-detail/module-select";

interface IPeekOverviewProperties {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  issueOperations: TIssueOperations;
}

export const PeekOverviewProperties = observer(function PeekOverviewProperties(props: IPeekOverviewProperties) {
  const { workspaceSlug, projectId, issueId, issueOperations, disabled } = props;
  const { t } = useTranslation();
  // store hooks
  const { getProjectById } = useProject();
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const { getStateById } = useProjectState();
  const { getUserDetails } = useMember();
  // derived values
  const issue = getIssueById(issueId);
  if (!issue) return <></>;
  const createdByDetails = getUserDetails(issue?.created_by);
  const projectDetails = getProjectById(issue.project_id);
  const isEstimateEnabled = projectDetails?.estimate;
  const stateDetails = getStateById(issue.state_id);

  const minDate = getDate(issue.start_date);
  minDate?.setDate(minDate.getDate());

  const maxDate = getDate(issue.target_date);
  maxDate?.setDate(maxDate.getDate());

  const { allowPermissions, isSuperAdmin } = useUserPermissions();
  const isManager = Boolean(
    isSuperAdmin ||
    (workspaceSlug && allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, workspaceSlug)) ||
    (workspaceSlug &&
      projectId &&
      allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId))
  );

  const isOther =
    (issue?.type_id === "other" ||
      issue?.type_detail?.external_id === "other" ||
      issue?.type_detail?.name === "Công việc khác") &&
    issue?.type_id !== "operational";

  return (
    <div>
      <h6 className="text-body-xs-medium">{t("common.properties")}</h6>
      <div className={`mt-3 w-full space-y-3 ${disabled ? "opacity-60" : ""}`}>
        {/* BWP-Notebook-v2 Task Type */}
        <SidebarPropertyListItem icon={Layers as any} label="Loại công việc">
          <CustomMenu
            customButton={
              <button
                type="button"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded border px-2 text-body-xs-medium font-medium transition-colors",
                  isOther
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                )}
                disabled={disabled || !isManager}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{isOther ? "Công việc khác" : "Công việc vận hành"}</span>
              </button>
            }
            closeOnSelect
            disabled={disabled || !isManager}
          >
            <CustomMenu.MenuItem
              onClick={() => {
                if (isManager) {
                  issueOperations.update(workspaceSlug, projectId, issueId, {
                    type_id: "operational",
                    type_detail: { id: "operational", name: "Công việc vận hành", external_id: "operational" },
                  });
                }
              }}
              disabled={!isManager}
              className={cn("text-xs flex items-center gap-2", !isManager && "cursor-not-allowed opacity-50")}
            >
              <span className="bg-blue-500 h-2 w-2 rounded-full" />
              <span>Công việc vận hành {!isManager && "(Chỉ quản lý)"}</span>
            </CustomMenu.MenuItem>
            <CustomMenu.MenuItem
              onClick={() => {
                if (isManager) {
                  issueOperations.update(workspaceSlug, projectId, issueId, {
                    type_id: "other",
                    type_detail: { id: "other", name: "Công việc khác", external_id: "other" },
                  });
                }
              }}
              disabled={!isManager}
              className={cn("text-xs flex items-center gap-2", !isManager && "cursor-not-allowed opacity-50")}
            >
              <span className="bg-amber-500 h-2 w-2 rounded-full" />
              <span>Công việc khác {!isManager && "(Chỉ quản lý)"}</span>
            </CustomMenu.MenuItem>
          </CustomMenu>
        </SidebarPropertyListItem>

        <SidebarPropertyListItem icon={StatePropertyIcon} label={t("common.state")}>
          <StateDropdown
            value={issue?.state_id}
            onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { state_id: val })}
            projectId={projectId}
            disabled={disabled}
            buttonVariant="transparent-with-text"
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium ${issue?.state_id ? "" : "text-placeholder"}`}
            dropdownArrow
            dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
          />
        </SidebarPropertyListItem>

        <SidebarPropertyListItem icon={MembersPropertyIcon} label={t("common.assignees")}>
          <MemberDropdown
            value={issue?.assignee_ids ?? undefined}
            onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { assignee_ids: val })}
            disabled={disabled}
            projectId={projectId}
            placeholder={t("issue.add.assignee")}
            multiple
            buttonVariant={issue?.assignee_ids?.length > 1 ? "transparent-without-text" : "transparent-with-text"}
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium justify-between ${issue?.assignee_ids?.length > 0 ? "" : "text-placeholder"}`}
            hideIcon={issue.assignee_ids?.length === 0}
            dropdownArrow
            dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
          />
        </SidebarPropertyListItem>

        {/* BWP-Notebook-v2 Supporters */}
        <SidebarPropertyListItem icon={MembersPropertyIcon} label="Người hỗ trợ">
          <MemberDropdown
            value={issue?.supporter_ids ?? []}
            onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { supporter_ids: val })}
            disabled={disabled}
            projectId={projectId}
            placeholder="Thêm người hỗ trợ"
            multiple
            buttonVariant={
              issue?.supporter_ids && issue.supporter_ids.length > 1
                ? "transparent-without-text"
                : "transparent-with-text"
            }
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium justify-between ${issue?.supporter_ids && issue.supporter_ids.length > 0 ? "" : "text-placeholder"}`}
            hideIcon={!issue?.supporter_ids || issue.supporter_ids.length === 0}
            dropdownArrow
            dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
          />
        </SidebarPropertyListItem>

        {/* BWP-Notebook-v2 Room Number */}
        <SidebarPropertyListItem icon={Hash as any} label="Số phòng">
          <input
            type="number"
            value={issue?.room ?? ""}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null;
              issueOperations.update(workspaceSlug, projectId, issueId, { room: val });
            }}
            placeholder="Chưa có số phòng"
            className="h-7.5 w-full bg-transparent px-2 text-body-xs-medium text-primary outline-none placeholder:text-placeholder"
          />
        </SidebarPropertyListItem>

        {/* BWP-Notebook-v2 Notes */}
        <SidebarPropertyListItem icon={FileText as any} label="Ghi chú">
          <input
            type="text"
            value={issue?.notes ?? ""}
            disabled={disabled}
            onChange={(e) => {
              issueOperations.update(workspaceSlug, projectId, issueId, { notes: e.target.value || null });
            }}
            placeholder="Thêm ghi chú công việc"
            className="h-7.5 w-full truncate bg-transparent px-2 text-body-xs-medium text-primary outline-none placeholder:text-placeholder"
          />
        </SidebarPropertyListItem>

        <SidebarPropertyListItem icon={PriorityPropertyIcon} label={t("common.priority")}>
          <PriorityDropdown
            value={issue?.priority}
            onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { priority: val })}
            disabled={disabled}
            buttonVariant="transparent-with-text"
            className="h-7.5 w-full grow rounded-sm"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium whitespace-nowrap [&_svg]:size-3.5 ${!issue?.priority || issue?.priority === "none" ? "text-placeholder" : ""}`}
          />
        </SidebarPropertyListItem>

        {createdByDetails && (
          <SidebarPropertyListItem
            icon={UserCirclePropertyIcon}
            label={t("common.created_by")}
            childrenClassName="px-2"
          >
            <ButtonAvatars
              showTooltip
              userIds={createdByDetails?.display_name?.includes("-intake") ? null : createdByDetails?.id}
            />
            <span className="grow truncate text-body-xs-medium leading-5 text-secondary">
              {createdByDetails?.display_name?.includes("-intake") ? "Plane" : createdByDetails?.display_name}
            </span>
          </SidebarPropertyListItem>
        )}

        <SidebarPropertyListItem icon={StartDatePropertyIcon} label={t("common.order_by.start_date")}>
          <DateDropdown
            value={issue.start_date}
            onChange={(val) =>
              issueOperations.update(workspaceSlug, projectId, issueId, {
                start_date: val ? renderFormattedPayloadDate(val) : null,
              })
            }
            placeholder={t("issue.add.start_date")}
            buttonVariant="transparent-with-text"
            maxDate={maxDate ?? undefined}
            disabled={disabled}
            className="group w-full grow"
            buttonContainerClassName="w-full text-left h-7.5"
            buttonClassName={`text-body-xs-medium ${issue?.start_date ? "" : "text-placeholder"}`}
            hideIcon
            clearIconClassName="h-3 w-3 hidden group-hover:inline"
          />
        </SidebarPropertyListItem>

        <SidebarPropertyListItem icon={DueDatePropertyIcon} label={t("common.order_by.due_date")}>
          <div className="flex w-full items-center gap-2">
            <DateDropdown
              value={issue.target_date}
              onChange={(val) =>
                issueOperations.update(workspaceSlug, projectId, issueId, {
                  target_date: val ? renderFormattedPayloadDate(val) : null,
                })
              }
              placeholder={t("issue.add.due_date")}
              buttonVariant="transparent-with-text"
              minDate={minDate ?? undefined}
              disabled={disabled}
              className="group w-full grow"
              buttonContainerClassName="w-full text-left h-7.5"
              buttonClassName={cn("text-body-xs-medium", {
                "text-placeholder": !issue.target_date,
                "text-danger-primary": shouldHighlightIssueDueDate(issue.target_date, stateDetails?.group),
              })}
              hideIcon
              clearIconClassName="h-3 w-3 hidden group-hover:inline text-primary"
            />
          </div>
        </SidebarPropertyListItem>

        {isEstimateEnabled && (
          <SidebarPropertyListItem icon={EstimatePropertyIcon} label={t("common.estimate")}>
            <EstimateDropdown
              value={issue.estimate_point ?? undefined}
              onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { estimate_point: val })}
              projectId={projectId}
              disabled={disabled}
              buttonVariant="transparent-with-text"
              className="group w-full grow"
              buttonContainerClassName="w-full text-left h-7.5"
              buttonClassName={`text-body-xs-medium ${issue?.estimate_point !== undefined ? "" : "text-placeholder"}`}
              placeholder="None"
              hideIcon
              dropdownArrow
              dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
            />
          </SidebarPropertyListItem>
        )}

        {projectDetails?.module_view && (
          <SidebarPropertyListItem icon={ModuleIcon} label={t("common.modules")}>
            <IssueModuleSelect
              className="w-full grow"
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              issueOperations={issueOperations}
              disabled={disabled}
            />
          </SidebarPropertyListItem>
        )}

        {projectDetails?.cycle_view && (
          <SidebarPropertyListItem icon={CycleIcon} label={t("common.cycle")} appendElement={null}>
            <IssueCycleSelect
              className="h-7.5 w-full grow"
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              issueId={issueId}
              issueOperations={issueOperations}
              disabled={disabled}
            />
          </SidebarPropertyListItem>
        )}

        <SidebarPropertyListItem icon={ParentPropertyIcon} label={t("common.parent")}>
          <IssueParentSelectRoot
            className="h-7.5 w-full grow"
            disabled={disabled}
            issueId={issueId}
            issueOperations={issueOperations}
            projectId={projectId}
            workspaceSlug={workspaceSlug}
          />
        </SidebarPropertyListItem>

        <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
          <IssueLabel workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} disabled={disabled} />
        </SidebarPropertyListItem>
      </div>
    </div>
  );
});
