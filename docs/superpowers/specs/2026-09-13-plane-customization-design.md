# Tài liệu Đặc tả Thiết kế Kỹ thuật (Technical Design Spec)

## Dự án: Tùy biến Plane thành Hệ thống Quản lý Công việc Nội bộ (BWP-Notebook-v2)

- **Ngày lập**: 2026-09-13
- **Tác giả tùy biến**: Code & Architecture bởi BWP Engineering Team (BWP Team)
- **Bản quyền nền tảng**: Makeplane Inc. (Giấy phép AGPL-3.0)
- **Upstream Repository**: `https://github.com/makeplane/plane.git` (Pin: `v1.4.2`)
- **Target Repository**: `https://github.com/bwpnora/BWP-Notebook-v2.git`
- **Môi trường triển khai mục tiêu**: Debian Server `192.168.3.168` (Docker & GHCR CI/CD)

---

## 1. Mục tiêu & Định hướng Kiến trúc

### 1.1. Mục tiêu nghiệp vụ

Fork và customize mã nguồn mở **Plane Community Edition (CE) `v1.4.2`** để xây dựng phần mềm quản lý công việc phòng ban nội bộ (**Notebook / BWP-Notebook-v2**) cho doanh nghiệp.

### 1.2. Nguyên tắc cốt lõi & Bản quyền

1. **Tuân thủ bản quyền AGPL-3.0**:
   - Giữ nguyên toàn bộ các file bản quyền gốc `LICENSE`, `COPYING` và header thông báo tác quyền của Makeplane.
   - Không xóa bỏ thông tin tác giả gốc.
2. **Ghi nhận đóng góp tùy biến (Credit Attribution)**:
   - Toàn bộ các module tùy biến mới, file cấu hình, scripts triển khai, tài liệu kiến trúc và giao diện chân trang hệ thống sẽ ghi nhận: **"Customized & Developed by BWP Engineering Team"**.
3. **Tái sử dụng tối đa, không viết lại**: Mở rộng trực tiếp thực thể Work Item của Plane, không tạo database engine độc lập.
4. **Backend Enforcement**: Mọi phân quyền, ràng buộc loại công việc và chuyển trạng thái đều phải được kiểm tra chặt chẽ ở tầng API backend (Django REST Framework), không chỉ phụ thuộc vào việc ẩn/hiện nút trên frontend.
5. **Bảo vệ môi trường server hiện hữu**: Né toàn bộ các container và port đang chạy trên server `192.168.3.168`.

---

## 2. Ánh xạ Nghiệp vụ & Phạm vi Chức năng (Domain Mapping)

| Khái niệm Plane              | Tên hiển thị (Nora Notebook)   | Ý nghĩa & Hành vi tùy biến                                                           |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| **Workspace**                | Công ty / Đơn vị               | Không gian cấp cao nhất của tổ chức                                                  |
| **Project**                  | Phòng ban / Notebook           | Mỗi phòng ban là một notebook độc lập, có thành viên và quyền riêng                  |
| **Work Item / Issue**        | Công việc                      | Bổ sung: Supporters (M2M), Room (nullable int), Notes, Timestamps                    |
| **Work Item Type**           | Phân loại công việc            | `operational` (Công việc vận hành) & `other` (Công việc khác)                        |
| **State**                    | Trạng thái                     | 4 trạng thái chuẩn tiếng Việt: _Chưa bắt đầu, Chờ xử lý, Đang thực hiện, Hoàn thành_ |
| **Assignee / Supporter**     | Người phụ trách / Người hỗ trợ | Phụ trách chính: 1 người; Người hỗ trợ: nhiều người (n:n)                            |
| **View / Spreadsheet**       | Bảng công việc (Excel-like)    | Màn hình chính của Notebook, dạng bảng lưới, inline editing                          |
| **Cycles / Modules / Pages** | Chu kỳ / Dự án con / Tài liệu  | **Ẩn khỏi UI/Menu** bằng cấu hình/feature flag ở MVP                                 |

---

## 3. Quy hoạch Môi trường & Hạ tầng Server `192.168.3.168`

### 3.1. Hiện trạng Server (Đã quét thực tế)

- **Container đang hoạt động**:
  - `nora-device-mng-app-1`: port `3000`
  - `nora-device-mng-postgres-1`: port `5432`
  - `nora-device-mng-postgres-test-1`: port `5433`
  - `nora-device-mng-garage-1`: port `3900 - 3903`
  - `bwp_notebook_postgres`: port `5434`
- **Dịch vụ hệ thống**: Apache (`80`), SSH (`22`), Gnome Remote (`3389`, `3390`), CUPS (`631`).
- **Tài nguyên**: RAM trống ~1.6 GB, Swap 3.4 GB, Ổ đĩa trống 80 GB.

### 3.2. Bảng Phân bổ Port & Mạng cho BWP-Notebook-v2

Để tránh 100% rủi ro xung đột port:

- **Web Frontend / Nginx Proxy**: Port **`18080`** (Host) -> Port `80` (Container). Truy cập: `http://192.168.3.168:18080`.
- **Database (`plane-db`)**: Kết nối nội bộ qua Docker network `nora_plane_net`, **không bind ra host** (nếu cần debug bên ngoài: dùng port `5435`).
- **Redis (`plane-redis`)**: Kết nối nội bộ qua `nora_plane_net`.
- **MinIO Object Storage**: Kết nối nội bộ qua `nora_plane_net` (hoặc mở `19000` nếu cần debug).
- **Tối ưu RAM**: Thiết lập `deploy.resources.limits.memory` cho từng container trong compose để tổng RAM không vượt quá 1.5 GB.

---

## 4. Kiến trúc CI/CD (Kế thừa từ `nora-device-mng-main`)

### 4.1. GitHub Actions Workflow (`.github/workflows/ci-cd.yml`)

- **Trigger**: Push hoặc Pull Request vào nhánh `nora/main`.
- **Pipeline Stages**:
  1. **Lint & Typecheck**: Kiểm tra cú pháp backend (flake8/black) và frontend (pnpm lint / turbo run lint).
  2. **Docker Buildx & Push GHCR**:
     - Đăng nhập `ghcr.io` với `GITHUB_TOKEN`.
     - Build các container tùy biến của Plane (`web`, `api`).
     - Đẩy ảnh container lên `ghcr.io/bwpnora/bwp-notebook-v2-web` và `ghcr.io/bwpnora/bwp-notebook-v2-api` với tag `latest` và `sha-<commit>`.

### 4.2. Triển khai trên Remote Server (`docker-compose.prod.yml`)

Server Debian chỉ cần kéo ảnh đã build từ GHCR về và khởi chạy, không tốn tài nguyên build trên server:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api python manage.py migrate
```

---

## 5. Lộ trình Triển khai Phân rã (Phased Roadmap)

Dự án được chia thành 5 Sub-project tuần tự:

### Sub-project 1: Khởi tạo Nền tảng, Khảo sát & Baseline Deployment (Phase 0 & 1)

- Clone Plane `v1.4.2` vào workspace cục bộ.
- Thiết lập git remote: `origin` (`BWP-Notebook-v2.git`) và `upstream` (`makeplane/plane.git`).
- Lập tài liệu `MAPPING.md` chi tiết giữa các file nguồn Plane và các thực thể nghiệp vụ (ghi rõ _Customized by BWP Engineering Team_).
- Thiết lập `docker-compose.yml`, `docker-compose.prod.yml`, `variables.env` né port (`18080`).
- Chạy thử nghiệm baseline trên server `192.168.3.168` để xác nhận kết nối, khởi tạo workspace, 4 trạng thái mẫu và ẩn các menu không dùng (Cycles, Modules, Pages).
- Thêm CI/CD workflow `.github/workflows/ci-cd.yml`.

### Sub-project 2: Domain Công việc & Business Rules (Phase 2)

- Thêm migration mở rộng model Work Item:
  - `supporters`: ManyToManyField liên kết `User` (nhiều người hỗ trợ).
  - `room`: Nullable Integer.
  - `notes`: Rich/Plain text.
  - Phân loại `task_type`: `operational` (Công việc vận hành) và `other` (Công việc khác).
- Backend Business Rules:
  - Nhân viên tự tạo -> tự động gán `operational`.
  - Quản lý/Cấp trên tạo giao việc -> mặc định `other`.
  - Kiểm tra quyền khi đổi loại hoặc giao lại (reassign).
  - Ghi nhận chi tiết vào Activity Log.

### Sub-project 3: Hệ thống Phân quyền Động RBAC & Notebook Isolation (Phase 3)

- Triển khai mô hình: `Role`, `Permission`, `RolePermission`, `UserRole`, `ProjectMember`.
- Backend Permission Middleware / Checkers kiểm soát 100% các endpoint CRUD.
- Cách ly dữ liệu: Người dùng chỉ được truy vấn và nhìn thấy các Notebook mà mình có quyền.
- Lệnh Bootstrap SuperAdmin an toàn (`manage.py bootstrap_superadmin`), bắt buộc đổi mật khẩu sau lần đăng nhập đầu tiên.

### Sub-project 4: Giao diện Bảng tính (Excel-like Table View) & Việt hóa (Phase 4)

- Tối ưu màn hình Spreadsheet/Table view: hiển thị các cột nghiệp vụ (Tên, Loại, Phòng ban, Trạng thái, Người phụ trách, Người hỗ trợ, Phòng, Ngày tạo...).
- Hỗ trợ sắp xếp, lọc, tìm kiếm và inline edit trực tiếp trên từng ô.
- Việt hóa toàn diện nhãn giao diện (i18n dictionary).
- Cập nhật logo, favicon, thương hiệu BWP-Notebook và ghi nhận bản quyền _by BWP Engineering Team_.

### Sub-project 5: Kiểm thử, Đóng gói & Nghiệm thu (Phase 5)

- Bộ kiểm thử tự động (Unit test nghiệp vụ backend, Integration test quyền API).
- Kiểm thử Docker build và triển khai sạch trên server Debian.
- Kiểm tra bảo mật: IDOR giữa các notebook, leo quyền, CORS/CSRF.
- Hoàn thiện tài liệu hướng dẫn cài đặt và vận hành bằng tiếng Việt.

---

## 6. Tiêu chuẩn Nghiệm thu Sub-project 1 (MVP Baseline)

1. Repository `https://github.com/bwpnora/BWP-Notebook-v2.git` chứa đầy đủ mã nguồn Plane `v1.4.2` trên nhánh `nora/main`.
2. Có workflow CI/CD `.github/workflows/ci-cd.yml` tham khảo từ `nora-device-mng-main`.
3. File cấu hình Docker Compose né hoàn toàn các port đang chạy trên server (`3000`, `5432-5434`, `3900-3903`, `80`).
4. Stack Plane baseline khởi chạy thành công trên `192.168.3.168:18080`, không làm ảnh hưởng đến bất kỳ container hiện có nào.
5. Tạo được Workspace công ty và Notebook phòng ban mẫu.
