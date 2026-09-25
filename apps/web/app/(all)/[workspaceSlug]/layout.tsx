/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { Outlet } from "react-router";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { GlobalModals } from "@/components/common/modal/global";
import { WorkspaceContentWrapper } from "@/components/workspace/content-wrapper";
import { useMemberRole } from "@/hooks/use-member-role";
import { WorkspaceAuthWrapper } from "@/layouts/auth-layout/workspace-wrapper";
import { AppRailVisibilityProvider } from "@/lib/app-rail";
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import CreateTaskPage from "./create-task/page";
import type { Route } from "./+types/layout";

const WorkspaceInnerLayout = observer(function WorkspaceInnerLayout({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const { isMemberOnly, isLoading } = useMemberRole(workspaceSlug);

  const isCreateTaskRoute = Boolean(
    pathname === `/${workspaceSlug}/create-task` ||
    pathname === `/${workspaceSlug}/create-task/` ||
    pathname?.startsWith(`/${workspaceSlug}/create-task/`)
  );

  // Sync browser URL to /create-task if a Member lands on any other route
  useEffect(() => {
    if (!isLoading && isMemberOnly && !isCreateTaskRoute) {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/${workspaceSlug}/create-task`);
      }
    }
  }, [isLoading, isMemberOnly, isCreateTaskRoute, workspaceSlug]);

  // Shortcut interceptor: suppress Cmd+K / Ctrl+K keyboard shortcuts for Member accounts
  useEffect(() => {
    if (!isMemberOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isMemberOnly]);

  // 1. Loading state: while user role / project permissions are resolving
  if (isLoading) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoSpinner />
        </div>
      </div>
    );
  }

  // 2. Member accounts: strictly render the dedicated task creation form.
  // NEVER mount WorkspaceContentWrapper, AppRailVisibilityProvider, sidebar, or Outlet.
  if (isMemberOnly) {
    return (
      <>
        <GlobalModals workspaceSlug={workspaceSlug} />
        <CreateTaskPage params={{ workspaceSlug }} />
      </>
    );
  }

  // 3. Admin, Department Admin & SuperAdmin accounts: full workspace access
  return isCreateTaskRoute ? (
    <>
      <GlobalModals workspaceSlug={workspaceSlug} />
      <Outlet />
    </>
  ) : (
    <AppRailVisibilityProvider>
      <WorkspaceContentWrapper>
        <GlobalModals workspaceSlug={workspaceSlug} />
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
