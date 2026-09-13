# Kế Hoạch Triển Khai Hệ Thống Tạo Tài Khoản Tự Động & Phân Quyền RBAC (Automated Account Creation & RBAC Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hệ thống khởi tạo tài khoản quản trị tự động (auto-generate username & password, email tùy chọn), xác thực đăng nhập kép (Username/Email), rào chắn quản trị tối cao Super Admin / God Mode cho việc tạo đơn vị/phòng ban/chỉ định Trưởng bộ phận, và cô lập triệt để thẩm quyền quản trị theo phòng ban.

**Architecture:** Mở rộng backend Django REST Framework với endpoint tạo tài khoản trực tiếp `direct-create/`, nâng cấp middleware xác thực cho phép nhận diện Username hoặc Email, xây dựng tiện ích kiểm tra quyền Super Admin tập trung `is_super_admin(user)` để bảo vệ cấu trúc tổ chức, và tích hợp các modal React UI tại Cài đặt đơn vị / Cài đặt phòng ban kèm tính năng sao chép thông tin tài khoản một chạm.

**Tech Stack:** Python 3.13, Django 4.2+, Django REST Framework, React 19, TypeScript 5+, MobX, Tailwind CSS, Vite.

**Spec:** [`docs/superpowers/specs/2026-09-13-automated-account-creation-and-rbac-design.md`](file:///c:/Code/nora-notebook/docs/superpowers/specs/2026-09-13-automated-account-creation-and-rbac-design.md)

## Global Constraints

- RBAC Tier 1 (Super Admin): Duy nhất có quyền tạo Workspace, tạo Project, và thay đổi `project_lead`.
- RBAC Tier 2 (Unit Admin): Có quyền tạo user cấp Đơn vị với auto-credentials, quản lý thành viên đơn vị, không thể tạo Project mới hay đổi `project_lead`.
- RBAC Tier 3 (Department Admin): Chỉ có quyền thêm thành viên hoặc auto-create user gắn vào ĐÚNG phòng ban mình quản lý (`project_id`). Bị chặn 403 tuyệt đối khi can thiệp phòng ban khác.
- Email là trường tùy chọn (`email = None` nếu để trống), username là chuỗi thường và số (`^[a-z0-9_]{3,30}$`).
- Không tạo shadow dummy email làm ô nhiễm cơ sở dữ liệu.
- Giữ vững quy chuẩn mã nguồn: Strict TypeScript typing, OxLint không lỗi, Pytest passing.

---

### Task 1: Tiện Ích Phân Quyền Super Admin & Rào Chắn Tổ Chức (Super Admin Guards)

**Files:**

- Modify: `apps/api/plane/app/permissions/base.py`
- Modify: `apps/api/plane/app/permissions/workspace.py`
- Modify: `apps/api/plane/app/permissions/project.py`
- Modify: `apps/api/plane/app/views/project/base.py`
- Test: `apps/api/plane/tests/unit/permissions/test_superadmin_guards.py`

**Interfaces:**

- Produces: `is_super_admin(user: User) -> bool`
- Consumes: `InstanceAdmin` model from `plane.license.models`, `user.is_superuser` from `plane.db.models.User`

- [ ] **Step 1: Viết test kiểm tra quyền Super Admin và rào chắn tạo phòng ban / đơn vị**

```python
import pytest
from plane.app.permissions.base import is_super_admin
from plane.license.models import Instance, InstanceAdmin
from plane.db.models import User

@pytest.mark.django_db
def test_is_super_admin():
    normal_user = User.objects.create(username="normal_user", email="normal@test.com")
    assert is_super_admin(normal_user) is False

    super_user = User.objects.create(username="super_user", email="super@test.com", is_superuser=True)
    assert is_super_admin(super_user) is True

    instance = Instance.objects.create(instance_id="inst_1", current_version="1.0")
    instance_admin_user = User.objects.create(username="inst_admin", email="inst@test.com")
    InstanceAdmin.objects.create(instance=instance, user=instance_admin_user, role=20)
    assert is_super_admin(instance_admin_user) is True
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại (chưa có `is_super_admin`)**
- [ ] **Step 3: Triển khai hàm `is_super_admin(user)` trong `plane/app/permissions/base.py`**

```python
def is_super_admin(user):
    if not user or user.is_anonymous:
        return False
    if getattr(user, "is_superuser", False):
        return True
    try:
        from plane.license.models import InstanceAdmin
        return InstanceAdmin.objects.filter(user=user, role__gte=15).exists()
    except Exception:
        return False
```

- [ ] **Step 4: Cập nhật `WorkSpaceBasePermission` và `ProjectBasePermission` để chặn non-SuperAdmin tạo Workspace/Project**
- Trong `WorkSpaceBasePermission.has_permission`:
  ```python
  if request.method == "POST":
      return is_super_admin(request.user)
  ```
- Trong `ProjectBasePermission.has_permission`:
  ```python
  if request.method == "POST":
      return is_super_admin(request.user)
  ```
- Trong `ProjectViewSet.partial_update`:
  ```python
  if "project_lead" in request.data:
      new_lead = request.data.get("project_lead")
      current_lead = str(project.project_lead_id) if project.project_lead_id else None
      if new_lead != current_lead and not is_super_admin(request.user):
          return Response(
              {"error": "Chỉ Quản trị viên cấp cao (God Mode) mới có quyền chỉ định Trưởng bộ phận."},
              status=status.HTTP_403_FORBIDDEN,
          )
  ```
- [ ] **Step 5: Chạy lại test và commit**

```bash
git add apps/api/plane/app/permissions/ apps/api/plane/app/views/project/base.py apps/api/plane/tests/unit/permissions/test_superadmin_guards.py
git commit -m "feat(api): enforce superadmin god-mode guards on workspaces, projects, and leads"
```

---

### Task 2: Endpoint Khởi Tạo Tài Khoản Trực Tiếp & Cấp Phát Credentials

**Files:**

- Create: `apps/api/plane/app/views/workspace/direct_member.py`
- Modify: `apps/api/plane/app/urls/workspace.py`
- Test: `apps/api/plane/tests/unit/views/test_direct_member_create.py`

**Interfaces:**

- Produces: `POST /api/workspaces/{slug}/members/direct-create/`
- Consumes: `is_super_admin`, `User`, `WorkspaceMember`, `ProjectMember`

- [ ] **Step 1: Viết test cho direct member creation (có email, không email, username trùng, sai thẩm quyền)**

```python
import pytest
from rest_framework import status
from plane.db.models import User, Workspace, WorkspaceMember, Project, ProjectMember

@pytest.mark.django_db
def test_direct_member_create_success_without_email(client):
    # Setup workspace & workspace admin
    admin = User.objects.create(username="workspace_admin", email="admin@bwp.com")
    admin.set_password("pass123")
    admin.save()
    ws = Workspace.objects.create(name="WS1", slug="ws1", owner=admin)
    WorkspaceMember.objects.create(workspace=ws, member=admin, role=20)

    client.force_authenticate(user=admin)
    payload = {
        "display_name": "Test User",
        "username": "test_user_1",
        "password": "StrongPassword123!",
        "role": 15
    }
    response = client.post("/api/workspaces/ws1/members/direct-create/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["username"] == "test_user_1"
    assert response.data["email"] is None
    assert User.objects.filter(username="test_user_1").exists()
```

- [ ] **Step 2: Chạy test để xác nhận endpoint chưa tồn tại (404)**
- [ ] **Step 3: Triển khai `DirectMemberCreateEndpoint` trong `apps/api/plane/app/views/workspace/direct_member.py`**
  - Kiểm tra thẩm quyền caller:
    - Nếu có `project_id`: Caller phải là SuperAdmin, Workspace Admin, hoặc có `role=20` trong `ProjectMember` của `project_id`.
    - Nếu không có `project_id`: Caller phải là SuperAdmin hoặc Workspace Admin (`role=20`).
  - Validate username format (`^[a-z0-9_]{3,30}$`) và uniqueness.
  - Validate email (nếu có) format và uniqueness. Nếu rỗng, gán `email = None`.
  - Khởi tạo `User`, hash password bằng `user.set_password()`.
  - Khởi tạo `WorkspaceMember` và `ProjectMember` (nếu có `project_id`).
  - Trả về thông tin user kèm credentials plaintext.
- [ ] **Step 4: Đăng ký route trong `apps/api/plane/app/urls/workspace.py`**
- [ ] **Step 5: Chạy test xác nhận thành công và commit**

```bash
git add apps/api/plane/app/views/workspace/ apps/api/plane/app/urls/workspace.py apps/api/plane/tests/unit/views/test_direct_member_create.py
git commit -m "feat(api): add direct member creation endpoint with auto credentials"
```

---

### Task 3: Nâng Cấp Xác Thực Đăng Nhập Kép (Username hoặc Email)

**Files:**

- Modify: `apps/api/plane/authentication/views/app/check.py`
- Modify: `apps/api/plane/authentication/views/app/email.py`
- Test: `apps/api/plane/tests/unit/auth/test_dual_identifier_login.py`

**Interfaces:**

- Produces: `POST /api/auth/check/`, `POST /api/auth/sign-in/` accepting either `username` or `email`
- Consumes: `User.objects.filter(username__iexact=...)` / `User.objects.filter(email__iexact=...)`

- [ ] **Step 1: Viết test kiểm tra đăng nhập bằng username và email**

```python
import pytest
from rest_framework import status
from plane.db.models import User

@pytest.mark.django_db
def test_dual_identifier_auth(client):
    user = User.objects.create(username="emp_alex", email=None, display_name="Alex")
    user.set_password("MySecurePass123!")
    user.save()

    # Check endpoint with username
    res_check = client.post("/api/auth/check/", {"email": "emp_alex"}, format="json")
    assert res_check.status_code == status.HTTP_200_OK
    assert res_check.data["existing"] is True

    # Sign in endpoint with username
    res_login = client.post("/api/auth/sign-in/", {"email": "emp_alex", "password": "MySecurePass123!"})
    assert res_login.status_code in [status.HTTP_200_OK, status.HTTP_302_FOUND]
```

- [ ] **Step 2: Chạy test để kiểm tra thất bại hiện tại (do `validate_email` chặn)**
- [ ] **Step 3: Cập nhật `EmailCheckEndpoint` trong `apps/api/plane/authentication/views/app/check.py`**
  - Lấy identifier từ `request.data.get("email")`.
  - Nếu có `@`: Validate email format và tìm `User.objects.filter(email__iexact=identifier).first()`.
  - Nếu không có `@`: Tìm trực tiếp `User.objects.filter(username__iexact=identifier).first()`.
- [ ] **Step 4: Cập nhật `SignInAuthEndpoint` trong `apps/api/plane/authentication/views/app/email.py`**
  - Chấp nhận identifier là email hoặc username.
  - Tìm user tương ứng, kiểm tra password qua `user.check_password(password)`.
  - Thiết lập phiên và chuyển hướng an toàn.
- [ ] **Step 5: Chạy test xác nhận pass và commit**

```bash
git add apps/api/plane/authentication/views/app/check.py apps/api/plane/authentication/views/app/email.py apps/api/plane/tests/unit/auth/test_dual_identifier_login.py
git commit -m "feat(auth): support dual identifier login with username or email"
```

---

### Task 4: Cô Lập Thẩm Quyền Quản Trị Cấp Phòng Ban (Department-Level Scoping)

**Files:**

- Modify: `apps/api/plane/app/views/project/member.py`
- Modify: `apps/api/plane/app/permissions/project.py`
- Test: `apps/api/plane/tests/unit/permissions/test_department_scoping.py`

**Interfaces:**

- Produces: Strict 403 enforcement on cross-department member additions
- Consumes: `ProjectMember.objects.filter(project_id=..., member=request.user, role=20)`

- [ ] **Step 1: Viết test chứng minh Dept Admin phòng A không thể thêm thành viên vào phòng B**

```python
import pytest
from rest_framework import status
from plane.db.models import User, Workspace, WorkspaceMember, Project, ProjectMember

@pytest.mark.django_db
def test_dept_admin_cannot_interfere_other_department(client):
    ws_owner = User.objects.create(username="owner", email="owner@bwp.com", is_superuser=True)
    ws = Workspace.objects.create(name="WS", slug="ws", owner=ws_owner)

    dept_a_admin = User.objects.create(username="dept_a_admin", email="admin_a@bwp.com")
    WorkspaceMember.objects.create(workspace=ws, member=dept_a_admin, role=15)

    dept_a = Project.objects.create(name="Dept A", identifier="DA", workspace=ws)
    dept_b = Project.objects.create(name="Dept B", identifier="DB", workspace=ws)

    ProjectMember.objects.create(workspace=ws, project=dept_a, member=dept_a_admin, role=20)

    client.force_authenticate(user=dept_a_admin)
    # Attempting to add member to Dept B
    res = client.post(f"/api/workspaces/ws/projects/{dept_b.id}/members/", {"members": [{"member_id": dept_a_admin.id, "role": 15}]}, format="json")
    assert res.status_code == status.HTTP_403_FORBIDDEN
```

- [ ] **Step 2: Chạy test xác nhận kiểm tra**
- [ ] **Step 3: Rà soát và siết chặt quyền trong `ProjectMemberViewSet.create` và `ProjectBasePermission`**
  - Đảm bảo kiểm tra người gọi phải có role 20 trong chính `project_id` đó.
- [ ] **Step 4: Chạy test và commit**

```bash
git add apps/api/plane/app/views/project/member.py apps/api/plane/tests/unit/permissions/test_department_scoping.py
git commit -m "feat(api): enforce strict department-level isolation for member management"
```

---

### Task 5: Frontend Service & Store Tích Hợp Tạo Tài Khoản Trực Tiếp

**Files:**

- Modify: `apps/web/core/services/workspace.service.ts`
- Modify: `apps/web/core/store/member/workspace/workspace-member.store.ts`
- Modify: `packages/types/src/member.ts`

**Interfaces:**

- Produces: `workspaceMemberStore.directCreateMember(workspaceSlug: string, data: IDirectMemberCreateData)`
- Consumes: `POST /api/workspaces/{slug}/members/direct-create/`

- [ ] **Step 1: Định nghĩa kiểu dữ liệu `IDirectMemberCreateData` và `IDirectMemberCreateResponse` trong `packages/types/src/member.ts`**

```typescript
export interface IDirectMemberCreateData {
  display_name: string;
  username: string;
  password: string;
  email?: string;
  role: number;
  project_id?: string;
  project_role?: number;
}

export interface IDirectMemberCreateResponse {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  role: number;
  credentials: {
    username: string;
    password: string;
  };
}
```

- [ ] **Step 2: Thêm phương thức gọi API trong `WorkspaceService`**
- [ ] **Step 3: Thêm MobX action `directCreateMember` trong `WorkspaceMemberStore` tự động cập nhật danh sách thành viên sau khi tạo**
- [ ] **Step 4: Chạy type-check `pnpm check:types` và commit**

```bash
git add packages/types/src/member.ts apps/web/core/services/ apps/web/core/store/member/
git commit -m "feat(web): add direct member creation service and store action"
```

---

### Task 6: Giao Diện Modal "Thêm Thành Viên" & Hộp Thoại Bàn Giao Credentials

**Files:**

- Create: `apps/web/core/components/workspace/members/direct-member-create-modal.tsx`
- Create: `apps/web/core/components/workspace/members/credential-summary-card.tsx`
- Modify: `apps/web/app/(all)/[workspaceSlug]/(settings)/settings/(workspace)/members/page.tsx`
- Modify: `apps/web/core/components/project/send-project-invitation-modal.tsx`

**Interfaces:**

- Produces: `<DirectMemberCreateModal isOpen={...} onClose={...} projectId={optional} />`
- Consumes: `directCreateMember` from `useMember()`, `@plane/ui`, clipboard utilities

- [ ] **Step 1: Xây dựng helper sinh username ngẫu nhiên và mật khẩu an toàn**
  - Hàm `generateRandomUsername(name: string): string`
  - Hàm `generateStrongPassword(): string` (12 ký tự gồm chữ hoa, thường, số, ký tự đặc biệt)
- [ ] **Step 2: Xây dựng component `CredentialSummaryCard`**
  - Hiển thị Username, Password kèm nút hiện/ẩn, vai trò, đường dẫn đăng nhập.
  - Nút **"Sao chép thông tin đăng nhập"** sao chép văn bản định dạng chuẩn và hiển thị Toast thành công.
- [ ] **Step 3: Xây dựng modal `DirectMemberCreateModal`**
  - Form nhập Họ tên, Username (kèm nút tạo ngẫu nhiên), Password (kèm nút tạo mạnh), Email tùy chọn (nhãn rõ ràng "Không bắt buộc"), Dropdown chọn vai trò.
  - Khi submit thành công, chuyển sang hiển thị `CredentialSummaryCard`.
- [ ] **Step 4: Tích hợp vào `WorkspaceMembersSettingsPage` (Cài đặt đơn vị -> Thành viên)**
- [ ] **Step 5: Tích hợp vào `SendProjectInvitationModal` (Cài đặt phòng ban -> Thành viên) với 2 tab: "Thêm từ đơn vị" và "Tạo tài khoản mới"**
- [ ] **Step 6: Kiểm tra giao diện và commit**

```bash
git add apps/web/core/components/workspace/members/ apps/web/app/ apps/web/core/components/project/
git commit -m "feat(web): add direct member creation modal with auto credentials and copy dialog"
```

---

### Task 7: Cập Nhật Màn Hình Đăng Nhập Frontend (Tên Người Dùng Hoặc Email)

**Files:**

- Modify: `apps/web/core/components/account/auth-forms/email.tsx`
- Modify: `packages/i18n/src/locales/vi-VN/common.json`
- Modify: `packages/i18n/src/locales/en/common.json`

**Interfaces:**

- Produces: Updated input accepting username or email without rejecting non-email format
- Consumes: `EmailCheckEndpoint`

- [ ] **Step 1: Cập nhật tài nguyên ngôn ngữ i18n:**
  - `"label_username_or_email": "Tên người dùng hoặc Email"`
  - `"placeholder_username_or_email": "Nhập tên người dùng hoặc email..."`
- [ ] **Step 2: Cập nhật component `AuthEmailForm`:**
  - Cho phép chuỗi ký tự không có `@` nếu độ dài >= 3 ký tự (hợp lệ cho username).
  - Cập nhật nhãn và placeholder hiển thị tương ứng.
- [ ] **Step 3: Kiểm tra form submit với cả username và email**
- [ ] **Step 4: Commit**

```bash
git add apps/web/core/components/account/auth-forms/email.tsx packages/i18n/
git commit -m "feat(web): update sign-in form to accept username or email"
```

---

### Task 8: Ẩn / Khóa Tính Năng Tạo Phòng Ban & Trưởng Bộ Phận Dành Riêng God Mode

**Files:**

- Modify: `apps/web/core/components/sidebar/sidebar-projects-menu.tsx` (hoặc header project creation buttons)
- Modify: `apps/web/core/components/project/settings/general.tsx` (hoặc dropdown project lead)
- Modify: `apps/web/core/hooks/store/user/use-user-permissions.ts`

**Interfaces:**

- Produces: `isSuperAdmin` boolean check on user permissions store
- Consumes: Current user flags (`is_superuser`, `is_instance_admin`)

- [ ] **Step 1: Thêm cờ `isSuperAdmin` vào `useUserPermissions` hook**
- [ ] **Step 2: Ẩn nút "Tạo phòng ban" / "+ Thêm phòng ban" nếu `!isSuperAdmin`**
- [ ] **Step 3: Khóa (disable) dropdown "Trưởng bộ phận" trong cài đặt chung của phòng ban nếu `!isSuperAdmin` kèm chú thích badge**
- [ ] **Step 4: Kiểm tra hiển thị đúng với tài khoản Super Admin vs Admin thường**
- [ ] **Step 5: Commit**

```bash
git add apps/web/core/hooks/ apps/web/core/components/
git commit -m "feat(web): restrict department creation and lead assignment to god mode superadmins in UI"
```

---

### Task 9: Kiểm Thử Toàn Diện & Xác Thực Hệ Thống (Verification & Integration)

**Files:**

- Test: Toàn bộ suite backend và frontend

- [ ] **Step 1: Chạy kiểm tra TypeScript `pnpm check:types`**
- [ ] **Step 2: Chạy kiểm tra Lint `pnpm check:lint`**
- [ ] **Step 3: Chạy toàn bộ backend test suite:**
  - `docker compose -f docker-compose-test.yml run --rm api-tests pytest -m unit` (hoặc local pytest)
- [ ] **Step 4: Kiểm thử thủ công end-to-end flow:**
  1. Đăng nhập với Unit Admin.
  2. Vào Cài đặt đơn vị $\rightarrow$ Thành viên $\rightarrow$ Bấm "Thêm thành viên".
  3. Bấm tự động tạo username & password, để trống email $\rightarrow$ Bấm Tạo tài khoản.
  4. Bấm "Sao chép thông tin đăng nhập" và xác nhận thông tin clipboard.
  5. Đăng xuất, đăng nhập vào bằng Username vừa tạo $\rightarrow$ Thành công.
  6. Thử tạo phòng ban bằng tài khoản Unit Admin $\rightarrow$ Bị chặn.
- [ ] **Step 5: Cập nhật tài liệu người dùng `USER_GUIDE_VI.md` phản ánh quy trình mới và commit hoàn tất**

```bash
git add USER_GUIDE_VI.md docs/
git commit -m "docs: update user guide with automated credential creation and RBAC scoping"
```
