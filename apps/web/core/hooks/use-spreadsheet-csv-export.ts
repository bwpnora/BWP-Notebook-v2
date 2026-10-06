/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import { useState, useCallback } from "react";
import { ALL_ISSUES, SPREADSHEET_PROPERTY_LIST } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { EIssuesStoreType, TIssue, TProject } from "@plane/types";
import { exportSpreadsheetCsv } from "@/components/issues/issue-layouts/spreadsheet/export-csv";
import { useCycle } from "@/hooks/store/use-cycle";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useLabel } from "@/hooks/store/use-label";
import { useMember } from "@/hooks/store/use-member";
import { useModule } from "@/hooks/store/use-module";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useIssuesActions } from "@/hooks/use-issues-actions";

type TUseSpreadsheetCsvExportParams = {
  workspaceSlug: string;
  projectId: string;
  currentProjectDetails: TProject | undefined;
  storeType: EIssuesStoreType;
};

export const useSpreadsheetCsvExport = (params: TUseSpreadsheetCsvExportParams) => {
  const { workspaceSlug, projectId, currentProjectDetails, storeType } = params;

  const [isExporting, setIsExporting] = useState(false);
  const { t } = useTranslation();

  const { issues, issuesFilter } = useIssues(storeType);
  const { fetchNextIssues } = useIssuesActions(storeType);
  const { getStateById } = useProjectState();
  const { getUserDetails } = useMember();
  const { labelMap } = useLabel();
  const { getModuleById } = useModule();
  const { getCycleById } = useCycle();
  const {
    issue: { getIssueById },
  } = useIssueDetail();

  const handleExportCsv = useCallback(async () => {
    if (!workspaceSlug || !projectId) return;

    setIsExporting(true);
    try {
      // 1. Load all pages if nextPageResults is true
      let hasMore = Boolean(issues.getPaginationData(ALL_ISSUES, undefined)?.nextPageResults);
      let guard = 0;
      while (hasMore && guard < 100) {
        guard++;
        // oxlint-disable-next-line no-await-in-loop
        await fetchNextIssues(ALL_ISSUES, undefined);
        hasMore = Boolean(issues.getPaginationData(ALL_ISSUES, undefined)?.nextPageResults);
      }

      // 2. Collect loaded issues for ALL_ISSUES
      const rawIssueIds = issues.groupedIssueIds?.[ALL_ISSUES];
      const issueIds: string[] = Array.isArray(rawIssueIds) ? rawIssueIds : [];
      const issueList: TIssue[] = issueIds
        .map((id: string) => getIssueById(id))
        .filter((iss): iss is TIssue => Boolean(iss));

      if (issueList.length === 0) {
        setToast({
          type: TOAST_TYPE.INFO,
          title: "Không có công việc để xuất",
        });
        return;
      }

      // 3. Determine visible columns matching spreadsheet view
      const spreadsheetColumnsList = SPREADSHEET_PROPERTY_LIST.filter((property) => {
        if (property === "cycle" && !currentProjectDetails?.cycle_view) return false;
        if (property === "modules" && !currentProjectDetails?.module_view) return false;
        return true;
      });

      const isEstimateEnabled = currentProjectDetails?.estimate !== null;

      const success = exportSpreadsheetCsv({
        workspaceSlug,
        projectIdentifier: currentProjectDetails?.identifier,
        options: {
          issues: issueList,
          displayProperties: issuesFilter.issueFilters?.displayProperties ?? {},
          spreadsheetColumnsList,
          isEstimateEnabled,
          lookups: {
            projectIdentifier: currentProjectDetails?.identifier,
            getStateName: (id) => getStateById(id)?.name,
            getUserName: (id) => {
              const u = getUserDetails(id ?? "");
              return u?.display_name || u?.first_name || "";
            },
            getLabelName: (id) => labelMap[id ?? ""]?.name,
            getModuleName: (id) => getModuleById(id ?? "")?.name,
            getCycleName: (id) => getCycleById(id ?? "")?.name,
            translatePriority: (p) => t(p),
            translateHeader: (key, defaultValue) => t(key, { defaultValue }),
          },
        },
      });

      if (success) {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Xuất CSV thành công",
          message: `Đã xuất ${issueList.length} công việc.`,
        });
      }
    } catch (error) {
      console.error("Export CSV error:", error);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Xuất CSV thất bại",
        message: "Có lỗi xảy ra khi tải dữ liệu hoặc xuất file.",
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    workspaceSlug,
    projectId,
    issues,
    issuesFilter.issueFilters?.displayProperties,
    fetchNextIssues,
    getIssueById,
    currentProjectDetails,
    getStateById,
    getUserDetails,
    labelMap,
    getModuleById,
    getCycleById,
    t,
  ]);

  return {
    isExporting,
    handleExportCsv,
  };
};
