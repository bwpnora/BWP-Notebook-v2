# Member Portal Access, Activity Datetime Formatting, and Mobile Header Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Member role full workspace navigation, implement a session-based auto-popup for work item creation, replace relative activity timestamps with full Vietnamese datetimes, and optimize the mobile work item header button layout.

**Architecture:**

1. Activity components use `renderFormattedDate` and `renderFormattedTime` to display localized complete datetime strings (`DD thg MM, YYYY, HH:mm`) instead of relative time calculations.
2. The Member role lock in `layout.tsx`, `projects-app-provider.tsx`, and `command-palette/index.tsx` is removed, allowing members to view standard workspace components. A session-aware component (`MemberAutoCreateTaskModal`) triggers `CreateUpdateIssueModalRoot` once per session for member accounts.
3. In `IssuesHeader`, the mobile view displays a compact `+` icon button with a tooltip to save breadcrumb horizontal space, while desktop retains the full label button.

**Tech Stack:** Next.js / React, MobX, TypeScript, Tailwind CSS, Date-fns, `@plane/ui`, `@plane/utils`, `@plane/i18n`.

**Spec:** [docs/superpowers/specs/2026-10-03-member-portal-activity-datetime-and-mobile-layout-design.md](file:///c:/Code/nora-notebook/docs/superpowers/specs/2026-10-03-member-portal-activity-datetime-and-mobile-layout-design.md)

## Global Constraints

- TypeScript strict mode enabled (`pnpm check:types` must pass with zero errors).
- OxLint rules compliant (`pnpm check:lint`).
- Use `workspace:*` for internal packages, `catalog:` for external packages.
- Ensure Vietnamese locale formatting matches `vi-VN` standards (`DD thg MM, YYYY, HH:mm`).

---

### Task 1: Update Activity and Timeline Datetime Display to Full Vietnamese Datetime Format

**Files:**

- Modify: `apps/web/core/components/issues/issue-detail/issue-activity/activity/actions/helpers/activity-block.tsx:53-61`
- Modify: `apps/web/core/components/common/activity/activity-block.tsx:48-56`
- Modify: `apps/web/core/components/profile/activity/activity-list.tsx:74-77,163-168`
- Modify: `apps/web/core/components/profile/overview/activity.tsx:80-82`
- Modify: `apps/web/core/components/comments/card/display.tsx:129-133`

**Interfaces:**

- Consumes: `renderFormattedDate(date, formatToken?)`, `renderFormattedTime(date, timeFormat?)` from `@plane/utils`
- Produces: Formatted datetime string `${renderFormattedDate(activity.created_at)}, ${renderFormattedTime(activity.created_at)}` in activity blocks.

- [ ] **Step 1: Update issue activity block timestamp**
      In `apps/web/core/components/issues/issue-detail/issue-activity/activity/actions/helpers/activity-block.tsx`:
      Replace:

```tsx
<span className="whitespace-nowrap text-tertiary"> {calculateTimeAgo(activity.created_at)}</span>
```

with:

```tsx
<span className="whitespace-nowrap text-tertiary">
  {renderFormattedDate(activity.created_at)}, {renderFormattedTime(activity.created_at)}
</span>
```

- [ ] **Step 2: Update common activity block timestamp**
      In `apps/web/core/components/common/activity/activity-block.tsx`:
      Replace:

```tsx
<span className="cursor-help font-medium whitespace-nowrap text-tertiary">{calculateTimeAgo(activity.created_at)}</span>
```

with:

```tsx
<span className="cursor-help font-medium whitespace-nowrap text-tertiary">
  {renderFormattedDate(activity.created_at)}, {renderFormattedTime(activity.created_at)}
</span>
```

- [ ] **Step 3: Update profile activity lists & overview**
      In `apps/web/core/components/profile/activity/activity-list.tsx`:
      Import `renderFormattedDate, renderFormattedTime` from `@plane/utils` and replace `calculateTimeAgo(activityItem.created_at)` with:

```tsx
{renderFormattedDate(activityItem.created_at)}, {renderFormattedTime(activityItem.created_at)}
```

In `apps/web/core/components/profile/overview/activity.tsx`:
Import `renderFormattedDate, renderFormattedTime` from `@plane/utils` and replace `calculateTimeAgo(activity.created_at)` with:

```tsx
{renderFormattedDate(activity.created_at)}, {renderFormattedTime(activity.created_at)}
```

- [ ] **Step 4: Update comment timestamp display**
      In `apps/web/core/components/comments/card/display.tsx`:
      Replace:

```tsx
<span className="text-tertiary">
  {calculateTimeAgo(comment.created_at)}
  {comment.edited_at && " (edited)"}
</span>
```

with:

```tsx
<span className="text-tertiary">
  {renderFormattedDate(comment.created_at)}, {renderFormattedTime(comment.created_at)}
  {comment.edited_at && " (edited)"}
</span>
```

- [ ] **Step 5: Verify formatting and lint**
      Run: `pnpm check:lint`
      Run: `pnpm check:types`
      Expected: PASS with 0 errors.

- [ ] **Step 6: Commit Task 1**

```bash
git add apps/web/core/components/issues/issue-detail/issue-activity/activity/actions/helpers/activity-block.tsx apps/web/core/components/common/activity/activity-block.tsx apps/web/core/components/profile/activity/activity-list.tsx apps/web/core/components/profile/overview/activity.tsx apps/web/core/components/comments/card/display.tsx
git commit -m "fix(activity): display full localized datetime instead of relative time"
```

---

### Task 2: Restore Member Workspace Access & Implement Session-based Auto-Popup

**Files:**

- Create: `apps/web/core/components/member-portal/member-auto-create-task-modal.tsx`
- Modify: `apps/web/app/(all)/[workspaceSlug]/layout.tsx`
- Modify: `apps/web/core/components/power-k/projects-app-provider.tsx`
- Modify: `apps/web/core/components/command-palette/index.tsx`

**Interfaces:**

- Consumes: `useMemberRole` from `@/hooks/use-member-role`, `useCommandPalette` from `@/hooks/store/use-command-palette`, `EIssuesStoreType` from `@plane/types`
- Produces: `MemberAutoCreateTaskModal` component auto-opening modal on session start; restored workspace navigation for Member accounts.

- [ ] **Step 1: Create `MemberAutoCreateTaskModal` component**
      Create `apps/web/core/components/member-portal/member-auto-create-task-modal.tsx`:

```tsx
import { useEffect } from "react";
import { observer } from "mobx-react";
import { EIssuesStoreType } from "@plane/types";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useMemberRole } from "@/hooks/use-member-role";

type MemberAutoCreateTaskModalProps = {
  workspaceSlug: string;
};

export const MemberAutoCreateTaskModal = observer(function MemberAutoCreateTaskModal({
  workspaceSlug,
}: MemberAutoCreateTaskModalProps) {
  const { isMemberOnly, isLoading } = useMemberRole(workspaceSlug);
  const { toggleCreateIssueModal, isCreateIssueModalOpen } = useCommandPalette();

  useEffect(() => {
    if (isLoading || !isMemberOnly || !workspaceSlug) return;

    // Check if modal was already triggered in this browser session
    const sessionKey = `member_auto_task_modal_${workspaceSlug}`;
    const hasTriggered = sessionStorage.getItem(sessionKey);

    if (!hasTriggered && !isCreateIssueModalOpen) {
      sessionStorage.setItem(sessionKey, "true");
      const timer = setTimeout(() => {
        toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isMemberOnly, workspaceSlug, toggleCreateIssueModal, isCreateIssueModalOpen]);

  return null;
});
```

- [ ] **Step 2: Update `apps/web/app/(all)/[workspaceSlug]/layout.tsx`**
      In `apps/web/app/(all)/[workspaceSlug]/layout.tsx`:
- Import `MemberAutoCreateTaskModal` from `@/components/member-portal/member-auto-create-task-modal`.
- Remove:

```tsx
if (isMemberOnly) {
  return (
    <>
      <GlobalModals workspaceSlug={workspaceSlug} />
      <CreateTaskPage params={{ workspaceSlug }} />
    </>
  );
}
```

- In the return JSX of `WorkspaceInnerLayout`, include `<MemberAutoCreateTaskModal workspaceSlug={workspaceSlug} />` alongside `<GlobalModals />`.
- Allow all users (including Member accounts) to mount `AppRailVisibilityProvider` and `WorkspaceContentWrapper`.
- Remove the Cmd+K blocking listener for members.

- [ ] **Step 3: Update `ProjectsAppPowerKProvider` & `CommandPalette`**
      In `apps/web/core/components/power-k/projects-app-provider.tsx`:
      Remove:

```tsx
const { isMemberOnly } = useMemberRole(workspaceSlug?.toString());

if (isMemberOnly) {
  return null;
}
```

In `apps/web/core/components/command-palette/index.tsx`:
Remove:

```tsx
const { isMemberOnly } = useMemberRole(workspaceSlug?.toString());

if (isMemberOnly) {
  return null;
}
```

- [ ] **Step 4: Verify typecheck & lint**
      Run: `pnpm check:types`
      Run: `pnpm check:lint`
      Expected: PASS with 0 errors.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/web/core/components/member-portal/member-auto-create-task-modal.tsx apps/web/app/\(all\)/\[workspaceSlug\]/layout.tsx apps/web/core/components/power-k/projects-app-provider.tsx apps/web/core/components/command-palette/index.tsx
git commit -m "feat(member): restore full workspace view and add session-based auto create task popup"
```

---

### Task 3: Refactor Mobile Work Item Header Button in `IssuesHeader`

**Files:**

- Modify: `apps/web/core/components/issues/header.tsx:124-137`

**Interfaces:**

- Consumes: `Plus` from `lucide-react`, `Tooltip` from `@plane/propel/tooltip`, `t("issue.add.label")` from `@plane/i18n`
- Produces: Responsive button rendering compact `+` icon with tooltip on mobile (`sm:hidden`) and full button with text on desktop (`sm:flex`).

- [ ] **Step 1: Import `Plus` icon**
      In `apps/web/core/components/issues/header.tsx`:
      Import `Plus` from `lucide-react`.

- [ ] **Step 2: Update Header.RightItem button markup**
      Replace:

```tsx
{
  canUserCreateIssue && (
    <Button
      variant="primary"
      size="lg"
      onClick={() => {
        toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
      }}
      data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}
    >
      <div className="block sm:hidden">{t("issue.label", { count: 1 })}</div>
      <div className="hidden sm:block">{t("issue.add.label")}</div>
    </Button>
  );
}
```

with:

```tsx
{
  canUserCreateIssue && (
    <>
      <div className="flex sm:hidden">
        <Tooltip isMobile={isMobile} tooltipContent={t("issue.add.label")}>
          <Button
            variant="primary"
            size="sm"
            className="flex h-8 w-8 items-center justify-center p-0 shrink-0"
            onClick={() => {
              toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
            }}
            data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
      <div className="hidden sm:flex">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
          }}
          data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}
          className="flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{t("issue.add.label")}</span>
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify typecheck & lint**
      Run: `pnpm check:types`
      Run: `pnpm check:lint`
      Expected: PASS with 0 errors.

- [ ] **Step 4: Commit Task 3**

```bash
git add apps/web/core/components/issues/header.tsx
git commit -m "fix(issues): optimize mobile work item header button layout with compact icon and tooltip"
```

---

### Task 4: Client Bundle Recompilation & Production Deployment Sync

**Files:**

- Build output in `custom_frontend/build/client`

- [ ] **Step 1: Build apps/web client bundle**
      Run: `pnpm turbo run build --filter=web`
      Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Sync build files to custom_frontend/build/client if required**
      Verify build artifacts sync as established in repo workflow.

- [ ] **Step 3: Commit Task 4**

```bash
git add .
git commit -m "build(deploy): compile and sync custom_frontend bundle with member portal and layout fixes"
```
