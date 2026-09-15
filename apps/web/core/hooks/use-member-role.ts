/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import { useWorkspace } from "@/hooks/store/use-workspace";

export interface IUseMemberRoleResult {
  isMemberOnly: boolean;
  isAdminOrAbove: boolean;
  isLoading: boolean;
}

/**
 * Hook to determine if the current user is strictly a Member (role <= 15)
 * without Admin or SuperAdmin privileges.
 */
export const useMemberRole = (workspaceSlug?: string): IUseMemberRoleResult => {
  const { data: currentUser, isLoading: isUserLoading } = useUser();
  const {
    isSuperAdmin: storeIsSuperAdmin,
    getWorkspaceRoleByWorkspaceSlug,
    allowPermissions,
    workspaceUserInfo,
    loader: permissionsLoader,
  } = useUserPermissions();
  const { currentWorkspace, getWorkspaceBySlug } = useWorkspace();

  const activeWorkspaceSlug = workspaceSlug || currentWorkspace?.slug;
  const workspace = activeWorkspaceSlug
    ? (getWorkspaceBySlug(activeWorkspaceSlug) ?? currentWorkspace)
    : currentWorkspace;

  const isSuperAdmin = Boolean(currentUser?.is_super_admin || currentUser?.is_superuser || storeIsSuperAdmin);

  const isOwner = Boolean(
    currentUser && workspace && (workspace.owner?.id === currentUser.id || workspace.created_by === currentUser.id)
  );

  const role = activeWorkspaceSlug ? getWorkspaceRoleByWorkspaceSlug(activeWorkspaceSlug) : currentWorkspace?.role;

  const numericRole = role !== undefined && role !== null ? Number(role) : undefined;

  const isAdmin =
    (numericRole !== undefined && numericRole >= EUserPermissions.ADMIN) ||
    allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, activeWorkspaceSlug);

  // Determine whether role information is still loading to avoid flash/redirect loops
  const isRoleLoaded = Boolean(
    isSuperAdmin ||
    isOwner ||
    (activeWorkspaceSlug
      ? (workspaceUserInfo && activeWorkspaceSlug in workspaceUserInfo) || numericRole !== undefined
      : true)
  );

  const isLoading = Boolean(!currentUser || isUserLoading || permissionsLoader || !isRoleLoaded);

  const isAdminOrAbove = useMemo(() => {
    if (isLoading) return false;
    return Boolean(isSuperAdmin || isOwner || isAdmin);
  }, [isLoading, isSuperAdmin, isOwner, isAdmin]);

  const isMemberOnly = useMemo(() => {
    if (isLoading) return false;
    return !isAdminOrAbove;
  }, [isLoading, isAdminOrAbove]);

  return {
    isMemberOnly,
    isAdminOrAbove,
    isLoading,
  };
};
