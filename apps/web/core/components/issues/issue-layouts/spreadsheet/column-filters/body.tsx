/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { observer } from "mobx-react";
import { ISSUE_PRIORITIES } from "@plane/constants";
import { PriorityIcon, StateGroupIcon } from "@plane/propel/icons";
import type { TColumnFilterKey, TWorkTypeKey } from "@plane/utils";
import { WORK_TYPE_OPTIONS } from "@plane/utils";
import { useProjectState } from "@/hooks/store/use-project-state";
import { ColumnFilterCheckboxList } from "./checkbox-list";
import { useSpreadsheetColumnFilter } from "./context";
import { ColumnFilterDateRange } from "./date-range";
import { ColumnFilterMemberList } from "./member-list";
import { ColumnFilterRoomInput } from "./room-input";
import { ColumnFilterSection } from "./section";

type Props = { filterKey: TColumnFilterKey; projectId: string | undefined };

export const ColumnFilterBody = observer(function ColumnFilterBody({ filterKey, projectId }: Props) {
  const { isAvailable, value, setValue, clear, activeCount } = useSpreadsheetColumnFilter(filterKey);
  const { getProjectStates } = useProjectState();
  if (!isAvailable) return null;

  const listValue = (Array.isArray(value) ? value : []) as string[];
  const setList = (next: string[]) => setValue((next.length ? next : undefined) as never);

  let content: React.ReactNode = null;
  switch (filterKey) {
    case "state_id":
      content = (
        <ColumnFilterCheckboxList
          options={(getProjectStates(projectId) ?? []).map((state) => ({
            value: state.id,
            label: state.name,
            icon: <StateGroupIcon stateGroup={state.group} color={state.color} />,
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "priority":
      content = (
        <ColumnFilterCheckboxList
          options={ISSUE_PRIORITIES.map((priority) => ({
            value: priority.key,
            label: priority.title,
            icon: <PriorityIcon priority={priority.key} />,
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "work_type":
      content = (
        <ColumnFilterCheckboxList
          options={WORK_TYPE_OPTIONS.map((option) => ({
            value: option.key,
            label: option.label,
            icon: (
              <span
                className={`size-2 rounded-full ${(option.key as TWorkTypeKey) === "other" ? "bg-amber-500" : "bg-blue-500"}`}
              />
            ),
          }))}
          selected={listValue}
          onChange={setList}
        />
      );
      break;
    case "assignee_id":
    case "supporter_id":
      content = <ColumnFilterMemberList projectId={projectId} selected={listValue} onChange={setList} />;
      break;
    case "created_at":
      content = (
        <ColumnFilterDateRange
          value={value as [string, string] | undefined}
          onChange={(next) => setValue(next as never)}
        />
      );
      break;
    case "room_search":
      content = (
        <ColumnFilterRoomInput value={value as string | undefined} onChange={(next) => setValue(next as never)} />
      );
      break;
  }

  return (
    <ColumnFilterSection activeCount={activeCount} onClear={clear}>
      {content}
    </ColumnFilterSection>
  );
});
