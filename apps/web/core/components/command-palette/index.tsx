/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ProjectsAppPowerKProvider } from "@/components/power-k/projects-app-provider";
import { useMemberRole } from "@/hooks/use-member-role";

/**
 * CommandPalette wrapper with Member role suppression
 */
export const CommandPalette = observer(function CommandPalette() {
  const params = useParams();
  const { workspaceSlug } = params;
  const { isMemberOnly } = useMemberRole(workspaceSlug?.toString());

  if (isMemberOnly) {
    return null;
  }

  return <ProjectsAppPowerKProvider />;
});

export default CommandPalette;
