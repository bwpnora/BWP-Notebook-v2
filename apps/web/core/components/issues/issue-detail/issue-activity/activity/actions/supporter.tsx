/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by IT Leon
 */

import { observer } from "mobx-react";
// icons
import { MembersPropertyIcon } from "@plane/propel/icons";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// components
import { IssueActivityBlockComponent, IssueLink } from "./";

type TIssueSupporterActivity = { activityId: string; showIssue?: boolean; ends: "top" | "bottom" | undefined };

export const IssueSupporterActivity = observer(function IssueSupporterActivity(props: TIssueSupporterActivity) {
  const { activityId, ends, showIssue = true } = props;
  const {
    activity: { getActivityById },
  } = useIssueDetail();

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<MembersPropertyIcon className="h-3.5 w-3.5 flex-shrink-0 text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>
        {activity.old_value === "" ? "đã thêm người hỗ trợ " : "đã xóa người hỗ trợ "}
        <a
          href={`/${activity.workspace_detail?.slug}/profile/${activity.new_identifier ?? activity.old_identifier}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center font-medium text-primary capitalize hover:underline"
        >
          {activity.new_value && activity.new_value !== "" ? activity.new_value : activity.old_value}
        </a>
        {showIssue && (activity.old_value === "" ? " cho " : " khỏi ")}
        {showIssue && <IssueLink activityId={activityId} />}.
      </>
    </IssueActivityBlockComponent>
  );
});
