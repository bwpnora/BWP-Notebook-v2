/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane imports
import { STATE_GROUPS } from "@plane/constants";
// types
import { useTranslation } from "@plane/i18n";
import type { IUserStateDistribution } from "@plane/types";
import { Card, ECardDirection, ECardSpacing } from "@plane/ui";
// constants

type Props = {
  stateDistribution: IUserStateDistribution[];
};

export function ProfileWorkload({ stateDistribution }: Props) {
  const { t } = useTranslation();

  const getStateGroupLabel = (stateGroup: string) => {
    switch (stateGroup) {
      case "backlog":
        return t("workspace_projects.state.backlog", { defaultValue: "Tồn đọng" });
      case "unstarted":
        return t("workspace_projects.state.unstarted", { defaultValue: "Chưa bắt đầu" });
      case "started":
        return t("workspace_projects.state.started", { defaultValue: "Đang thực hiện" });
      case "completed":
        return t("workspace_projects.state.completed", { defaultValue: "Đã hoàn thành" });
      case "cancelled":
        return t("workspace_projects.state.cancelled", { defaultValue: "Đã hủy" });
      default:
        return (STATE_GROUPS as Record<string, any>)[stateGroup]?.label ?? stateGroup;
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-16 font-medium">{t("profile.stats.workload")}</h3>
      <div className="grid grid-cols-1 justify-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stateDistribution.map((group) => (
          <div key={group.state_group}>
            <a>
              <Card direction={ECardDirection.ROW} spacing={ECardSpacing.SM}>
                <div
                  className="my-2 h-3 w-3 rounded-xs"
                  style={{
                    backgroundColor: STATE_GROUPS[group.state_group].color,
                  }}
                />
                <div className="flex-col space-y-1">
                  <span className="text-13 text-placeholder">
                    {getStateGroupLabel(group.state_group)}
                  </span>
                  <p className="text-18 font-semibold">{group.state_count}</p>
                </div>
              </Card>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
