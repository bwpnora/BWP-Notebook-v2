/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useRef } from "react";
import { observer } from "mobx-react";
// plane constants
import { SPREADSHEET_SELECT_GROUP, SPREADSHEET_PROPERTY_LIST } from "@plane/constants";
// types
import type { TIssue, IIssueDisplayFilterOptions, IIssueDisplayProperties } from "@plane/types";
import { EIssueLayoutTypes } from "@plane/types";
import type { TColumnFilterableIssue } from "@plane/utils";
import { matchesColumnFilters } from "@plane/utils";
// components
import { MultipleSelectGroup } from "@/components/core/multiple-select";
import { IssueBulkOperationsRoot } from "@/components/issues/bulk-operations";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProject } from "@/hooks/store/use-project";
import { useBulkOperationStatus } from "@/hooks/use-bulk-operation-status";
// local imports
import type { TRenderQuickActions } from "../list/list-view-types";
import { QuickAddIssueRoot, SpreadsheetAddIssueButton } from "../quick-add";
import { useSpreadsheetColumnFilters } from "./column-filters";
import { SpreadsheetTable } from "./spreadsheet-table";

type Props = {
  displayProperties: IIssueDisplayProperties;
  displayFilters: IIssueDisplayFilterOptions;
  handleDisplayFilterUpdate: (data: Partial<IIssueDisplayFilterOptions>) => void;
  issueIds: string[] | undefined;
  quickActions: TRenderQuickActions;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  openIssuesListModal?: (() => void) | null;
  quickAddCallback?: (projectId: string | null | undefined, data: TIssue) => Promise<TIssue | undefined>;
  canEditProperties: (projectId: string | undefined) => boolean;
  canLoadMoreIssues: boolean;
  loadMoreIssues: () => void;
  enableQuickCreateIssue?: boolean;
  disableIssueCreation?: boolean;
  isWorkspaceLevel?: boolean;
  isEpic?: boolean;
  isRefreshing?: boolean;
};

export const SpreadsheetView = observer(function SpreadsheetView(props: Props) {
  const {
    displayProperties,
    displayFilters,
    handleDisplayFilterUpdate,
    issueIds,
    quickActions,
    updateIssue,
    quickAddCallback,
    canEditProperties,
    enableQuickCreateIssue,
    disableIssueCreation,
    canLoadMoreIssues,
    loadMoreIssues,
    isWorkspaceLevel = false,
    isEpic = false,
    isRefreshing,
  } = props;
  // refs
  const containerRef = useRef<HTMLTableElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  // store hooks
  const { currentProjectDetails } = useProject();
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const columnFilters = useSpreadsheetColumnFilters();
  // plane web hooks
  const isBulkOperationsEnabled = useBulkOperationStatus();

  const isEstimateEnabled: boolean = currentProjectDetails?.estimate !== null;

  const spreadsheetColumnsList = isWorkspaceLevel
    ? SPREADSHEET_PROPERTY_LIST
    : SPREADSHEET_PROPERTY_LIST.filter((property) => {
        if (property === "cycle" && !currentProjectDetails?.cycle_view) return false;
        if (property === "modules" && !currentProjectDetails?.module_view) return false;
        return true;
      });

  // Instant client-side pass over loaded rows; the server result (refetched after the
  // debounced commit) replaces issueIds. Re-applying the predicate on top also hides rows
  // from any stale/failed response.
  const visibleIssueIds = columnFilters.hasActiveFilters
    ? (issueIds ?? []).filter((id) => {
        const issue = getIssueById(id);
        return !issue || matchesColumnFilters(issue as unknown as TColumnFilterableIssue, columnFilters.values);
      })
    : (issueIds ?? []);
  const isFilteredEmpty = !!issueIds?.length && visibleIssueIds.length === 0;

  if (!issueIds || issueIds.length === 0) return <></>;
  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden bg-layer-1 whitespace-nowrap text-secondary">
      <div ref={portalRef} className="spreadsheet-menu-portal" />
      {isRefreshing && <div className="absolute top-0 left-0 z-[20] h-0.5 w-full animate-pulse bg-accent-primary" />}
      <MultipleSelectGroup
        containerRef={containerRef}
        entities={{
          [SPREADSHEET_SELECT_GROUP]: visibleIssueIds,
        }}
        disabled={!isBulkOperationsEnabled || isEpic}
      >
        {(helpers) => (
          <>
            <div ref={containerRef} className="vertical-scrollbar horizontal-scrollbar scrollbar-lg h-full w-full">
              <SpreadsheetTable
                displayProperties={displayProperties}
                displayFilters={displayFilters}
                handleDisplayFilterUpdate={handleDisplayFilterUpdate}
                issueIds={visibleIssueIds}
                isEstimateEnabled={isEstimateEnabled}
                portalElement={portalRef}
                quickActions={quickActions}
                updateIssue={updateIssue}
                canEditProperties={canEditProperties}
                containerRef={containerRef}
                canLoadMoreIssues={canLoadMoreIssues}
                loadMoreIssues={loadMoreIssues}
                spreadsheetColumnsList={spreadsheetColumnsList}
                selectionHelpers={helpers}
                isEpic={isEpic}
              />
              {isFilteredEmpty && (
                <div className="flex flex-col items-center gap-2 py-10 text-13 text-tertiary">
                  <span>Không có công việc khớp bộ lọc</span>
                  <button
                    type="button"
                    className="rounded-sm border-[0.5px] border-subtle px-3 py-1 text-13 text-primary hover:bg-layer-1"
                    onClick={columnFilters.clearAll}
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              )}
            </div>
            <div className="border-t border-subtle">
              <div className="sticky bottom-0 left-0 z-5">
                {enableQuickCreateIssue && !disableIssueCreation && (
                  <QuickAddIssueRoot
                    layout={EIssueLayoutTypes.SPREADSHEET}
                    QuickAddButton={SpreadsheetAddIssueButton}
                    quickAddCallback={quickAddCallback}
                    isEpic={isEpic}
                  />
                )}
              </div>
            </div>
            <IssueBulkOperationsRoot selectionHelpers={helpers} />
          </>
        )}
      </MultipleSelectGroup>
    </div>
  );
});
