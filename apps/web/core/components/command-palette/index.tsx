/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { ProjectsAppPowerKProvider } from "@/components/power-k/projects-app-provider";

/**
 * CommandPalette wrapper
 */
export const CommandPalette = observer(function CommandPalette() {
  return <ProjectsAppPowerKProvider />;
});

export default CommandPalette;
