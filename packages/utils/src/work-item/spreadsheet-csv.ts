/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { SPREADSHEET_PROPERTY_DETAILS, SPREADSHEET_PROPERTY_LIST } from "@plane/constants";
import type { IIssueDisplayProperties, TIssue } from "@plane/types";
import { renderFormattedDate } from "../datetime";

export type TSpreadsheetCsvLookups = {
  projectIdentifier?: string;
  getStateName?: (stateId: string | null | undefined) => string | undefined;
  getUserName?: (userId: string | null | undefined) => string | undefined;
  getLabelName?: (labelId: string | null | undefined) => string | undefined;
  getModuleName?: (moduleId: string | null | undefined) => string | undefined;
  getCycleName?: (cycleId: string | null | undefined) => string | undefined;
  translatePriority?: (priority: string) => string;
  formatDate?: (date: string | null | undefined) => string;
  translateHeader?: (key: string, defaultValue?: string) => string;
};

export type TBuildSpreadsheetCsvOptions = {
  issues: TIssue[];
  displayProperties: IIssueDisplayProperties;
  spreadsheetColumnsList?: (keyof IIssueDisplayProperties)[];
  isEstimateEnabled?: boolean;
  lookups?: TSpreadsheetCsvLookups;
};

export type TSpreadsheetCsvColumn = {
  key: string;
  label: string;
};

export type TSpreadsheetCsvResult = {
  columns: TSpreadsheetCsvColumn[];
  rows: Record<string, string>[];
};

export const buildSpreadsheetCsvData = (options: TBuildSpreadsheetCsvOptions): TSpreadsheetCsvResult => {
  const {
    issues,
    displayProperties,
    spreadsheetColumnsList = SPREADSHEET_PROPERTY_LIST,
    isEstimateEnabled = false,
    lookups = {},
  } = options;

  const {
    projectIdentifier,
    getStateName,
    getUserName,
    getLabelName,
    getModuleName,
    getCycleName,
    translatePriority,
    formatDate = (d) => (d ? (renderFormattedDate(d) ?? "") : ""),
    translateHeader = (k, def) => def ?? k,
  } = lookups;

  const columns: TSpreadsheetCsvColumn[] = [];

  // 1. Identifier (Key) if not explicitly false
  if (displayProperties?.key !== false) {
    columns.push({
      key: "identifier",
      label: translateHeader("issue.display.properties.id", "Mã"),
    });
  }

  // 2. Work Item Title (always present in the spreadsheet table)
  columns.push({
    key: "name",
    label: translateHeader("work_items", "Công việc"),
  });

  // 3. Dynamic columns
  for (const property of spreadsheetColumnsList) {
    if (property === "estimate" && !isEstimateEnabled) continue;
    if (!displayProperties?.[property]) continue;

    const propertyDetails = SPREADSHEET_PROPERTY_DETAILS[property];
    const titleKey = propertyDetails?.i18n_title ?? property;
    const label = translateHeader(titleKey, titleKey);

    columns.push({
      key: property,
      label,
    });
  }

  const rows = issues.map((issue) => {
    const row: Record<string, string> = {};

    if (displayProperties?.key !== false) {
      const identifier = projectIdentifier
        ? `${projectIdentifier}-${issue.sequence_id}`
        : String(issue.sequence_id ?? "");
      row.identifier = identifier;
    }

    row.name = issue.name ?? "";

    for (const col of columns) {
      if (col.key === "identifier" || col.key === "name") continue;

      const prop = col.key as keyof IIssueDisplayProperties;
      switch (prop) {
        case "state": {
          row.state = getStateName?.(issue.state_id) ?? "";
          break;
        }
        case "priority": {
          if (issue.priority && issue.priority !== "none") {
            row.priority = translatePriority?.(issue.priority) ?? issue.priority;
          } else {
            row.priority = "";
          }
          break;
        }
        case "issue_type": {
          const isOther =
            (issue.type_detail?.name === "Công việc khác" ||
              issue.type_detail?.external_id === "other" ||
              issue.type_id === "other") &&
            issue.type_id !== "operational";
          row.issue_type = isOther ? "Công việc khác" : "Công việc vận hành";
          break;
        }
        case "assignee": {
          row.assignee =
            issue.assignee_ids
              ?.map((id) => getUserName?.(id) ?? "")
              .filter(Boolean)
              .join("; ") ?? "";
          break;
        }
        case "supporter": {
          row.supporter =
            issue.supporter_ids
              ?.map((id) => getUserName?.(id) ?? "")
              .filter(Boolean)
              .join("; ") ?? "";
          break;
        }
        case "room": {
          row.room = issue.room !== null && issue.room !== undefined ? `Phòng ${issue.room}` : "";
          break;
        }
        case "notes": {
          row.notes = issue.notes ?? "";
          break;
        }
        case "labels": {
          row.labels =
            issue.label_ids
              ?.map((id) => getLabelName?.(id) ?? "")
              .filter(Boolean)
              .join("; ") ?? "";
          break;
        }
        case "modules": {
          row.modules =
            issue.module_ids
              ?.map((id) => getModuleName?.(id) ?? "")
              .filter(Boolean)
              .join("; ") ?? "";
          break;
        }
        case "cycle": {
          row.cycle = issue.cycle_id ? (getCycleName?.(issue.cycle_id) ?? "") : "";
          break;
        }
        case "start_date": {
          row.start_date = issue.start_date ? formatDate(issue.start_date) : "";
          break;
        }
        case "due_date": {
          row.due_date = issue.target_date ? formatDate(issue.target_date) : "";
          break;
        }
        case "estimate": {
          row.estimate = issue.estimate_point ? String(issue.estimate_point) : "";
          break;
        }
        case "created_on": {
          row.created_on = issue.created_at ? formatDate(issue.created_at) : "";
          break;
        }
        case "updated_on": {
          row.updated_on = issue.updated_at ? formatDate(issue.updated_at) : "";
          break;
        }
        case "link": {
          row.link = issue.link_count ? String(issue.link_count) : "";
          break;
        }
        case "attachment_count": {
          row.attachment_count = issue.attachment_count ? String(issue.attachment_count) : "";
          break;
        }
        case "sub_issue_count": {
          row.sub_issue_count = issue.sub_issues_count ? String(issue.sub_issues_count) : "";
          break;
        }
        default:
          break;
      }
    }

    return row;
  });

  return { columns, rows };
};
