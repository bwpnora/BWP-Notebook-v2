/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by IT Leon
 */

import { observer } from "mobx-react";
import { FileText } from "lucide-react";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// components
import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueNotesActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export const IssueNotesActivity = observer(function IssueNotesActivity(props: TIssueNotesActivity) {
  const { activityId, showIssue = true, ends } = props;
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<FileText size={14} className="text-secondary" aria-hidden="true" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.new_value ? (
          <>
            đã cập nhật ghi chú thành <span className="font-medium text-primary">{activity.new_value}</span>
          </>
        ) : (
          "đã xóa ghi chú"
        )}
        {showIssue ? " cho " : ""}
        {showIssue && <IssueLink activityId={activityId} />}.
      </>
    </IssueActivityBlockComponent>
  );
});
