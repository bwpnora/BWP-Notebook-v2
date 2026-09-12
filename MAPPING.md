# BWP-Notebook-v2: Architecture & Domain Mapping Guide
> **Customized & Architecture by IT Leon** (BWP Engineering Team)  
> Base Platform: Plane CE `v1.4.2` (Makeplane Inc., AGPL-3.0)

---

## 1. Bảng Ánh xạ Khái niệm Nghiệp vụ sang Mã nguồn Plane

| Khái niệm Nghiệp vụ (BWP-Notebook-v2) | Khái niệm Kỹ thuật (Plane CE v1.4.2) | Tệp Model Backend (Django) | Tệp API Viewset / Serializer | Component Giao diện Frontend (Next.js) |
|---|---|---|---|---|
| **Công ty / Đơn vị** | Workspace | `apps/api/plane/db/models/workspace.py` | `apps/api/plane/app/views/workspace.py`<br>`apps/api/plane/app/serializers/workspace.py` | `apps/web/core/components/workspace/` |
| **Phòng ban / Notebook** | Project | `apps/api/plane/db/models/project.py` | `apps/api/plane/app/views/project.py`<br>`apps/api/plane/app/serializers/project.py` | `apps/web/core/components/project/` |
| **Công việc** | Work Item / Issue | `apps/api/plane/db/models/issue.py` | `apps/api/plane/app/views/issue/`<br>`apps/api/plane/app/serializers/issue.py` | `apps/web/core/components/issues/` |
| **Loại công việc** | IssueType / Work Item Type | `apps/api/plane/db/models/issue_type.py` | `apps/api/plane/app/views/issue/issue_type.py` | `apps/web/core/components/issues/issue-layouts/properties/` |
| **Trạng thái** | State | `apps/api/plane/db/models/state.py` | `apps/api/plane/app/views/state.py` | `apps/web/core/components/issues/issue-layouts/properties/state.tsx` |
| **Người phụ trách** | IssueAssignee | `apps/api/plane/db/models/issue.py` (IssueAssignee) | `apps/api/plane/app/serializers/issue.py` | `apps/web/core/components/issues/issue-layouts/properties/assignee.tsx` |
| **Người hỗ trợ (Supporters)** | *Tùy biến M2M* (Mở rộng) | `apps/api/plane/db/models/issue.py` (Thêm Supporters M2M) | `apps/api/plane/app/serializers/issue.py` | `apps/web/core/components/issues/issue-layouts/spreadsheet/columns/` |
| **Số phòng (Room)** | *Tùy biến Nullable Int* | `apps/api/plane/db/models/issue.py` (Thêm field `room`) | `apps/api/plane/app/serializers/issue.py` | `apps/web/core/components/issues/issue-layouts/spreadsheet/columns/` |
| **Bảng công việc (Excel-like)** | Spreadsheet Table View | N/A (API trả Issue queryset) | `apps/api/plane/app/views/issue/` | `apps/web/core/components/issues/issue-layouts/spreadsheet/spreadsheet-table.tsx`<br>`apps/web/core/components/issues/issue-layouts/spreadsheet/spreadsheet-view.tsx` |
| **Quyền & Phân quyền (RBAC)** | ProjectMember / Permissions | `apps/api/plane/db/models/project.py` (ProjectMember) | `apps/api/plane/app/permissions/project.py`<br>`apps/api/plane/app/permissions/base.py` | `apps/web/core/components/project/settings/member-list.tsx` |

---

## 2. Chiến lược Ẩn các Module không dùng trong MVP (Phase 1)

Các module sau sẽ được ẩn khỏi thanh điều hướng (Sidebar) và các menu lựa chọn mà không xóa code để giữ tính tương thích:
- **Chu kỳ (Cycles/Sprints)**: `apps/api/plane/db/models/cycle.py` -> Ẩn trong `apps/web/core/components/workspace/sidebar/sidebar-menu-items.tsx`
- **Dự án con (Modules/Epics)**: `apps/api/plane/db/models/module.py` -> Ẩn trong sidebar menu items
- **Tài liệu (Pages/Docs)**: `apps/api/plane/db/models/page.py` -> Ẩn trong sidebar menu items
- **Báo cáo (Analytics)**: `apps/api/plane/db/models/analytic.py` -> Tắt tab Analytics trong project view

---

## 3. Quy chuẩn Mở rộng Schema (Phase 2 & Phase 3)

1. **Model Issue / Work Item** (`apps/api/plane/db/models/issue.py`):
   - Thêm quan hệ M2M `supporters = models.ManyToManyField("db.User", related_name="supported_issues", blank=True)`
   - Thêm `room = models.IntegerField(null=True, blank=True)`
   - Phân loại `task_type`: Ánh xạ tới `IssueType` với 2 giá trị mặc định: `operational` (Công việc vận hành) và `other` (Công việc khác).
2. **Business Rule Enforcement** (`apps/api/plane/app/views/issue/base.py`):
   - Người dùng thường tạo task -> ép `task_type = 'operational'`.
   - Cấp trên / Manager tạo task -> mặc định `task_type = 'other'`.
   - Kiểm tra quyền chuyển trạng thái và quyền đổi loại công việc trước khi lưu.
