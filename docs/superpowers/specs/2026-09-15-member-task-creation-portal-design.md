# Member Accounts Task Creation Portal & RBAC Design Specification

- **Date:** 2026-09-15
- **Status:** Approved
- **Reference:** `brief/brief-v6.txt`, `MAPPING.md`, `brief-v5.txt`

---

## 1. Overview

This document specifies the architecture and implementation design for restricting **Member accounts** in **BWP-Notebook-v2** to a single, dedicated function: **creating tasks within their assigned department(s)**.

Members are strictly prohibited from viewing, editing, deleting, or browsing tasks and workspaces. A dedicated, distraction-free page is provided for members to create tasks. **Admin and SuperAdmin** accounts remain unaffected and retain full system privileges.

---

## 2. Core Requirements

1. **Role-Based Limitation:**
   - Member accounts (`role = 15`) can **only** add/create new tasks within their assigned department(s) (Project).
   - Member accounts **cannot** view, list, edit, delete, or perform any other actions on tasks, cycles, modules, or settings.
2. **Dedicated Creation Page:**
   - A dedicated page `/[workspaceSlug]/create-task` exclusively for task submission.
   - Minimalist layout without standard sidebars, navigation trees, or issue boards.
3. **Admin Exemption:**
   - Admin (`role >= 20`) and SuperAdmin accounts remain completely unchanged, with full access to all workspace, project, and issue capabilities.

---

## 3. Architecture & Security (Defense-in-Depth)

### 3.1 Backend RBAC & API Enforcement

Backend enforcement prevents any client-side tampering or direct API exploitation:

1. **Issue Endpoints (`IssueViewSet` / `IssueDetailViewSet`):**
   - `POST /api/workspaces/{slug}/projects/{project_id}/issues/`:
     - **Allowed** if the authenticated user is an active member of the target `project_id`.
     - Automatically enforces `task_type = 'operational'` as required by BWP business rules.
   - `GET /api/workspaces/{slug}/projects/{project_id}/issues/` (list):
     - Returns `403 Forbidden` for users with `role == 15` (`Member`).
   - `GET /api/workspaces/{slug}/projects/{project_id}/issues/{id}/` (retrieve):
     - Returns `403 Forbidden` for users with `role == 15` (`Member`).
   - `PUT / PATCH / DELETE /api/workspaces/{slug}/projects/{project_id}/issues/{id}/`:
     - Returns `403 Forbidden` for users with `role == 15` (`Member`).
   - Standard error response:
     ```json
     {
       "error": "You do not have permission to view or modify tasks. Members can only submit new tasks."
     }
     ```

2. **Metadata Access for Form Population:**
   - Members are granted read access to the minimal required metadata of their assigned department(s):
     - Project details (name, id, identifier).
     - Active project members (for populating Assignees and Supporters dropdowns).
     - Default project state and task types.
   - Unassigned projects remain strictly inaccessible.

3. **Admin and SuperAdmin Access:**
   - Unrestricted access across all HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

---

### 3.2 Frontend Routing & Route Guards

1. **Dedicated Route:**
   - Route path: `apps/web/app/(all)/[workspaceSlug]/create-task/page.tsx`
2. **Route Guarding:**
   - In `apps/web/app/(all)/[workspaceSlug]/layout.tsx` (and project sub-layouts):
     - When the current user has `role === 15` (Member):
       - If navigating to any route other than `/[workspaceSlug]/create-task` (e.g. `/projects/*`, `/settings/*`, `/analytics/*`), immediately redirect to `/[workspaceSlug]/create-task`.
     - When an Admin or SuperAdmin visits `/[workspaceSlug]/create-task`:
       - Allow viewing, with a _"← Back to Workspace"_ breadcrumb link in the header.
3. **Shortcut & Global Search Suppression:**
   - Disable global Command Palette (`Cmd/Ctrl + K`) and quick-search shortcuts for Member accounts to prevent previewing or searching tasks.

---

## 4. UI/UX & Page Layout

### 4.1 Page Layout (`/[workspaceSlug]/create-task`)

- **Top Header:**
  - Workspace logo and name on the left.
  - User profile menu on the right: User avatar, full name, language switcher, and **Log out** button.
  - (For Admins): Navigation link back to the workspace spreadsheet/board.
- **Main Container:**
  - Clean, centered card container (`max-w-3xl`) without sidebar.
  - Heading: **"Tạo công việc mới"** (Create New Task).

### 4.2 Form Fields

| Field                           | Type             | Behavior / Rules                                                                                                                           |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phòng ban (Department)**      | Select / Badge   | Auto-selected and locked if member belongs to only 1 department. Dropdown listing only assigned departments if member belongs to multiple. |
| **Tiêu đề (Title)**             | Input (Text)     | Required. Placeholder: _"Nhập tên công việc..."_.                                                                                          |
| **Số phòng (Room)**             | Input (Number)   | Optional integer field for room number.                                                                                                    |
| **Mô tả (Description)**         | Rich Text Editor | Formatting tools, list items, image pasting/uploads.                                                                                       |
| **Người phụ trách (Assignees)** | Multi-select     | Populated from active members of the selected department.                                                                                  |
| **Người hỗ trợ (Supporters)**   | Multi-select     | Populated from active members of the selected department.                                                                                  |
| **Độ ưu tiên (Priority)**       | Select           | Urgent, High, Medium, Low, None. Default: None.                                                                                            |
| **Tệp đính kèm (Attachments)**  | File Upload      | Supports image and document attachments.                                                                                                   |
| **Loại công việc (Task Type)**  | Hidden / Locked  | Automatically sent as `operational` in payload.                                                                                            |

---

## 5. Submission Data Flow & Feedback

1. **Submission:**
   - Member fills in required fields and clicks **"Tạo công việc"** (Submit Task).
   - Form dispatches payload to `POST /api/workspaces/{slug}/projects/{project_id}/issues/`.
2. **Success Feedback:**
   - Displays success toast: _"Công việc đã được tạo thành công"_.
   - **Crucial:** Toast action buttons to view or navigate to the created issue are completely omitted.
   - **Form Reset:** Clears Title, Description, Room, Attachments, Assignees, and Supporters.
   - **Department Retention:** The selected department remains chosen so the user can immediately submit another task.
3. **Error Handling:**
   - Field-level validation errors (e.g. missing title) highlight directly under the input.
   - Network or server errors display a dismissible error toast.

---

## 6. Verification & Testing Strategy

### 6.1 Automated Tests (Backend)

- `tests/unit/test_member_permissions.py`:
  - Verify Member (`role=15`) cannot perform `GET /issues/` (returns 403).
  - Verify Member cannot perform `GET /issues/<id>/` (returns 403).
  - Verify Member cannot perform `PATCH` or `DELETE /issues/<id>/` (returns 403).
  - Verify Member can perform `POST /issues/` in assigned project (returns 201).
  - Verify Member cannot perform `POST /issues/` in unassigned project (returns 403).
  - Verify Admin (`role=20`) and SuperAdmin can perform all operations (`GET`, `POST`, `PATCH`, `DELETE`).

### 6.2 Manual Verification

- Log in as Member:
  - Verify auto-redirect to `/[workspaceSlug]/create-task`.
  - Verify sidebar is absent.
  - Submit a new task with Room number and Supporters.
  - Verify success toast appears with no view link, form resets cleanly, and department remains selected.
  - Attempt entering direct URLs (`/projects/...`, `/settings/...`) -> confirms redirection back to `/create-task`.
- Log in as Admin:
  - Verify complete navigation, sidebar, and full project access.
  - Verify newly submitted task appears on the spreadsheet view with correct room, supporters, and `operational` type.
  - Verify Admin can view, edit, and delete the task without error.
