# Kế hoạch Thực hiện: Việt hóa Toàn diện Hệ thống & Bộ Tài liệu Hướng dẫn Sử dụng (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để lỗi nạp mã khóa dịch thô i18n trên giao diện web, thiết lập tiếng Việt (vi-VN) mặc định kèm thuật ngữ doanh nghiệp chuẩn hóa, và phát hành bộ tài liệu Hướng dẫn sử dụng & Vận hành hoàn chỉnh (docs/user-guide/ và USER_GUIDE_VI.md).

**Architecture:** Thay thế cơ chế nạp động theo chuỗi biến trong `@plane/i18n` bằng cơ chế tĩnh (Static Pre-bundling cho `vi-VN` và `en` kết hợp Dynamic Registry cho các ngôn ngữ khác), đặt `FALLBACK_LANGUAGE = "vi-VN"` và backend profile default `"vi-VN"`. Biên soạn bộ tài liệu vận hành 5 chuyên đề tại `docs/user-guide/` và hợp nhất tại `USER_GUIDE_VI.md`.

**Tech Stack:** TypeScript, React Router 7, Vite, i18next, react-i18next, i18next-icu, Django REST Framework, Docker, Markdown.

**Spec:** [`docs/superpowers/specs/2026-09-13-vietnamese-localization-and-user-guide-design.md`](file:///c:/Code/nora-notebook/docs/superpowers/specs/2026-09-13-vietnamese-localization-and-user-guide-design.md)

## Global Constraints

- Credit Attribution: Mọi file mã nguồn tùy biến và tài liệu mới ghi nhận: **"Code & Architecture by IT Leon"**.
- Bản quyền: Giữ nguyên header bản quyền AGPL-3.0 và Makeplane Inc.
- Không thay đổi tên bảng/entity cốt lõi trong database (`Workspace`, `Project`, `Issue`). Ánh xạ nghiệp vụ thực hiện ở tầng i18n UI.
- Đảm bảo strict type checking (`pnpm check:types`) và linting (`pnpm check:lint`) vượt qua không có lỗi.

---

### Task 1: Khắc phục Cơ chế Nạp i18n & Đóng gói Tĩnh Tài nguyên Cốt lõi

**Files:**

- Create: `packages/i18n/src/locales/resources.ts`
- Create: `packages/i18n/src/locales/registry.ts`
- Modify: `packages/i18n/src/constants/language.ts`
- Modify: `packages/i18n/src/core/instance.ts`
- Delete: `packages/i18n/locales` (symlink text file)
- Test: `packages/i18n/src/core/instance.test.ts`

**Interfaces:**

- Consumes: JSON files in `packages/i18n/src/locales/vi-VN/*.json` and `packages/i18n/src/locales/en/*.json`
- Produces:
  - `coreResources: Record<"vi-VN" | "en", Record<string, Record<string, any>>>`
  - `dynamicLocaleLoaders: Record<string, Record<string, () => Promise<any>>>`
  - `FALLBACK_LANGUAGE = "vi-VN"`

- [ ] **Step 1: Xóa symlink hỏng và tạo tệp tài nguyên tĩnh `resources.ts`**

Xóa tệp symlink `packages/i18n/locales`. Tạo `packages/i18n/src/locales/resources.ts` import tĩnh toàn bộ 28 namespace của `vi-VN` và `en`:

```typescript
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 * Customized & Developed by IT Leon
 */

// vi-VN namespaces
import viAccessibility from "./vi-VN/accessibility.json";
import viAuth from "./vi-VN/auth.json";
import viAutomation from "./vi-VN/automation.json";
import viCommon from "./vi-VN/common.json";
import viCycle from "./vi-VN/cycle.json";
import viEditor from "./vi-VN/editor.json";
import viEmptyState from "./vi-VN/empty-state.json";
import viHome from "./vi-VN/home.json";
import viInbox from "./vi-VN/inbox.json";
import viIntegration from "./vi-VN/integration.json";
import viModule from "./vi-VN/module.json";
import viNavigation from "./vi-VN/navigation.json";
import viNotification from "./vi-VN/notification.json";
import viPage from "./vi-VN/page.json";
import viPowerK from "./vi-VN/power-k.json";
import viProjectSettings from "./vi-VN/project-settings.json";
import viProject from "./vi-VN/project.json";
import viSettings from "./vi-VN/settings.json";
import viStickies from "./vi-VN/stickies.json";
import viTemplate from "./vi-VN/template.json";
import viTour from "./vi-VN/tour.json";
import viUpdate from "./vi-VN/update.json";
import viWiki from "./vi-VN/wiki.json";
import viWorkItemType from "./vi-VN/work-item-type.json";
import viWorkItem from "./vi-VN/work-item.json";
import viWorkflow from "./vi-VN/workflow.json";
import viWorkspaceSettings from "./vi-VN/workspace-settings.json";
import viWorkspace from "./vi-VN/workspace.json";

// en namespaces
import enAccessibility from "./en/accessibility.json";
import enAuth from "./en/auth.json";
import enAutomation from "./en/automation.json";
import enCommon from "./en/common.json";
import enCycle from "./en/cycle.json";
import enEditor from "./en/editor.json";
import enEmptyState from "./en/empty-state.json";
import enHome from "./en/home.json";
import enInbox from "./en/inbox.json";
import enIntegration from "./en/integration.json";
import enModule from "./en/module.json";
import enNavigation from "./en/navigation.json";
import enNotification from "./en/notification.json";
import enPage from "./en/page.json";
import enPowerK from "./en/power-k.json";
import enProjectSettings from "./en/project-settings.json";
import enProject from "./en/project.json";
import enSettings from "./en/settings.json";
import enStickies from "./en/stickies.json";
import enTemplate from "./en/template.json";
import enTour from "./en/tour.json";
import enUpdate from "./en/update.json";
import enWiki from "./en/wiki.json";
import enWorkItemType from "./en/work-item-type.json";
import enWorkItem from "./en/work-item.json";
import enWorkflow from "./en/workflow.json";
import enWorkspaceSettings from "./en/workspace-settings.json";
import enWorkspace from "./en/workspace.json";

export const coreResources: Record<string, Record<string, any>> = {
  "vi-VN": {
    accessibility: viAccessibility,
    auth: viAuth,
    automation: viAutomation,
    common: viCommon,
    cycle: viCycle,
    editor: viEditor,
    "empty-state": viEmptyState,
    home: viHome,
    inbox: viInbox,
    integration: viIntegration,
    module: viModule,
    navigation: viNavigation,
    notification: viNotification,
    page: viPage,
    "power-k": viPowerK,
    "project-settings": viProjectSettings,
    project: viProject,
    settings: viSettings,
    stickies: viStickies,
    template: viTemplate,
    tour: viTour,
    update: viUpdate,
    wiki: viWiki,
    "work-item-type": viWorkItemType,
    "work-item": viWorkItem,
    workflow: viWorkflow,
    "workspace-settings": viWorkspaceSettings,
    workspace: viWorkspace,
  },
  en: {
    accessibility: enAccessibility,
    auth: enAuth,
    automation: enAutomation,
    common: enCommon,
    cycle: enCycle,
    editor: enEditor,
    "empty-state": enEmptyState,
    home: enHome,
    inbox: enInbox,
    integration: enIntegration,
    module: enModule,
    navigation: enNavigation,
    notification: enNotification,
    page: enPage,
    "power-k": enPowerK,
    "project-settings": enProjectSettings,
    project: enProject,
    settings: enSettings,
    stickies: enStickies,
    template: enTemplate,
    tour: enTour,
    update: enUpdate,
    wiki: enWiki,
    "work-item-type": enWorkItemType,
    "work-item": enWorkItem,
    workflow: enWorkflow,
    "workspace-settings": enWorkspaceSettings,
    workspace: enWorkspace,
  },
};
```

- [ ] **Step 2: Tạo tệp `registry.ts` cho nạp động các ngôn ngữ phụ**

Tạo `packages/i18n/src/locales/registry.ts`:

```typescript
/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 * Customized & Developed by IT Leon
 */

export const dynamicLocaleLoaders: Record<string, Record<string, () => Promise<any>>> = {
  fr: {
    accessibility: () => import("./fr/accessibility.json"),
    auth: () => import("./fr/auth.json"),
    automation: () => import("./fr/automation.json"),
    common: () => import("./fr/common.json"),
    cycle: () => import("./fr/cycle.json"),
    editor: () => import("./fr/editor.json"),
    "empty-state": () => import("./fr/empty-state.json"),
    home: () => import("./fr/home.json"),
    inbox: () => import("./fr/inbox.json"),
    integration: () => import("./fr/integration.json"),
    module: () => import("./fr/module.json"),
    navigation: () => import("./fr/navigation.json"),
    notification: () => import("./fr/notification.json"),
    page: () => import("./fr/page.json"),
    "power-k": () => import("./fr/power-k.json"),
    "project-settings": () => import("./fr/project-settings.json"),
    project: () => import("./fr/project.json"),
    settings: () => import("./fr/settings.json"),
    stickies: () => import("./fr/stickies.json"),
    template: () => import("./fr/template.json"),
    tour: () => import("./fr/tour.json"),
    update: () => import("./fr/update.json"),
    wiki: () => import("./fr/wiki.json"),
    "work-item-type": () => import("./fr/work-item-type.json"),
    "work-item": () => import("./fr/work-item.json"),
    workflow: () => import("./fr/workflow.json"),
    "workspace-settings": () => import("./fr/workspace-settings.json"),
    workspace: () => import("./fr/workspace.json"),
  },
  // Các ngôn ngữ khác tương tự
};
```

- [ ] **Step 3: Cập nhật `FALLBACK_LANGUAGE` và cấu hình `instance.ts`**

Trong `packages/i18n/src/constants/language.ts`:
Thay `export const FALLBACK_LANGUAGE: TLanguage = "en";` thành `export const FALLBACK_LANGUAGE: TLanguage = "vi-VN";`.

Trong `packages/i18n/src/core/instance.ts`:
Tích hợp `coreResources` và `dynamicLocaleLoaders`:

```typescript
import { coreResources } from "../locales/resources";
import { dynamicLocaleLoaders } from "../locales/registry";

export const i18nInstance: I18nInstance = i18n.createInstance();

i18nInstance
  .use(ICU)
  .use(initReactI18next)
  .use(
    resourcesToBackend(async (language: string, namespace: string) => {
      if (coreResources[language]?.[namespace]) {
        return coreResources[language][namespace];
      }
      const loader = dynamicLocaleLoaders[language]?.[namespace];
      if (loader) {
        const mod = await loader();
        return mod.default || mod;
      }
      return {};
    })
  );
```

- [ ] **Step 4: Kiểm tra biên dịch gói `@plane/i18n`**

Chạy lệnh: `pnpm --filter=@plane/i18n build`
Kỳ vọng: Biên dịch thành công ra `packages/i18n/dist/index.js` mà không có lỗi TypeScript hay cảnh báo dynamic import.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/locales/resources.ts packages/i18n/src/locales/registry.ts packages/i18n/src/constants/language.ts packages/i18n/src/core/instance.ts packages/i18n/locales
git commit -m "fix(i18n): pre-bundle core vi-VN and en resources and fix dynamic loader - Code by IT Leon"
```

---

### Task 2: Chuẩn hóa Thuật ngữ Nghiệp vụ trong các Tệp JSON `vi-VN`

**Files:**

- Modify: `packages/i18n/src/locales/vi-VN/home.json`
- Modify: `packages/i18n/src/locales/vi-VN/workspace.json`
- Modify: `packages/i18n/src/locales/vi-VN/workspace-settings.json`
- Modify: `packages/i18n/src/locales/vi-VN/project.json`
- Modify: `packages/i18n/src/locales/vi-VN/project-settings.json`
- Modify: `packages/i18n/src/locales/vi-VN/work-item.json`
- Modify: `packages/i18n/src/locales/vi-VN/work-item-type.json`
- Modify: `packages/i18n/src/locales/vi-VN/common.json`

**Interfaces:**

- Consumes: Mapping từ `brief-plane-combined.txt`
- Produces: Chuẩn hóa chuỗi dịch hiển thị cho toàn bộ giao diện

- [ ] **Step 1: Cập nhật `home.json` (Dashboard và Quickstart Guide)**

Đồng bộ các chuỗi giao diện trang chủ:

- `home.empty.quickstart_guide` $\rightarrow$ "Hướng dẫn khởi đầu nhanh"
- `home.empty.create_project.title` $\rightarrow$ "Tạo phòng ban / Notebook"
- `home.empty.create_project.description` $\rightarrow$ "Trong BWP Notebook, mọi công việc đều được quản lý theo phòng ban."
- `home.empty.invite_team.title` $\rightarrow$ "Mời nhân sự vào hệ thống"
- `home.empty.invite_team.description` $\rightarrow$ "Cộng tác, phân công và xử lý công việc cùng đồng nghiệp."
- `home.empty.configure_workspace.title` $\rightarrow$ "Cấu hình đơn vị / công ty"
- `home.empty.personalize_account.title` $\rightarrow$ "Cá nhân hóa tài khoản"

- [ ] **Step 2: Cập nhật `workspace.json`, `workspace-settings.json`**

Thay thế các từ "Không gian làm việc" thành "Công ty / Đơn vị" hoặc "Đơn vị".
Cập nhật: "Tạo đơn vị mới", "Cài đặt đơn vị", "Thành viên đơn vị".

- [ ] **Step 3: Cập nhật `project.json`, `project-settings.json`**

Thay thế các từ "Dự án" thành "Phòng ban / Notebook" hoặc "Phòng ban".
Cập nhật: "Tạo phòng ban", "Danh sách phòng ban", "Cài đặt phòng ban", "Thành viên phòng ban".

- [ ] **Step 4: Cập nhật `work-item.json`, `work-item-type.json`**

Thay thế các từ "Mục công việc / Vấn đề" thành "Công việc".
Bổ sung các nhãn trường tùy biến:

- `Người phụ trách` (Assignee)
- `Người hỗ trợ` (Supporters)
- `Số phòng / Khu vực` (Room)
- `Ghi chú nội bộ` (Notes)
- `Loại công việc vận hành` & `Công việc khác` (Work Item Types)

- [ ] **Step 5: Kiểm tra tính hợp lệ của cú pháp JSON**

Chạy lệnh node kiểm tra parse toàn bộ file JSON:
`node -e "const fs = require('fs'); ['home','workspace','project','work-item'].forEach(n => JSON.parse(fs.readFileSync('packages/i18n/src/locales/vi-VN/' + n + '.json'))); console.log('JSON valid');"`
Kỳ vọng: In ra "JSON valid".

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/locales/vi-VN/
git commit -m "feat(i18n): align vi-VN locale files with corporate terminology - Code by IT Leon"
```

---

### Task 3: Cập nhật Ngôn ngữ Mặc định Backend (`apps/api`)

**Files:**

- Modify: `apps/api/plane/db/models/user.py`
- Test: `apps/api/plane/db/models/tests/test_user.py` (hoặc kiểm tra model qua Django command)

**Interfaces:**

- Consumes: `Profile` model trong `apps/api/plane/db/models/user.py`
- Produces: Default `language = "vi-VN"` cho tài khoản mới

- [ ] **Step 1: Cập nhật trường `language` trong model Profile**

Sửa dòng 251 trong `apps/api/plane/db/models/user.py`:

```python
    # language
    language = models.CharField(max_length=255, default="vi-VN")
```

- [ ] **Step 2: Kiểm tra cú pháp Python**

Chạy: `python -m py_compile apps/api/plane/db/models/user.py`
Kỳ vọng: Exit code 0 không có lỗi cú pháp.

- [ ] **Step 3: Commit**

```bash
git add apps/api/plane/db/models/user.py
git commit -m "feat(api): set default user profile language to vi-VN - Code by IT Leon"
```

---

### Task 4: Tái Biên dịch & Xác thực Gói Web (`apps/web`)

**Files:**

- Modify: `packages/i18n/dist/*` (thông qua build)
- Modify: `apps/web/build/*` (thông qua build)

**Interfaces:**

- Consumes: `@plane/i18n`
- Produces: `apps/web/build/client` với bản dịch tiếng Việt tích hợp sẵn

- [ ] **Step 1: Re-build `@plane/i18n`**

Chạy: `pnpm --filter=@plane/i18n build`
Kỳ vọng: `packages/i18n/dist/index.js` được tạo mới thành công.

- [ ] **Step 2: Re-build `apps/web`**

Chạy: `pnpm --filter=web build`
Kỳ vọng: `apps/web/build/client/assets/` được sinh ra không có lỗi biên dịch.

- [ ] **Step 3: Kiểm tra tệp bundle client có chứa chuỗi tiếng Việt**

Chạy lệnh kiểm tra chuỗi tiếng Việt trong client bundle:
`node -e "const fs = require('fs'); const dir = 'apps/web/build/client/assets'; let found = false; for (const f of fs.readdirSync(dir)) { if (f.endsWith('.js')) { const s = fs.readFileSync(dir + '/' + f, 'utf8'); if (s.includes('Hướng dẫn khởi đầu nhanh')) { console.log('Found in', f); found = true; break; } } } if (!found) process.exit(1);"`
Kỳ vọng: Tìm thấy chuỗi "Hướng dẫn khởi đầu nhanh" trong bundle client.

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/
git commit -m "chore(web): update i18n bundle with verified Vietnamese resources - Code by IT Leon"
```

---

### Task 5: Soạn thảo Hướng dẫn Vận hành Module 1 & 2 (`docs/user-guide/`)

**Files:**

- Create: `docs/user-guide/01-TONG-QUAN-VA-KHOI-DONG.md`
- Create: `docs/user-guide/02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md`

**Interfaces:**

- Consumes: Tài liệu kiến trúc `brief-plane-combined.txt` và `docker-compose.prod.yml`
- Produces: 2 chương tài liệu vận hành ban đầu

- [ ] **Step 1: Soạn `01-TONG-QUAN-VA-KHOI-DONG.md`**

Nội dung bao gồm:

- Mục tiêu và vai trò của BWP Notebook trong doanh nghiệp.
- Kiến trúc các service: `plane-db`, `plane-redis`, `plane-mq`, `plane-minio`, `api`, `worker`, `beat-worker`, `web`.
- Quy trình khởi chạy môi trường sản xuất (`docker-compose.prod.yml`).
- Quy trình khởi tạo tài khoản SuperAdmin mặc định và đổi mật khẩu bắt buộc sau lần đăng nhập đầu tiên.

- [ ] **Step 2: Soạn `02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md`**

Nội dung bao gồm:

- Định nghĩa 4 cấp vai trò: **SuperAdmin**, **Quản trị viên đơn vị (Admin)**, **Thành viên (Member)**, **Khách (Guest)**.
- **Bảng ma trận phân quyền chi tiết (RBAC Matrix)**: Quyền trên Tài khoản, Quyền trên Đơn vị, Quyền trên Phòng ban/Notebook, Quyền trên Công việc, Quyền trên Nhật ký hoạt động.
- Quy tắc cô lập dữ liệu theo phòng ban: Nhân sự chỉ thấy dữ liệu phòng ban mình tham gia; SuperAdmin có quyền kiểm soát tập trung.
- Quy trình gửi lời mời và gán vai trò an toàn.

- [ ] **Step 3: Kiểm tra format Markdown**

Chạy: `pnpm exec oxfmt --check docs/user-guide/01-TONG-QUAN-VA-KHOI-DONG.md docs/user-guide/02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md`
Kỳ vọng: Format đạt chuẩn.

- [ ] **Step 4: Commit**

```bash
git add docs/user-guide/01-TONG-QUAN-VA-KHOI-DONG.md docs/user-guide/02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md
git commit -m "docs(guide): add chapters 1 and 2 for system setup and RBAC - Code by IT Leon"
```

---

### Task 6: Soạn thảo Hướng dẫn Vận hành Module 3, 4 & 5 (`docs/user-guide/`)

**Files:**

- Create: `docs/user-guide/03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md`
- Create: `docs/user-guide/04-QUY-TRINH-XU-LY-CONG-VIEC.md`
- Create: `docs/user-guide/05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md`

**Interfaces:**

- Consumes: Nghiệp vụ công việc tùy biến (Supporters, Room, Notes, Activity log)
- Produces: 3 chương tài liệu nghiệp vụ chi tiết

- [ ] **Step 1: Soạn `03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md`**

Nội dung:

- Quản trị Công ty / Đơn vị: Cấu hình tên, nhận diện, múi giờ.
- Tạo mới và quản trị Phòng ban / Notebook (Kỹ thuật, Kế toán, Nhân sự, Vận hành...).
- Cấu hình trạng thái công việc (Workflow States).
- Chính sách đóng băng và lưu trữ (Archive/Soft delete) bảo toàn dữ liệu.

- [ ] **Step 2: Soạn `04-QUY-TRINH-XU-LY-CONG-VIEC.md`**

Nội dung:

- Quy trình tạo và phân công công việc: Người phụ trách, Người hỗ trợ, Số phòng / Khu vực, Ghi chú nội bộ.
- Phân loại công việc: Công việc vận hành vs Công việc khác.
- Các chế độ hiển thị: Danh sách, Bảng Kanban, Bảng tính lưới Spreadsheet, Lịch.
- Cập nhật trạng thái, tiến độ và bình luận trao đổi.

- [ ] **Step 3: Soạn `05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md`**

Nội dung:

- Theo dõi và kiểm toán qua Nhật ký hoạt động (Activity & Audit Log tiếng Việt).
- Hướng dẫn sao lưu cơ sở dữ liệu (PostgreSQL dump) và khôi phục khi gặp sự cố.
- Danh mục câu hỏi thường gặp (FAQs) và cách xử lý lỗi cơ bản.

- [ ] **Step 4: Kiểm tra format Markdown**

Chạy: `pnpm exec oxfmt --check docs/user-guide/03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md docs/user-guide/04-QUY-TRINH-XU-LY-CONG-VIEC.md docs/user-guide/05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md`
Kỳ vọng: Format đạt chuẩn.

- [ ] **Step 5: Commit**

```bash
git add docs/user-guide/03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md docs/user-guide/04-QUY-TRINH-XU-LY-CONG-VIEC.md docs/user-guide/05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md
git commit -m "docs(guide): add chapters 3, 4, and 5 for operations, workflow, and auditing - Code by IT Leon"
```

---

### Task 7: Hợp nhất Sổ tay Hướng dẫn Sử dụng (`USER_GUIDE_VI.md`) & Cập nhật `README.md`

**Files:**

- Create: `USER_GUIDE_VI.md` (Root Handbook)
- Modify: `README.md`

**Interfaces:**

- Consumes: 5 chương trong `docs/user-guide/`
- Produces: Sổ tay toàn diện sẵn sàng cho người dùng cuối và đào tạo nội bộ

- [ ] **Step 1: Tạo tệp `USER_GUIDE_VI.md` tại thư mục gốc**

Hợp nhất toàn bộ 5 chuyên đề thành một tài liệu duy nhất, có:

- Trang bìa & Thông tin bản quyền / Tác quyền: "Tài liệu Hướng dẫn Sử dụng BWP Notebook - Code & Architecture by IT Leon".
- Mục lục liên kết neo (Anchor links) dẫn trực tiếp đến từng chương và mục con.
- Bảng biểu ma trận RBAC, sơ đồ quy trình dạng Mermaid và các hộp thông tin chú ý (`> [!NOTE]`, `> [!IMPORTANT]`, `> [!TIP]`).
- Tối ưu định dạng cho việc in ấn hoặc lưu thành PDF.

- [ ] **Step 2: Cập nhật `README.md`**

Thêm mục "Tài liệu Hướng dẫn Sử dụng" trong `README.md` trỏ đến `USER_GUIDE_VI.md` và `docs/user-guide/`.

- [ ] **Step 3: Kiểm tra định dạng và liên kết**

Chạy: `pnpm exec oxfmt USER_GUIDE_VI.md README.md`
Kiểm tra tính hợp lệ của các liên kết neo.

- [ ] **Step 4: Commit**

```bash
git add USER_GUIDE_VI.md README.md
git commit -m "docs(guide): add consolidated USER_GUIDE_VI handbook and link from README - Code by IT Leon"
```
