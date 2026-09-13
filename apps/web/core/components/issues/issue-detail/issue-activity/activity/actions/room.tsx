/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { observer } from "mobx-react";
import { Hash } from "lucide-react";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// components
import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueRoomActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export const IssueRoomActivity = observer(function IssueRoomActivity(props: TIssueRoomActivity) {
  const { activityId, showIssue = true, ends } = props;
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<Hash size={14} className="text-secondary" aria-hidden="true" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.new_value ? (
          <>
            đã cập nhật số phòng thành <span className="font-medium text-primary">{activity.new_value}</span>
          </>
        ) : (
          "đã xóa số phòng"
        )}
        {showIssue ? " cho " : ""}
        {showIssue && <IssueLink activityId={activityId} />}.
      </>
    </IssueActivityBlockComponent>
  );
});
