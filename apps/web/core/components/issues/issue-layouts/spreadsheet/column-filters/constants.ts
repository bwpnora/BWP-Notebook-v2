/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import type { IIssueDisplayProperties } from "@plane/types";
import type { TColumnFilterKey } from "@plane/utils";

export const COLUMN_FILTER_COMMIT_DELAY_MS = 400;

export const SPREADSHEET_COLUMN_FILTER_KEY: Partial<Record<keyof IIssueDisplayProperties, TColumnFilterKey>> = {
  state: "state_id",
  priority: "priority",
  assignee: "assignee_id",
  supporter: "supporter_id",
  created_on: "created_at",
  room: "room_search",
  issue_type: "work_type",
};
