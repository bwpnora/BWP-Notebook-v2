/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { download, generateCsv, mkConfig } from "export-to-csv";
import type { TBuildSpreadsheetCsvOptions } from "@plane/utils";
import { buildSpreadsheetCsvData } from "@plane/utils";

type TExportSpreadsheetCsvParams = {
  workspaceSlug: string;
  projectIdentifier?: string;
  options: TBuildSpreadsheetCsvOptions;
};

export const exportSpreadsheetCsv = (params: TExportSpreadsheetCsvParams): boolean => {
  const { workspaceSlug, projectIdentifier, options } = params;
  const { columns, rows } = buildSpreadsheetCsvData(options);

  if (rows.length === 0) return false;

  // Build row objects using column display labels as headers
  const rowData = rows.map((row) => {
    const entry: Record<string, string> = {};
    for (const col of columns) {
      entry[col.label] = row[col.key] ?? "";
    }
    return entry;
  });

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const filename = `${projectIdentifier || workspaceSlug}-work-items-${dateStr}`;

  const config = mkConfig({
    fieldSeparator: ",",
    filename,
    decimalSeparator: ".",
    useBom: true,
    useKeysAsHeaders: true,
  });

  const csv = generateCsv(config)(rowData);
  download(config)(csv);
  return true;
};
