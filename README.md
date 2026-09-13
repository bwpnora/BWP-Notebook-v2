<br /><br />

<p align="center">
<a href="https://plane.so">
  <img src="https://media.docs.plane.so/logo/plane_github_readme.png" alt="Plane Logo" width="400">
</a>
</p>
<p align="center"><b>Modern project management for all teams</b></p>

<p align="center">
    <a href="https://plane.so/"><b>Website</b></a> •
    <a href="https://forum.plane.so"><b>Forum</b></a> •
    <a href="https://x.com/planepowers"><b>X</b></a> •
    <a href="https://docs.plane.so/"><b>Documentation</b></a>
</p>

<p>
    <a href="https://app.plane.so/#gh-light-mode-only" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-top.webp"
        alt="Plane Screens"
        width="100%"
      />
    </a>
</p>

Meet [Plane](https://plane.so/), an open-source project management tool to track issues, run ~sprints~ cycles, and manage product roadmaps without the chaos of managing the tool itself. 🧘‍♀️

> Plane is evolving every day. Your suggestions, ideas, and reported bugs help us immensely. Do not hesitate to join in the conversation on [Forum](https://forum.plane.so) or raise a GitHub issue. We read everything and respond to most.

## 📖 Tài liệu Hướng dẫn Sử dụng & Vận hành (User Guide)

> **Bản phát hành Doanh nghiệp BWP Notebook 2.0**  
> **Kiến trúc & Phát triển:** Code & Architecture by IT Leon (BWP Engineering Team)  
> **Bản địa hóa:** Việt hóa 100% giao diện, quy trình tác nghiệp thực tiễn và nhật ký kiểm toán.

Hệ thống BWP Notebook được xây dựng và tùy biến chuyên sâu từ nền tảng Plane CE (v1.4.2) nhằm tối ưu hóa cho mô hình quản trị công việc và vận hành doanh nghiệp Việt Nam.

Toàn bộ hệ thống tài liệu hướng dẫn vận hành, quản trị phân quyền và khắc phục sự cố đã được biên soạn chi tiết:

- **[Sổ Tay Vận Hành Hợp Nhất (USER_GUIDE_VI.md)](./USER_GUIDE_VI.md)**: Cẩm nang hoàn chỉnh 5 chương bao gồm ma trận phân quyền RBAC, sơ đồ quy trình Mermaid, kịch bản sao lưu tự động và hướng dẫn xử lý sự cố.
- **Thư mục Hướng dẫn Chuyên đề (`docs/user-guide/`)**:
  - [Chương 1: Tổng Quan và Khởi Động Hệ Thống (`docs/user-guide/01-TONG-QUAN-VA-KHOI-DONG.md`)](./docs/user-guide/01-TONG-QUAN-VA-KHOI-DONG.md)
  - [Chương 2: Quản Lý Tài Khoản và Phân Quyền RBAC (`docs/user-guide/02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md`)](./docs/user-guide/02-TAI-KHOAN-VA-PHAN-QUYEN-RBAC.md)
  - [Chương 3: Quản Lý Công Ty và Sổ Tay Phòng Ban (`docs/user-guide/03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md`)](./docs/user-guide/03-QUAN-LY-CONG-TY-VA-NOTEBOOK.md)
  - [Chương 4: Quy Trình Xử Lý và Điều Hành Công Việc (`docs/user-guide/04-QUY-TRINH-XU-LY-CONG-VIEC.md`)](./docs/user-guide/04-QUY-TRINH-XU-LY-CONG-VIEC.md)
  - [Chương 5: Nhật Ký Hoạt Động, Kiểm Toán và Quản Trị Hệ Thống (`docs/user-guide/05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md`)](./docs/user-guide/05-NHAT-KY-HOAT-DONG-VA-QUAN-TRI.md)

### ✨ Tính Năng Doanh Nghiệp Tùy Biến (Custom Enterprise Capabilities)

- **Đa nhân sự hỗ trợ (`Supporters`):** Hỗ trợ phân bổ một người phụ trách chính kèm danh sách nhiều kỹ sư/nhân viên phối hợp giải quyết sự cố tại hiện trường.
- **Định danh số phòng & khu vực (`Room`):** Gắn mã phòng, căn hộ hoặc vị trí mặt bằng vào từng công việc, hỗ trợ tra cứu lịch sử sự cố theo phòng tức thì.
- **Ghi chú nội bộ bảo mật (`Notes`):** Cho phép ghi lại các hướng dẫn kỹ thuật, dặn dò ca trực bảo mật giữa các nhân sự xử lý.
- **Dấu vết kiểm toán tiếng Việt (`Activity & Audit Log`):** Toàn bộ lịch sử thêm bớt nhân sự, cập nhật số phòng, chuyển giao công việc được ghi nhận tự động bằng tiếng Việt chuẩn mực.
- **Mô hình Bảng tính lưới (`Spreadsheet-first`):** Giao diện bảng làm việc trực quan tương tự Excel, hỗ trợ chỉnh sửa nhanh trực tiếp tại ô (Inline Edit).
- **Phân vùng dữ liệu phòng ban (`Department Partitioning`):** Cô lập thông tin an toàn giữa các phòng ban chức năng, phân cấp 4 vai trò rõ ràng theo chuẩn RBAC.

## 🚀 Installation

Getting started with Plane is simple. Choose the setup that works best for you:

- **Plane Cloud**
  Sign up for a free account on [Plane Cloud](https://app.plane.so)—it's the fastest way to get up and running without worrying about infrastructure.

- **Self-host Plane**
  Prefer full control over your data and infrastructure? Install and run Plane on your own servers. Follow our detailed [deployment guides](https://developers.plane.so/self-hosting/overview) to get started.

| Installation methods | Docs link                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker               | [![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://developers.plane.so/self-hosting/methods/docker-compose)         |
| Kubernetes           | [![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)](https://developers.plane.so/self-hosting/methods/kubernetes) |
| Managed hosting      | [<img alt="Deploy with Zenith" src="https://cdn.zenith.hosting/buttons/deploy-with-zenith.svg" height="40">](https://zenith.hosting/host/plane)                                         |

`Instance admins` can configure instance settings with [God mode](https://developers.plane.so/self-hosting/govern/instance-admin).

## 🌟 Features

- **Work Items**
  Efficiently create and manage tasks with a robust rich text editor that supports file uploads. Enhance organization and tracking by adding sub-properties and referencing related issues.

- **Cycles**
  Maintain your team’s momentum with Cycles. Track progress effortlessly using burn-down charts and other insightful tools.

- **Modules**
  Simplify complex projects by dividing them into smaller, manageable modules.

- **Views**
  Customize your workflow by creating filters to display only the most relevant issues. Save and share these views with ease.

- **Pages**
  Capture and organize ideas using Plane Pages, complete with AI capabilities and a rich text editor. Format text, insert images, add hyperlinks, or convert your notes into actionable items.

- **Analytics**
  Access real-time insights across all your Plane data. Visualize trends, remove blockers, and keep your projects moving forward.

## 🛠️ Local development

See [CONTRIBUTING](./CONTRIBUTING.md)

## ⚙️ Built with

[![React Router](https://img.shields.io/badge/-React%20Router-CA4245?logo=react-router&style=for-the-badge&logoColor=white)](https://reactrouter.com/)
[![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=green)](https://www.djangoproject.com/)
[![Node JS](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)](https://nodejs.org/en)

## 📸 Screenshots

  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-work-items.webp"
        alt="Plane Views"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-cycles.webp"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-modules.webp"
        alt="Plane Cycles and Modules"
        width="100%"
      />
    </a>
  </p>
  <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-views.webp"
        alt="Plane Analytics"
        width="100%"
      />
    </a>
  </p>
   <p>
    <a href="https://plane.so" target="_blank">
      <img
        src="https://media.docs.plane.so/GitHub-readme/github-analytics.webp"
        alt="Plane Pages"
        width="100%"
      />
    </a>
  </p>
</p>

## 📝 Documentation

- **Sổ tay Vận hành Doanh nghiệp:** Tham khảo **[Sổ Tay Vận Hành BWP Notebook (USER_GUIDE_VI.md)](./USER_GUIDE_VI.md)** và 5 chuyên đề tại [`docs/user-guide/`](./docs/user-guide/).
- **Tài liệu Kỹ thuật Nền tảng:** Explore Plane's [product documentation](https://docs.plane.so/) and [developer documentation](https://developers.plane.so/) to learn about baseline features, setup, and usage.

## ❤️ Community

Join the Plane community on [GitHub Discussions](https://github.com/orgs/makeplane/discussions) and our [Forum](https://forum.plane.so). We follow a [Code of conduct](https://github.com/makeplane/plane/blob/master/CODE_OF_CONDUCT.md) in all our community channels.

Feel free to ask questions, report bugs, participate in discussions, share ideas, request features, or showcase your projects. We’d love to hear from you!

## 🛡️ Security

If you discover a security vulnerability in Plane, please report it responsibly instead of opening a public issue. We take all legitimate reports seriously and will investigate them promptly. See [Security policy](https://github.com/makeplane/plane/blob/master/SECURITY.md) for more info.

To disclose any security issues, please email us at security@plane.so.

## 🤝 Contributing

There are many ways you can contribute to Plane:

- Report [bugs](https://github.com/makeplane/plane/issues/new?assignees=srinivaspendem%2Cpushya22&labels=%F0%9F%90%9Bbug&projects=&template=--bug-report.yaml&title=%5Bbug%5D%3A+) or submit [feature requests](https://github.com/makeplane/plane/issues/new?assignees=srinivaspendem%2Cpushya22&labels=%E2%9C%A8feature&projects=&template=--feature-request.yaml&title=%5Bfeature%5D%3A+).
- Review the [documentation](https://docs.plane.so/) and submit [pull requests](https://github.com/makeplane/docs) to improve it—whether it's fixing typos or adding new content.
- Talk or write about Plane or any other ecosystem integration and [let us know](https://forum.plane.so)!
- Show your support by upvoting [popular feature requests](https://github.com/makeplane/plane/issues).

Please read [CONTRIBUTING.md](https://github.com/makeplane/plane/blob/master/CONTRIBUTING.md) for details on the process for submitting pull requests to us.

### Repo activity

![Plane Repo Activity](https://repobeats.axiom.co/api/embed/2523c6ed2f77c082b7908c33e2ab208981d76c39.svg "Repobeats analytics image")

### We couldn't have done this without you.

<a href="https://github.com/makeplane/plane/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=makeplane/plane" />
</a>

## License

This project is licensed under the [GNU Affero General Public License v3.0](https://github.com/makeplane/plane/blob/master/LICENSE.txt).
