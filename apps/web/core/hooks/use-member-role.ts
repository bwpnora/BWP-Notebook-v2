/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

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
export const useMemberRole = (workspaceSlug?: string, projectId?: string): IUseMemberRoleResult => {
  const { data: currentUser, isLoading: isUserLoading } = useUser();
  const {
    isSuperAdmin: storeIsSuperAdmin,
    getWorkspaceRoleByWorkspaceSlug,
    getProjectRoleByWorkspaceSlugAndProjectId,
    allowPermissions,
    workspaceUserInfo,
    workspaceProjectsPermissions,
  } = useUserPermissions();
  const { currentWorkspace, getWorkspaceBySlug, workspaces } = useWorkspace();

  const activeWorkspaceSlug = workspaceSlug || currentWorkspace?.slug;
  const workspace = activeWorkspaceSlug
    ? (getWorkspaceBySlug(activeWorkspaceSlug) ??
      Object.values(workspaces ?? {}).find((w) => w.slug?.toLowerCase() === activeWorkspaceSlug?.toLowerCase()) ??
      currentWorkspace)
    : currentWorkspace;

  // 1. SuperAdmin & Owner privileges
  const isSuperAdmin = Boolean(currentUser?.is_super_admin || currentUser?.is_superuser || storeIsSuperAdmin);
  const isOwner = Boolean(
    currentUser && workspace && (workspace.owner?.id === currentUser.id || workspace.created_by === currentUser.id)
  );

  // 2. Resolve workspace role: prioritize store, fallback to workspace object
  const roleFromStore = activeWorkspaceSlug ? getWorkspaceRoleByWorkspaceSlug(activeWorkspaceSlug) : undefined;
  const roleFromWorkspace = workspace?.role;
  const effectiveRole = roleFromStore !== undefined && roleFromStore !== null ? roleFromStore : roleFromWorkspace;
  const numericRole = effectiveRole !== undefined && effectiveRole !== null ? Number(effectiveRole) : undefined;

  const isWorkspaceAdminRole = numericRole !== undefined && numericRole >= EUserPermissions.ADMIN;
  const hasWorkspaceAdminPerm = Boolean(
    activeWorkspaceSlug &&
    allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE, activeWorkspaceSlug)
  );

  // 3. Resolve project role if projectId is provided
  const projectRole =
    activeWorkspaceSlug && projectId
      ? getProjectRoleByWorkspaceSlugAndProjectId(activeWorkspaceSlug, projectId)
      : undefined;
  const numericProjectRole = projectRole !== undefined && projectRole !== null ? Number(projectRole) : undefined;
  const hasProjectAdminPerm = Boolean(
    activeWorkspaceSlug &&
    projectId &&
    allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, activeWorkspaceSlug, projectId)
  );

  // Determine admin status
  const workspaceProjects = activeWorkspaceSlug ? workspaceProjectsPermissions?.[activeWorkspaceSlug] : undefined;
  const isAnyProjectAdmin = Boolean(
    workspaceProjects && Object.values(workspaceProjects).some((role) => Number(role) >= EUserPermissions.ADMIN)
  );

  let isAdminOrAbove = false;
  if (isSuperAdmin || isOwner) {
    isAdminOrAbove = true;
  } else if (projectId) {
    isAdminOrAbove = Boolean(
      isWorkspaceAdminRole ||
      hasWorkspaceAdminPerm ||
      hasProjectAdminPerm ||
      (numericProjectRole !== undefined && numericProjectRole >= EUserPermissions.ADMIN)
    );
  } else {
    isAdminOrAbove = Boolean(isWorkspaceAdminRole || hasWorkspaceAdminPerm || isAnyProjectAdmin);
  }

  // 4. Check if role is resolved
  // SuperAdmin, Owner, and Workspace Admin have full authority immediately.
  // For accounts with workspace role <= 15, we must wait until project-level roles
  // are loaded to know whether they are a Department Admin or strictly a task creator.
  const hasWorkspaceRoleLoaded = Boolean(
    numericRole !== undefined || (activeWorkspaceSlug && workspaceUserInfo && activeWorkspaceSlug in workspaceUserInfo)
  );
  const hasProjectRolesLoaded = Boolean(activeWorkspaceSlug && activeWorkspaceSlug in workspaceProjectsPermissions);
  const isWorkspaceLevelAdmin = Boolean(isSuperAdmin || isOwner || isWorkspaceAdminRole);

  const hasResolvedRole = Boolean(
    isWorkspaceLevelAdmin ||
    (hasWorkspaceRoleLoaded &&
      (projectId ? numericProjectRole !== undefined || hasProjectRolesLoaded : hasProjectRolesLoaded))
  );

  const isLoading = Boolean(!currentUser || isUserLoading || !hasResolvedRole);

  const isMemberOnly = Boolean(!isLoading && !isAdminOrAbove);

  return {
    isMemberOnly,
    isAdminOrAbove,
    isLoading,
  };
};
