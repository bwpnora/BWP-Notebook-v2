# Thiết Kế Hệ Thống Tạo Tài Khoản Tự Động & Phân Quyền RBAC (Automated Account Creation & RBAC Architecture)

- **Ngày ban hành:** 2026-09-13
- **Trạng thái:** Bản thiết kế đã phê duyệt (Design Approved)
- **Tác giả:** Antigravity Engineering & BWP Architecture Team
- **Hệ thống áp dụng:** BWP Notebook (Backend: Django / REST Framework, Frontend: React / Vite / MobX)

---

## 1. Tổng Quan & Mục Tiêu Nghiệp Vụ (Executive Summary)

Tài liệu này xác lập kiến trúc chi tiết cho 4 trụ cột nghiệp vụ mới của BWP Notebook:

1. **Khởi tạo tài khoản tự động & Cấp phát thông tin đăng nhập (Automated User Creation & Credentials):**
   - Quản trị viên đơn vị (Unit Admin) hoặc Quản trị viên phòng ban (Department Admin) có thể trực tiếp tạo tài khoản cho nhân sự mới tại màn hình **Thành viên (Members)** thông qua nút **"Thêm thành viên"**.
   - Hệ thống hỗ trợ sinh tự động Tên đăng nhập (Username) và Mật khẩu an toàn (Password) với 1 cú nhấp.
   - Nhập địa chỉ Email là **tùy chọn (optional)**, không bắt buộc nhân sự phải có email công vụ.
   - Sau khi tạo xong, giao diện hiển thị hộp thoại tổng hợp thông tin kèm nút **"Sao chép thông tin đăng nhập"** một chạm để gửi cho nhân sự.
2. **Hỗ trợ đăng nhập kép (Dual-Identifier Sign-In):**
   - Màn hình đăng nhập chấp nhận cả **Tên đăng nhập (Username)** hoặc **Email** kết hợp cùng Mật khẩu để xác thực tài khoản.
3. **Phân quyền tối cao Quản trị viên Cấp cao / "God Mode" (Super Admin Ownership):**
   - Chỉ duy nhất tài khoản Quản trị viên cấp cao có quyền **"God Mode"** (`InstanceAdmin` / `is_superuser`) mới được phép:
     - Tạo mới Đơn vị / Công ty (Workspaces).
     - Tạo mới Phòng ban / Notebook (Projects).
     - Bổ nhiệm hoặc thay đổi Trưởng bộ phận (Project Lead) cho từng phòng ban.
     - Cấu hình các thiết lập hạ tầng tổ chức toàn cục.
4. **Cô lập thẩm quyền theo phòng ban (Department-Level Scoping):**
   - Quản trị viên phòng ban (Department Admin) chỉ có toàn quyền quản lý và thêm nhân sự vào đúng phòng ban mà mình được phân công phụ trách.
   - Tuyệt đối bị chặn và không thể can thiệp, xem cấu hình nhạy cảm hoặc thêm nhân sự vào bất kỳ phòng ban nào khác trong công ty.
5. **Chuẩn hóa ma trận phân quyền 5 cấp (RBAC Hierarchy & Access Controls):**
   - Rà soát toàn bộ hệ thống phân quyền, phân định ranh giới rõ ràng từ backend API đến frontend UI.

---

## 2. Ma Trận Phân Quyền 5 Cấp Chuẩn Hóa (RBAC Hierarchy Matrix)

Hệ thống định nghĩa 5 cấp độ vai trò kiểm soát truy cập phân tầng:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Cấp 1: Quản Trị Viên Cấp Cao (Super Admin / God Mode - Level 30)      │
│  • Quản trị toàn máy chủ, truy cập /god-mode                           │
│  • Duy nhất có quyền: Tạo Đơn vị, Tạo Phòng ban, Chỉ định Trưởng ban  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Cấp 2: Quản Trị Viên Đơn Vị (Workspace Admin - Level 20)              │
│  • Quản trị công ty/đơn vị: Tên, logo, múi giờ, danh bạ nhân sự        │
│  • Tạo tài khoản nhân sự mới (auto-credentials), phân bổ vai trò       │
│  • BỊ CHẶN: Không thể tạo mới phòng ban hoặc đổi Trưởng bộ phận        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Cấp 3: Trưởng Bộ Phận / Admin Phòng (Department Admin - Level 20/Lead)│
│  • Toàn quyền vận hành trong phòng ban được chỉ định                   │
│  • Thêm nhân sự vào phòng hoặc tạo mới tài khoản gắn với phòng mình    │
│  • BỊ CHẶN TUYỆT ĐỐI: Không thể can thiệp bất kỳ phòng ban nào khác    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Cấp 4: Thành Viên Chính Thức (Department Member - Level 15)           │
│  • Thực thi công việc tác nghiệp trong các phòng ban tham gia          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  Cấp 5: Khách / Cộng Tác Viên (Guest - Level 5)                        │
│  • Chỉ xem và bình luận giới hạn trên các công việc được giao đích danh│
└────────────────────────────────────────────────────────────────────────┘
```

### Bảng Ma Trận Thẩm Quyền Chi Tiết:

| Quyền hạn & Nghiệp vụ                         | Super Admin (God Mode) | Unit Admin (Workspace) | Dept Admin (Phòng ban) | Dept Member |  Guest   |
| :-------------------------------------------- | :--------------------: | :--------------------: | :--------------------: | :---------: | :------: |
| **Tạo Đơn vị / Công ty mới (Workspace)**      |         **CÓ**         |      Không (403)       |      Không (403)       |    Không    |  Không   |
| **Tạo Phòng ban / Notebook mới (Project)**    |         **CÓ**         |      Không (403)       |      Không (403)       |    Không    |  Không   |
| **Chỉ định / Thay đổi Trưởng bộ phận (Lead)** |         **CÓ**         |      Không (403)       |      Không (403)       |    Không    |  Không   |
| **Tạo tài khoản nhân sự mới (Cấp Đơn vị)**    |         **CÓ**         |         **CÓ**         |      Không (403)       |    Không    |  Không   |
| **Tạo tài khoản nhân sự mới (Gắn vào Phòng)** |         **CÓ**         |         **CÓ**         | **CÓ** _(phòng mình)_  |    Không    |  Không   |
| **Gán nhân sự đơn vị vào Phòng ban**          |         **CÓ**         |         **CÓ**         | **CÓ** _(phòng mình)_  |    Không    |  Không   |
| **Truy cập / Thao tác trên phòng ban khác**   |         **CÓ**         |     Xem/Điều phối      |   **BỊ CHẶN (403)**    |    Không    |  Không   |
| **Cấu hình Trạng thái / Workflow phòng ban**  |         **CÓ**         |         **CÓ**         | **CÓ** _(phòng mình)_  |    Không    |  Không   |
| **Tạo & Cập nhật Công việc tác nghiệp**       |         **CÓ**         |         **CÓ**         |         **CÓ**         |   **CÓ**    | Giới hạn |

---

## 3. Kiến Trúc Backend (API Endpoints & Access Guards)

### 3.1. Điểm Cuối Khởi Tạo Tài Khoản Trực Tiếp (`POST /api/workspaces/{slug}/members/direct-create/`)

- **Tệp xử lý:** `apps/api/plane/app/views/workspace/member.py`
- **Phương thức:** `POST`
- **Payload yêu cầu:**
  ```json
  {
    "display_name": "Nguyễn Văn A",
    "username": "nguyenvana_491",
    "password": "SecurePassword123!",
    "email": "optional_email@company.com", // Nullable / Tùy chọn
    "role": 15, // Workspace role: 20 (Admin), 15 (Member), 5 (Guest)
    "project_id": "optional-uuid", // Khi Department Admin tạo trực tiếp từ phòng
    "project_role": 15 // Project role: 20 (Admin), 15 (Member), 5 (Guest)
  }
  ```
- **Quy trình kiểm tra quyền (Permission Guard):**
  1. Nếu `project_id` có giá trị (Department Admin gọi):
     - Kiểm tra người gọi có `role = 20` trong `ProjectMember` của `project_id` đó hoặc là Quản trị viên đơn vị / SuperAdmin.
     - Nếu người gọi chỉ là Department Admin của phòng X mà truyền `project_id` của phòng Y: Ném lỗi `403 Forbidden`.
  2. Nếu `project_id` không có giá trị (Unit Admin gọi):
     - Kiểm tra người gọi có `role = 20` trong `WorkspaceMember` hoặc là SuperAdmin.
- **Xử lý Dữ liệu:**
  1. Validate `username`: độ dài 3–30 ký tự, chỉ chứa chữ cái thường, số và dấu gạch dưới (`^[a-z0-9_]+$`), kiểm tra duy nhất trong bảng `User`.
  2. Validate `email` (nếu có nhập): kiểm tra định dạng RFC email và tính duy nhất. Nếu để trống, gán `email = None`.
  3. Khởi tạo `User`: mã hóa mật khẩu bằng `user.set_password(password)`, thiết lập `is_password_autoset = False`, `is_active = True`.
  4. Khởi tạo `WorkspaceMember`: gắn user vào `Workspace` với vai trò tương ứng.
  5. Nếu có `project_id`: Khởi tạo `ProjectMember` gắn user vào đúng phòng ban đó.
- **Payload phản hồi thành công (HTTP 201 Created):**
  ```json
  {
    "id": "user-uuid",
    "username": "nguyenvana_491",
    "display_name": "Nguyễn Văn A",
    "email": null,
    "role": 15,
    "credentials": {
      "username": "nguyenvana_491",
      "password": "SecurePassword123!"
    }
  }
  ```

### 3.2. Cải Tiến Xác Thực Đăng Nhập Kép (Dual-Identifier Authentication)

- **Tệp xử lý:** `apps/api/plane/authentication/views/app/check.py` và `apps/api/plane/authentication/views/app/email.py`.
- **Logic kiểm tra định danh (`EmailCheckEndpoint`):**
  - Trường `email` trong payload được xử lý như một `identifier`.
  - Nếu `identifier` chứa ký tự `@`: Kiểm tra định dạng email và truy vấn `User.objects.filter(email__iexact=identifier).first()`.
  - Nếu `identifier` không chứa `@`: Truy vấn trực tiếp `User.objects.filter(username__iexact=identifier).first()`.
  - Trả về trạng thái đăng nhập `CREDENTIAL`.
- **Logic xác thực mật khẩu (`SignInAuthEndpoint`):**
  - Nhận `email` (định danh) và `password`.
  - Tra cứu user theo `email` hoặc `username`.
  - Gọi `user.check_password(password)`.
  - Cấp token JWT và khởi tạo phiên làm việc như chuẩn hiện tại.

### 3.3. Rào Chắn Kiểm Soát Super Admin ("God Mode")

- **Hàm tiện ích:** `is_super_admin(user)` trong `apps/api/plane/app/permissions/base.py`:
  ```python
  def is_super_admin(user):
      if not user or user.is_anonymous:
          return False
      return user.is_superuser or InstanceAdmin.objects.filter(user=user, role__gte=15).exists()
  ```
- **Chặn Tạo Đơn Vị (`POST /api/workspaces/`):**
  - `WorkSpaceBasePermission` kiểm tra `is_super_admin(request.user)` đối với phương thức `POST`. Nếu không thỏa mãn, trả về `403 Forbidden` kèm thông báo _"Chỉ Quản trị viên cấp cao (God Mode) mới có quyền tạo đơn vị mới."_
- **Chặn Tạo Phòng Ban (`POST /api/workspaces/{slug}/projects/`):**
  - `ProjectBasePermission` và `ProjectViewSet.create` kiểm tra `is_super_admin(request.user)`. Người dùng có vai trò Unit Admin hoặc Member khi cố tình gọi API tạo phòng ban sẽ nhận mã lỗi `403 Forbidden` kèm thông báo _"Chỉ Quản trị viên cấp cao (God Mode) mới có quyền tạo phòng ban mới."_
- **Chặn Thay Đổi Trưởng Bộ Phận (`PATCH /api/workspaces/{slug}/projects/{pk}/`):**
  - Trong `ProjectViewSet.partial_update`, nếu trường `project_lead` xuất hiện trong payload và khác với giá trị hiện tại của dự án: Bắt buộc `is_super_admin(request.user)`. Nếu không thỏa mãn, trả về `403 Forbidden` kèm thông báo _"Chỉ Quản trị viên cấp cao (God Mode) mới có quyền chỉ định Trưởng bộ phận."_

---

## 4. Thiết Kế Trải Nghiệm Người Dùng (Frontend UI/UX Flow)

### 4.1. Màn Hình "Thêm Thành Viên" Tại Cài Đặt Đơn Vị (`WorkspaceMembersSettingsPage`)

- **Vị trí:** `apps/web/app/(all)/[workspaceSlug]/(settings)/settings/(workspace)/members/page.tsx`
- **Nút hành động:** Bấm **"Thêm thành viên"** mở modal `DirectMemberCreateModal`.
- **Các trường nhập liệu:**
  1. **Họ và tên / Tên hiển thị (Display Name):** Bắt buộc. Nhập họ tên tự động gợi ý username (ví dụ: gõ "Trần Văn Bình" $\rightarrow$ gợi ý `tran_van_binh_512`).
  2. **Tên đăng nhập (Username):** Bắt buộc. Kèm nút icon **"Tự động tạo"** (sinh chuỗi định danh ngẫu nhiên nếu không muốn tự đặt).
  3. **Mật khẩu (Password):** Bắt buộc. Có icon ẩn/hiện mật khẩu và nút **"Tự động tạo mật khẩu mạnh"** (sinh chuỗi 12 ký tự ngẫu nhiên bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt).
  4. **Email (Địa chỉ Email):** Tùy chọn (Optional). Có nhãn phụ `(Không bắt buộc)`.
  5. **Vai trò đơn vị (Workspace Role):** Dropdown chọn:
     - `Thành viên (Member)` (Mặc định)
     - `Quản trị viên đơn vị (Admin)`
     - `Khách (Guest)`
  6. **Nút thực thi:** `[ Tạo tài khoản ]` và `[ Hủy ]`.

### 4.2. Màn Hình "Thêm Thành Viên" Tại Cài Đặt Phòng Ban (`ProjectMemberList`)

- **Vị trí:** `apps/web/app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/members/page.tsx`
- **Modal đa năng gồm 2 tab:**
  - **Tab 1: "Thêm từ đơn vị":** Cho phép chọn các nhân sự đã có trong đơn vị nhưng chưa vào phòng ban này (luồng hiện có).
  - **Tab 2: "Tạo tài khoản mới":** Mở form tạo tài khoản tự động (Họ tên, Username, Password, Email tùy chọn, Vai trò phòng ban). Khi bấm Tạo tài khoản, nhân sự mới được tạo và tự động gắn vào phòng ban hiện tại.

### 4.3. Hộp Thoại Bàn Giao Thông Tin Tài Khoản (Post-Creation Credential Dialog)

Ngay sau khi API tạo tài khoản thành công, hệ thống chuyển sang màn hình thông báo bàn giao:

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✓ Khởi tạo tài khoản thành công!                                      │
│                                                                        │
│  Tên hiển thị:    Nguyễn Văn A                                         │
│  Tên đăng nhập:   nguyenvana_491                                       │
│  Mật khẩu:        Xk9#mP2!vL8q  [ 👁 Hiện ]                            │
│  Email:           (Chưa thiết lập)                                     │
│  Vai trò:         Thành viên                                           │
│  Đường dẫn:       http://192.168.3.168:18080/                          │
│                                                                        │
│  [ 📋 Sao chép thông tin đăng nhập ]              [ Hoàn tất / Đóng ]  │
└────────────────────────────────────────────────────────────────────────┘
```

- Khi bấm **"Sao chép thông tin đăng nhập"**, clipboard sẽ nhận chuỗi văn bản định dạng chuẩn:
  ```text
  Thông tin tài khoản BWP Notebook:
  • Tên hiển thị: Nguyễn Văn A
  • Tên đăng nhập: nguyenvana_491
  • Mật khẩu: Xk9#mP2!vL8q
  • Đăng nhập tại: http://192.168.3.168:18080/
  ```
- Hiển thị Toast thông báo: _"Đã sao chép thông tin đăng nhập vào bộ nhớ tạm!"_.

### 4.4. Cập Nhật Màn Hình Đăng Nhập (`AuthEmailForm`)

- Nhãn trường: Đổi từ `Email` thành **`Tên người dùng hoặc Email` (Username or Email)**.
- Gợi ý (Placeholder): _"Nhập tên người dùng hoặc email..."_.
- Kiểm tra hợp lệ (Validation): Cho phép nhập cả username chữ thường số (tối thiểu 3 ký tự) mà không bắt buộc phải có dấu `@`.

### 4.5. Ẩn / Khóa Các Tính Năng Dành Riêng Cho God Mode

- **Nút "+ Thêm phòng ban":** Trong thanh bên (sidebar) và trang danh sách phòng ban, nút thêm phòng ban chỉ hiển thị nếu tài khoản đăng nhập là Super Admin. Đối với tài khoản khác, nút bị ẩn hoàn toàn.
- **Trường "Trưởng bộ phận" (Project Lead):** Trong cài đặt chung của phòng ban (`Project Settings -> General`), dropdown Trưởng bộ phận bị vô hiệu hóa (disabled) đối với non-SuperAdmin, đi kèm nhãn chú thích: _"Chỉ Quản trị viên cấp cao (God Mode) mới có quyền chỉ định Trưởng bộ phận"_.

---

## 5. Kế Hoạch Kiểm Thử & Xác Nhận (Verification & Testing Plan)

### 5.1. Kiểm Thử Backend (Automated Tests)

1. **Kiểm thử tạo tài khoản trực tiếp:**
   - Tạo tài khoản thành công không có email (`email = None`).
   - Tạo tài khoản thành công có email.
   - Thử tạo tài khoản trùng `username` $\rightarrow$ Nhận mã lỗi `400 Bad Request`.
   - Thử tạo tài khoản trùng `email` $\rightarrow$ Nhận mã lỗi `400 Bad Request`.
2. **Kiểm thử đăng nhập kép:**
   - Đăng nhập thành công bằng `username` + `password`.
   - Đăng nhập thành công bằng `email` + `password`.
   - Đăng nhập thất bại khi sai mật khẩu.
3. **Kiểm thử rào chắn Super Admin (God Mode):**
   - Unit Admin gọi `POST /api/workspaces/` $\rightarrow$ Nhận `403 Forbidden`.
   - Unit Admin gọi `POST /api/workspaces/{slug}/projects/` $\rightarrow$ Nhận `403 Forbidden`.
   - Unit Admin gọi `PATCH /api/workspaces/{slug}/projects/{pk}/` với `project_lead` mới $\rightarrow$ Nhận `403 Forbidden`.
   - Super Admin thực hiện 3 thao tác trên $\rightarrow$ Thành công (`200 OK` / `201 Created`).
4. **Kiểm thử cô lập phòng ban (Department Isolation):**
   - Dept Admin phòng A gọi thêm thành viên vào phòng B $\rightarrow$ Nhận `403 Forbidden`.
   - Dept Admin phòng A tạo user gắn vào phòng A $\rightarrow$ Thành công, user xuất hiện trong danh sách thành viên phòng A và không có trong phòng B.

### 5.2. Kiểm Thử Giao Diện & Toàn Vẹn Mã Nguồn

- Chạy `pnpm check:lint` để kiểm tra chuẩn mã nguồn.
- Chạy `pnpm check:types` để đảm bảo hệ thống kiểu TypeScript không có lỗi.
- Kiểm thử luồng thao tác thực tế: Tạo tài khoản $\rightarrow$ Sao chép thông tin $\rightarrow$ Đăng xuất $\rightarrow$ Đăng nhập bằng tên người dùng vừa tạo $\rightarrow$ Vào hệ thống thành công.
