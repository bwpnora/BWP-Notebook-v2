# Member Accounts Task Creation Portal & RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict Member accounts (`role = 15`) strictly to creating operational tasks within their assigned department(s) via a dedicated, distraction-free portal (`/[workspaceSlug]/create-task`), preventing them from viewing, listing, editing, or deleting tasks, while retaining 100% full privileges for Admins and SuperAdmins.

**Architecture:** Implement defense-in-depth security: Backend RBAC blocks `GET` (list/retrieve), `PUT`, `PATCH`, and `DELETE` on issue endpoints for Member accounts (returning 403 Forbidden) while permitting `POST` in assigned departments with `task_type = 'operational'`; Frontend route guards intercept Member navigation to any standard view and redirect to `/[workspaceSlug]/create-task`; A streamlined, standalone page is rendered without sidebar navigation, providing a focused form with BWP custom fields (Room, Supporters), toast feedback without view links, and instant form reset.

**Tech Stack:** Next.js (App Router), React, TypeScript, MobX, Tailwind CSS, Django, Django REST Framework, pytest.

**Spec:** `docs/superpowers/specs/2026-09-15-member-task-creation-portal-design.md`

## Global Constraints

- Backend permission checks must strictly check `role == 15` (Member) versus `role >= 20` (Admin) or `is_super_admin(user)`.
- Backend must reject unassigned department task creation with 403 Forbidden.
- Members creating tasks must have `task_type` forced to `operational`.
- Frontend dedicated task page route must be `/[workspaceSlug]/create-task`.
- Member success toast must NOT contain any link or action button to view the task.
- Admin and SuperAdmin users must retain all existing capabilities, navigation, and permissions.
- Code style: TypeScript strict mode, OxLint, camelCase/PascalCase conventions.

---

### Task 1: Backend RBAC Enforcement for Member Role on Issue Endpoints

**Files:**

- Create: `apps/api/plane/tests/unit/test_member_permissions.py`
- Modify: `apps/api/plane/app/views/issue/base.py`
- Modify: `apps/api/plane/app/permissions/project.py`

**Interfaces:**

- Consumes: `ProjectMember.role`, `ROLE.MEMBER`, `ROLE.ADMIN`, `is_super_admin`, `check_is_admin_or_manager`
- Produces: Strict 403 response for `role == 15` on `GET /issues/`, `GET /issues/{id}/`, `PUT/PATCH/DELETE /issues/{id}/`

- [ ] **Step 1: Write the failing unit tests for member permissions**

Create `apps/api/plane/tests/unit/test_member_permissions.py`:

```python
import pytest
from rest_framework import status
from django.test import Client
from plane.db.models import User, Workspace, WorkspaceMember, Project, ProjectMember, Issue, IssueType

@pytest.mark.django_db
def test_member_cannot_list_issues(client: Client):
    user = User.objects.create(email="member@example.com", username="member")
    workspace = Workspace.objects.create(name="WS", slug="ws-test")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)

    client.force_login(user)
    response = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "error" in response.json()

@pytest.mark.django_db
def test_member_cannot_retrieve_issue_detail(client: Client):
    user = User.objects.create(email="member2@example.com", username="member2")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-2")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT2", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)
    issue = Issue.objects.create(name="Secret Task", project=project, workspace=workspace)

    client.force_login(user)
    response = client.get(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/{issue.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_member_can_create_issue_in_assigned_project(client: Client):
    user = User.objects.create(email="member3@example.com", username="member3")
    workspace = Workspace.objects.create(name="WS", slug="ws-test-3")
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=15)
    project = Project.objects.create(name="Dept", identifier="DEPT3", workspace=workspace)
    ProjectMember.objects.create(project=project, member=user, workspace=workspace, role=15)

    client.force_login(user)
    payload = {"name": "New Task from Member", "priority": "medium"}
    response = client.post(f"/api/workspaces/{workspace.slug}/projects/{project.id}/issues/", data=payload, content_type="application/json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["name"] == "New Task from Member"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest apps/api/plane/tests/unit/test_member_permissions.py`
Expected: FAIL (returns 200 instead of 403 on GET)

- [ ] **Step 3: Implement RBAC restriction in IssueViewSet**

Modify `apps/api/plane/app/views/issue/base.py`:
In `IssueViewSet`:

```python
    def list(self, request, slug, project_id):
        # Enforce brief-v6: Members are not allowed to view or list tasks
        if not check_is_admin_or_manager(request.user, Project.objects.get(pk=project_id, workspace__slug=slug)):
            return Response(
                {"error": "You do not have permission to view or modify tasks. Members can only submit new tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, slug, project_id)

    def retrieve(self, request, slug, project_id, pk=None):
        # Enforce brief-v6: Members are not allowed to view issue details
        if not check_is_admin_or_manager(request.user, Project.objects.get(pk=project_id, workspace__slug=slug)):
            return Response(
                {"error": "You do not have permission to view or modify tasks. Members can only submit new tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().retrieve(request, slug, project_id, pk=pk)

    def update(self, request, slug, project_id, pk=None):
        if not check_is_admin_or_manager(request.user, Project.objects.get(pk=project_id, workspace__slug=slug)):
            return Response(
                {"error": "You do not have permission to view or modify tasks. Members can only submit new tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, slug, project_id, pk=pk)

    def partial_update(self, request, slug, project_id, pk=None):
        if not check_is_admin_or_manager(request.user, Project.objects.get(pk=project_id, workspace__slug=slug)):
            return Response(
                {"error": "You do not have permission to view or modify tasks. Members can only submit new tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, slug, project_id, pk=pk)

    def destroy(self, request, slug, project_id, pk=None):
        if not check_is_admin_or_manager(request.user, Project.objects.get(pk=project_id, workspace__slug=slug)):
            return Response(
                {"error": "You do not have permission to view or modify tasks. Members can only submit new tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, slug, project_id, pk=pk)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest apps/api/plane/tests/unit/test_member_permissions.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/plane/app/views/issue/base.py apps/api/plane/tests/unit/test_member_permissions.py
git commit -m "feat(api): restrict issue viewing and updating for member role"
```

---

### Task 2: Frontend Route Guard & Shortcut Interceptor

**Files:**

- Create: `apps/web/core/hooks/use-member-role.ts`
- Modify: `apps/web/app/(all)/[workspaceSlug]/layout.tsx`
- Modify: `apps/web/core/components/command-palette/index.tsx` (or command palette wrapper)

**Interfaces:**

- Consumes: `useUser`, `useWorkspace`, `currentWorkspaceRole` from store
- Produces: `isMemberOnly: boolean`, automatic redirect to `/[workspaceSlug]/create-task` when trying to access other routes

- [ ] **Step 1: Create `useMemberRole` hook**

Create `apps/web/core/hooks/use-member-role.ts`:

```typescript
import { useMemo } from "react";
import { useUserPermissions, useUser } from "@/hooks/store";

export const useMemberRole = (workspaceSlug?: string) => {
  const { data: currentUser } = useUser();
  const { isSuperAdmin, isOwner, isAdmin } = useUserPermissions();

  const isMemberOnly = useMemo(() => {
    if (!currentUser) return false;
    if (isSuperAdmin || isOwner || isAdmin) return false;
    return true;
  }, [currentUser, isSuperAdmin, isOwner, isAdmin]);

  return {
    isMemberOnly,
    isAdminOrAbove: !isMemberOnly,
  };
};
```

- [ ] **Step 2: Add route guard in workspace layout**

Modify `apps/web/app/(all)/[workspaceSlug]/layout.tsx`:

```typescript
// Add check: if isMemberOnly and current path is not /[workspaceSlug]/create-task, redirect:
import { usePathname, useRouter } from "next/navigation";
import { useMemberRole } from "@/hooks/use-member-role";

// Inside workspace layout component:
const pathname = usePathname();
const router = useRouter();
const { isMemberOnly } = useMemberRole(workspaceSlug);

useEffect(() => {
  if (isMemberOnly && !pathname.includes("/create-task")) {
    router.replace(`/${workspaceSlug}/create-task`);
  }
}, [isMemberOnly, pathname, workspaceSlug, router]);
```

- [ ] **Step 3: Suppress command palette and global search shortcuts for members**

Ensure Command Palette (`Cmd+K`) does not mount or trigger when `isMemberOnly` is true.

- [ ] **Step 4: Verify type checking**

Run: `pnpm check:types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/core/hooks/use-member-role.ts apps/web/app/\(all\)/\[workspaceSlug\]/layout.tsx
git commit -m "feat(web): add member route guard and redirect to create-task"
```

---

### Task 3: Dedicated Member Portal Header & Shell

**Files:**

- Create: `apps/web/core/components/member-portal/member-portal-header.tsx`
- Create: `apps/web/core/components/member-portal/index.ts`

**Interfaces:**

- Consumes: Workspace information, current user info, logout action
- Produces: Header bar with workspace brand, user avatar, name, language switcher, logout button, and back link for admins

- [ ] **Step 1: Implement `MemberPortalHeader`**

Create `apps/web/core/components/member-portal/member-portal-header.tsx`:

```tsx
import React from "react";
import Link from "next/link";
import { useUser, useWorkspace } from "@/hooks/store";
import { useMemberRole } from "@/hooks/use-member-role";

type Props = {
  workspaceSlug: string;
};

export const MemberPortalHeader: React.FC<Props> = ({ workspaceSlug }) => {
  const { data: currentUser, signOut } = useUser();
  const { currentWorkspace } = useWorkspace();
  const { isMemberOnly } = useMemberRole(workspaceSlug);

  return (
    <header className="w-full border-b border-custom-border-200 bg-custom-background-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-custom-text-100">{currentWorkspace?.name || "BWP Notebook"}</h1>
        {!isMemberOnly && (
          <Link
            href={`/${workspaceSlug}/`}
            className="text-sm text-custom-primary-100 hover:underline flex items-center gap-1"
          >
            ← Quay lại Bảng điều khiển
          </Link>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-custom-text-200">
          <span>{currentUser?.display_name || currentUser?.first_name || currentUser?.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="text-xs px-3 py-1.5 rounded bg-custom-background-80 text-custom-text-300 hover:text-custom-text-100 border border-custom-border-200"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};
```

Create `apps/web/core/components/member-portal/index.ts`:

```typescript
export * from "./member-portal-header";
export * from "./member-task-form";
```

- [ ] **Step 2: Verify component formatting and types**

Run: `pnpm check:types`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/core/components/member-portal/
git commit -m "feat(web): add member portal header component"
```

---

### Task 4: Dedicated Task Creation Form & Dedicated Page Route

**Files:**

- Create: `apps/web/core/components/member-portal/member-task-form.tsx`
- Create: `apps/web/app/(all)/[workspaceSlug]/create-task/page.tsx`

**Interfaces:**

- Consumes: Project members, workspace projects list, issue create service
- Produces: Full task submission form with department selector, room, supporters, priority, attachments, and clean toast feedback

- [ ] **Step 1: Implement `MemberTaskForm` component**

Create `apps/web/core/components/member-portal/member-task-form.tsx`:

- Department selection: auto-selected if member belongs to only 1 department; dropdown if multiple.
- Required Title input.
- Room (number) input.
- Description rich text editor.
- Assignees & Supporters multi-select.
- Priority selector.
- File attachment dropzone.
- On submit: calls project issue creation API with `task_type: "operational"`.
- On success:
  - Calls `setToast({ title: "Công việc đã được tạo thành công", type: TOAST_TYPE.SUCCESS })` without view action.
  - Resets form state (title, description, room, assignees, supporters, attachments).
  - Retains selected department for subsequent submissions.

- [ ] **Step 2: Implement page route `/[workspaceSlug]/create-task/page.tsx`**

Create `apps/web/app/(all)/[workspaceSlug]/create-task/page.tsx`:

```tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MemberPortalHeader } from "@/components/member-portal/member-portal-header";
import { MemberTaskForm } from "@/components/member-portal/member-task-form";

export default function CreateTaskPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  return (
    <div className="min-h-screen bg-custom-background-90 flex flex-col">
      <MemberPortalHeader workspaceSlug={workspaceSlug} />
      <main className="flex-1 max-w-3xl w-full mx-auto py-8 px-4 sm:px-6">
        <div className="bg-custom-background-100 border border-custom-border-200 rounded-lg p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-custom-text-100">Tạo công việc mới</h2>
            <p className="text-sm text-custom-text-300 mt-1">
              Nhập thông tin công việc cần giao hoặc yêu cầu vận hành cho phòng ban của bạn.
            </p>
          </div>
          <MemberTaskForm workspaceSlug={workspaceSlug} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run checks (lint, types)**

Run: `pnpm check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/member-portal/member-task-form.tsx apps/web/app/\(all\)/\[workspaceSlug\]/create-task/page.tsx
git commit -m "feat(web): add member task creation page and form"
```

---

### Task 5: Full End-to-End Integration Verification

**Files:**

- Verify: Full stack automated tests and manual flow testing

- [ ] **Step 1: Run backend test suite**

Run: `docker compose -f docker-compose-test.yml run --rm api-tests pytest -m unit`
Expected: All tests PASS

- [ ] **Step 2: Run frontend checks**

Run: `pnpm check`
Expected: Format, lint, and types pass cleanly.

- [ ] **Step 3: Verify Member workflow manually**
- Log in as Member:
  - Directed immediately to `/[workspaceSlug]/create-task`.
  - Sidebar is absent.
  - Fill Title, Room, Supporters, Description.
  - Click submit -> success toast appears with no view link, form resets, department remains selected.
  - Attempt manual URL navigation to `/projects` -> redirected back to `/create-task`.
- Log in as Admin:
  - Sidebar and project views fully accessible.
  - New task visible on the spreadsheet with Room, Supporters, and `operational` type.
  - Admin can view, edit, convert, and delete task without issue.

- [ ] **Step 4: Final commit and cleanup**

```bash
git commit --allow-empty -m "chore(release): complete member task creation portal and RBAC implementation"
```
