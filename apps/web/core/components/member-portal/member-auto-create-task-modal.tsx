/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { EIssuesStoreType } from "@plane/types";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useMemberRole } from "@/hooks/use-member-role";

type MemberAutoCreateTaskModalProps = {
  workspaceSlug: string;
};

export const MemberAutoCreateTaskModal = observer(function MemberAutoCreateTaskModal({
  workspaceSlug,
}: MemberAutoCreateTaskModalProps) {
  const { isMemberOnly, isLoading } = useMemberRole(workspaceSlug);
  const { toggleCreateIssueModal, isCreateIssueModalOpen } = useCommandPalette();

  useEffect(() => {
    if (isLoading || !isMemberOnly || !workspaceSlug) return;

    // Check if modal was already triggered in this browser session
    const sessionKey = `member_auto_task_modal_${workspaceSlug}`;
    const hasTriggered = typeof window !== "undefined" ? sessionStorage.getItem(sessionKey) : null;

    if (!hasTriggered && !isCreateIssueModalOpen) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(sessionKey, "true");
      }
      const timer = setTimeout(() => {
        toggleCreateIssueModal(true, EIssuesStoreType.PROJECT);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isMemberOnly, workspaceSlug, toggleCreateIssueModal, isCreateIssueModalOpen]);

  return null;
});
