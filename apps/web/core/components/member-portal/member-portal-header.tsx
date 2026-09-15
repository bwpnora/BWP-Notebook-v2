/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { observer } from "mobx-react";
import { Globe } from "lucide-react";
// i18n
import { useTranslation } from "@plane/i18n";
// plane ui & utils
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// components
import { WorkspaceLogo } from "@/components/workspace/logo";
// hooks
import { useUser } from "@/hooks/store/user";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useMemberRole } from "@/hooks/use-member-role";

export type MemberPortalHeaderProps = {
  workspaceSlug?: string;
};

export const MemberPortalHeader = observer(function MemberPortalHeader(props: MemberPortalHeaderProps) {
  const { workspaceSlug } = props;
  const params = useParams();
  const routeWorkspaceSlug = Array.isArray(params?.workspaceSlug) ? params.workspaceSlug[0] : params?.workspaceSlug;
  const { currentWorkspace } = useWorkspace();
  const activeWorkspaceSlug = workspaceSlug || routeWorkspaceSlug || currentWorkspace?.slug || "";

  const { currentLocale, changeLanguage } = useTranslation();
  const isVietnamese = currentLocale === "vi-VN" || currentLocale?.startsWith("vi") || !currentLocale;

  const { data: currentUser, signOut } = useUser();
  const { isAdminOrAbove } = useMemberRole(activeWorkspaceSlug);

  const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ");
  const userDisplayName = currentUser?.display_name || fullName || currentUser?.email || "";
  const showEmailSubtitle = Boolean(currentUser?.email && (currentUser?.display_name || fullName));

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <header className="border-custom-border-200 bg-custom-background-100 flex w-full items-center justify-between border-b border-subtle bg-surface-1 px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <WorkspaceLogo
            logo={currentWorkspace?.logo_url}
            name={currentWorkspace?.name || "BWP Notebook"}
            classNames="size-8 rounded-md border border-subtle border-custom-border-200"
          />
          <h1 className="text-base sm:text-lg text-custom-text-100 max-w-xs truncate font-semibold text-primary sm:max-w-sm">
            {currentWorkspace?.name || "BWP Notebook"}
          </h1>
        </div>
        {isAdminOrAbove && activeWorkspaceSlug && (
          <Link
            href={`/${activeWorkspaceSlug}`}
            className="text-sm text-custom-primary-100 ml-2 flex shrink-0 items-center gap-1 text-accent-primary hover:underline"
          >
            {isVietnamese ? "← Quay lại Bảng điều khiển" : "← Back to Dashboard"}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Language Switcher */}
        <div className="border-custom-border-200 bg-custom-background-90 text-xs flex items-center rounded-md border p-0.5">
          <Globe className="text-custom-text-300 ml-1.5 h-3.5 w-3.5" />
          <button
            type="button"
            onClick={() => changeLanguage("vi-VN")}
            className={`cursor-pointer rounded px-2 py-1 font-medium transition-colors ${
              isVietnamese
                ? "bg-custom-background-100 text-custom-text-100 shadow-xs"
                : "text-custom-text-300 hover:text-custom-text-100"
            }`}
            title="Tiếng Việt"
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => changeLanguage("en")}
            className={`cursor-pointer rounded px-2 py-1 font-medium transition-colors ${
              !isVietnamese
                ? "bg-custom-background-100 text-custom-text-100 shadow-xs"
                : "text-custom-text-300 hover:text-custom-text-100"
            }`}
            title="English"
          >
            EN
          </button>
        </div>

        <div className="text-sm text-custom-text-200 flex items-center gap-2 text-secondary">
          <Avatar name={userDisplayName} src={getFileURL(currentUser?.avatar_url ?? "")} size={28} shape="circle" />
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-custom-text-100 text-sm leading-none font-medium text-primary">
              {userDisplayName}
            </span>
            {showEmailSubtitle && (
              <span className="text-xs text-custom-text-300 leading-tight text-secondary">{currentUser?.email}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs bg-custom-background-80 text-custom-text-300 hover:text-custom-text-100 border-custom-border-200 cursor-pointer rounded-md border border-subtle bg-layer-1 px-3 py-1.5 text-secondary transition-colors hover:text-primary"
        >
          {isVietnamese ? "Đăng xuất" : "Sign out"}
        </button>
      </div>
    </header>
  );
});
