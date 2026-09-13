/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// component
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";

function BillingSettingsPage() {
  return <NotAuthorizedView section="settings" className="h-auto" />;
}

export default observer(BillingSettingsPage);
