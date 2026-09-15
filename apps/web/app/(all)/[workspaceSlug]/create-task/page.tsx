/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { useParams } from "next/navigation";
import { observer } from "mobx-react";
// i18n
import { useTranslation } from "@plane/i18n";
// components
import { PageHead } from "@/components/core/page-title";
import { MemberPortalHeader, MemberTaskForm } from "@/components/member-portal";

type CreateTaskPageProps = {
  params?: {
    workspaceSlug?: string;
  };
};

function CreateTaskPage(props: CreateTaskPageProps) {
  const params = useParams();
  const routeWorkspaceSlug = props?.params?.workspaceSlug;
  const workspaceSlug =
    routeWorkspaceSlug ||
    (Array.isArray(params?.workspaceSlug) ? params.workspaceSlug[0] : params?.workspaceSlug) ||
    "";

  const { currentLocale } = useTranslation();
  const isVietnamese = currentLocale === "vi-VN" || currentLocale?.startsWith("vi") || !currentLocale;

  return (
    <div className="bg-custom-background-90 flex min-h-screen flex-col">
      <PageHead title={isVietnamese ? "Tạo công việc mới - BWP Notebook" : "Create New Task - BWP Notebook"} />
      <MemberPortalHeader workspaceSlug={workspaceSlug} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="bg-custom-background-100 border-custom-border-200 shadow-sm rounded-lg border p-6">
          <div className="mb-6">
            <h2 className="text-custom-text-100 text-xl font-bold">
              {isVietnamese ? "Tạo công việc mới" : "Create New Task"}
            </h2>
            <p className="text-custom-text-300 text-sm mt-1">
              {isVietnamese
                ? "Nhập thông tin công việc cần giao hoặc yêu cầu vận hành cho phòng ban của bạn."
                : "Enter task details or operational requests for your department."}
            </p>
          </div>
          <MemberTaskForm workspaceSlug={workspaceSlug} />
        </div>
      </main>
    </div>
  );
}

export default observer(CreateTaskPage);
