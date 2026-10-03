# Design Document: Member Portal Access, Activity Datetime Formatting, and Mobile Header Layout

**Date**: 2026-10-03  
**Status**: Approved  
**Scope**: `apps/web`, `packages/utils`, `packages/ui`

---

## 1. Overview & Objectives

This document details the architecture and implementation design for three related UX/UI and workflow enhancements in BWP Notebook:

1. **Activity Datetime Formatting**: Replace relative timestamps (e.g. "khoảng 16 giờ trước", "1 phút trước") across all activity and audit logs with complete, localized Vietnamese datetime strings (`DD thg MM, YYYY, HH:mm`, e.g. `02 thg 10, 2026, 16:47`).
2. **Member Role Access Restoration & Session-Based Auto-Popup**:
   - Revert the strict member lock that previously isolated Member accounts into a single standalone `/create-task` screen.
   - Restore Member accounts' view access to the complete workspace interface (projects, boards, lists, navigation sidebar, command palette).
   - Implement a session-based auto-popup mechanism: when a Member logs in or opens the workspace in a new browser session, automatically trigger the work item creation modal (`CreateUpdateIssueModalRoot`, which already has member-specific operational restrictions configured). Once dismissed or completed, the member remains in the workspace and browses normally.
3. **Mobile Header Work Item Button**:
   - On mobile screens (`sm:hidden`), replace the truncated/awkward lowercase text button `"công việc"` next to `"Công việc 207"` with a clean, compact plus icon button (`+`) wrapped in a tooltip (`"Thêm công việc"`).
   - On desktop screens (`sm:` and above), retain the full action button with `"Thêm công việc"`.
   - Prevent header layout squeezing between breadcrumbs and action buttons.

---

## 2. Requirements & Acceptance Criteria

### 2.1. Activity Datetime Formatting

- **AC 1.1**: In issue details activity timeline (`activity-block.tsx`), the timestamp must directly display the full date and time: `${renderFormattedDate(activity.created_at)}, ${renderFormattedTime(activity.created_at)}` (e.g., `02 thg 10, 2026, 16:47`).
- **AC 1.2**: In general activity widgets (`common/activity/activity-block.tsx`), profile activity lists (`profile/activity/activity-list.tsx`), and profile overview (`profile/overview/activity.tsx`), relative time strings (`calculateTimeAgo`) must be replaced by the complete localized date and time.
- **AC 1.3**: The tooltip hovering over the timestamp can remain or display the exact ISO/full timestamp without conflicting.

### 2.2. Member Role Access Restoration & Session Auto-Popup

- **AC 2.1**: Members must no longer be locked or redirected to `/[workspaceSlug]/create-task`.
- **AC 2.2**: In `apps/web/app/(all)/[workspaceSlug]/layout.tsx`, member accounts must mount `WorkspaceContentWrapper`, `AppRailVisibilityProvider`, and `<Outlet />`, giving them full standard workspace navigation.
- **AC 2.3**: In `apps/web/core/components/power-k/projects-app-provider.tsx` and `command-palette/index.tsx`, member suppression must be lifted so that essential modals (`WorkItemLevelModals`) and search palette are properly mounted.
- **AC 2.4**: Upon loading the workspace for a Member account (`isMemberOnly === true`):
  - Check `sessionStorage.getItem(`member*auto_create_task_triggered*${workspaceSlug}`)`.
  - If not set, mark `sessionStorage.setItem(...)` and trigger `toggleCreateIssueModal(true, EIssuesStoreType.PROJECT)`.
  - Closing or submitting the modal leaves the user in the active workspace view without reopening until a new session starts.

### 2.3. Mobile Header Work Item Button

- **AC 3.1**: In `apps/web/core/components/issues/header.tsx`, the mobile view (`sm:hidden`) must render an icon button featuring a plus icon (`+` / `PlusIcon`) with `size="sm"` or `size="md"`, styled consistently with primary buttons.
- **AC 3.2**: A tooltip containing `"Thêm công việc"` (from `t("issue.add.label")`) must be attached to the mobile icon button.
- **AC 3.3**: The desktop view (`hidden sm:flex`) must display the full button with text `"Thêm công việc"`.
- **AC 3.4**: `Header.RightItem` must maintain `shrink-0` to avoid being compressed by long breadcrumbs on small viewport widths.

---

## 3. Technical Architecture & Component Changes

### 3.1. Datetime Formatting

- **File**: `apps/web/core/components/issues/issue-detail/issue-activity/activity/actions/helpers/activity-block.tsx`
  - Replace `<span className="whitespace-nowrap text-tertiary"> {calculateTimeAgo(activity.created_at)}</span>` with:
    ```tsx
    <span className="whitespace-nowrap text-tertiary">
      {renderFormattedDate(activity.created_at)}, {renderFormattedTime(activity.created_at)}
    </span>
    ```
- **File**: `apps/web/core/components/common/activity/activity-block.tsx`
  - Replace `calculateTimeAgo(activity.created_at)` with:
    ```tsx
    {renderFormattedDate(activity.created_at)}, {renderFormattedTime(activity.created_at)}
    ```
- **File**: `apps/web/core/components/profile/activity/activity-list.tsx` and `profile/overview/activity.tsx`
  - Replace relative calculation with `${renderFormattedDate(item.created_at)}, ${renderFormattedTime(item.created_at)}`.

### 3.2. Member Access & Session-Based Auto-Popup

- **File**: `apps/web/app/(all)/[workspaceSlug]/layout.tsx`
  - Remove the member interceptor that returned `<CreateTaskPage params={{ workspaceSlug }} />`.
  - Render the standard `AppRailVisibilityProvider` and `WorkspaceContentWrapper` for all authenticated workspace roles.
  - Mount a lightweight observer component/hook `MemberAutoCreateTaskModal`:

    ```tsx
    const MemberAutoCreateTaskModal = observer(function MemberAutoCreateTaskModal({
      workspaceSlug,
    }: {
      workspaceSlug: string;
    }) {
      const { isMemberOnly, isLoading } = useMemberRole(workspaceSlug);
      const { toggleCreateIssueModal, isCreateIssueModalOpen } = useCommandPalette();

      useEffect(() => {
        if (isLoading || !isMemberOnly || !workspaceSlug) return;
        const sessionKey = `member_auto_task_modal_${workspaceSlug}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, "true");
          // Slight timeout to ensure store hydration and modals are mounted
          const timer = setTimeout(() => {
            toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
          }, 350);
          return () => clearTimeout(timer);
        }
      }, [isLoading, isMemberOnly, workspaceSlug, toggleCreateIssueModal]);

      return null;
    });
    ```

- **File**: `apps/web/core/components/power-k/projects-app-provider.tsx`
  - Remove `if (isMemberOnly) return null;` so `WorkItemLevelModals` and `ProjectLevelModals` are available to render the work item creation modal for members.
- **File**: `apps/web/core/components/command-palette/index.tsx`
  - Remove member blocking to allow standard keyboard shortcuts and search palette.

### 3.3. Mobile Header Button

- **File**: `apps/web/core/components/issues/header.tsx`
  - Update `Header.RightItem` creation button:

    ```tsx
    {
      canUserCreateIssue && (
        <>
          {/* Mobile View: Compact Icon Button with Tooltip */}
          <div className="flex sm:hidden">
            <Tooltip isMobile={isMobile} tooltipContent={t("issue.add.label")}>
              <Button
                variant="primary"
                size="sm"
                className="flex h-8 w-8 items-center justify-center p-0 shrink-0"
                onClick={() => toggleCreateIssueModal(true, EIssuesStoreType.PROJECT)}
                data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>

          {/* Desktop View: Full Button with Icon & Text */}
          <div className="hidden sm:flex">
            <Button
              variant="primary"
              size="lg"
              onClick={() => toggleCreateIssueModal(true, EIssuesStoreType.PROJECT)}
              data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{t("issue.add.label")}</span>
            </Button>
          </div>
        </>
      );
    }
    ```

---

## 4. Verification & Testing Plan

1. **Activity Datetime Verification**:
   - Navigate to any work item detail page (`/projects/[projectId]/issues/[issueId]`).
   - Confirm activity logs show format e.g. `02 thg 10, 2026, 16:47` directly instead of "khoảng 16 giờ trước" or "1 phút trước".
2. **Member Account Access & Auto-Popup Verification**:
   - Log in with or switch to a Member role user.
   - Navigate to `/[workspaceSlug]`.
   - Verify the creation modal automatically opens once.
   - Close the modal; verify the member has full visibility of projects, lists, and sidebar.
   - Refresh the page or navigate between projects; verify the modal does not aggressively re-pop up in the same session.
   - Open in an incognito / new session tab; verify the popup opens on first arrival.
3. **Mobile Layout Verification**:
   - Resize viewport to mobile screen (< 640px).
   - Check `IssuesHeader`: verify the breadcrumb and count chip have ample room, and the right side renders a clean `+` button.
   - Tap the `+` button; verify it opens the create work item modal properly.
4. **Build & Typecheck**:
   - Run `pnpm check:types` and `pnpm check:lint` to ensure strict compilation.
