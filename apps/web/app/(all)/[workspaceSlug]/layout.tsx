/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { usePathname, useRouter } from "next/navigation";
import { Outlet } from "react-router";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { GlobalModals } from "@/components/common/modal/global";
import { WorkspaceContentWrapper } from "@/components/workspace/content-wrapper";
import { useMemberRole } from "@/hooks/use-member-role";
import { WorkspaceAuthWrapper } from "@/layouts/auth-layout/workspace-wrapper";
import { AppRailVisibilityProvider } from "@/lib/app-rail";
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import type { Route } from "./+types/layout";

export default observer(function WorkspaceLayout(props: Route.ComponentProps) {
  const { workspaceSlug } = props.params;
  const pathname = usePathname();
  const router = useRouter();
  const { isMemberOnly, isLoading } = useMemberRole(workspaceSlug);

  const isCreateTaskRoute = Boolean(pathname?.includes("/create-task"));

  // Route guard: intercept Member accounts navigating away from /create-task
  useEffect(() => {
    if (!isLoading && isMemberOnly && !isCreateTaskRoute) {
      router.replace(`/${workspaceSlug}/create-task`);
    }
  }, [isLoading, isMemberOnly, isCreateTaskRoute, workspaceSlug, router]);

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

  // Loading/hydration guard to avoid flash of protected routes before redirect
  if (!isLoading && isMemberOnly && !isCreateTaskRoute) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoSpinner />
        </div>
      </div>
    );
  }

  return (
    <AuthenticationWrapper>
      <WorkspaceAuthWrapper>
        {isCreateTaskRoute ? (
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
        )}
      </WorkspaceAuthWrapper>
    </AuthenticationWrapper>
  );
});
