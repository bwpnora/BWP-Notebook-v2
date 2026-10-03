/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { Outlet } from "react-router";
import { GlobalModals } from "@/components/common/modal/global";
import { MemberAutoCreateTaskModal } from "@/components/member-portal/member-auto-create-task-modal";
import { WorkspaceContentWrapper } from "@/components/workspace/content-wrapper";
import { WorkspaceAuthWrapper } from "@/layouts/auth-layout/workspace-wrapper";
import { AppRailVisibilityProvider } from "@/lib/app-rail";
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import type { Route } from "./+types/layout";

const WorkspaceInnerLayout = observer(function WorkspaceInnerLayout({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  const isCreateTaskRoute = Boolean(
    pathname === `/${workspaceSlug}/create-task` ||
    pathname === `/${workspaceSlug}/create-task/` ||
    pathname?.startsWith(`/${workspaceSlug}/create-task/`)
  );

  return isCreateTaskRoute ? (
    <>
      <GlobalModals workspaceSlug={workspaceSlug} />
      <MemberAutoCreateTaskModal workspaceSlug={workspaceSlug} />
      <Outlet />
    </>
  ) : (
    <AppRailVisibilityProvider>
      <WorkspaceContentWrapper>
        <GlobalModals workspaceSlug={workspaceSlug} />
        <MemberAutoCreateTaskModal workspaceSlug={workspaceSlug} />
        <Outlet />
      </WorkspaceContentWrapper>
    </AppRailVisibilityProvider>
  );
});

export default observer(function WorkspaceLayout(props: Route.ComponentProps) {
  const { workspaceSlug } = props.params;

  return (
    <AuthenticationWrapper>
      <WorkspaceAuthWrapper>
        <WorkspaceInnerLayout workspaceSlug={workspaceSlug} />
      </WorkspaceAuthWrapper>
    </AuthenticationWrapper>
  );
});
