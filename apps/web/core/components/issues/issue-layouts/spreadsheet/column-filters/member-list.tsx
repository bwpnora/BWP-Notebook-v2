/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import { useMember } from "@/hooks/store/use-member";
import { ColumnFilterCheckboxList } from "./checkbox-list";

type Props = { projectId: string | undefined; selected: string[]; onChange: (next: string[]) => void };

export const ColumnFilterMemberList = observer(function ColumnFilterMemberList(props: Props) {
  const { projectId, selected, onChange } = props;
  const { workspaceSlug } = useParams();
  const {
    getUserDetails,
    project: { getProjectMemberIds, fetchProjectMembers },
  } = useMember();
  const memberIds = projectId ? getProjectMemberIds(projectId, false) : null;

  useEffect(() => {
    if (!memberIds && projectId && workspaceSlug) void fetchProjectMembers(workspaceSlug.toString(), projectId);
  }, [memberIds, projectId, workspaceSlug, fetchProjectMembers]);

  const options = (memberIds ?? []).flatMap((id) => {
    const user = getUserDetails(id);
    if (!user) return [];
    return [
      {
        value: id,
        label: user.display_name,
        icon: <Avatar name={user.display_name} src={getFileURL(user.avatar_url ?? "")} showTooltip={false} size="sm" />,
      },
    ];
  });

  return (
    <ColumnFilterCheckboxList
      options={options}
      selected={selected}
      onChange={onChange}
      searchPlaceholder="Tìm thành viên..."
    />
  );
});
