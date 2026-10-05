/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CheckIcon,
  ChevronDownIcon,
  Eraser,
  Filter,
  MoveRight,
} from "lucide-react";
import { observer } from "mobx-react";
// constants
import { SPREADSHEET_PROPERTY_DETAILS } from "@plane/constants";
// i18n
import { useTranslation } from "@plane/i18n";
import { Popover } from "@plane/propel/popover";
// types
import type { IIssueDisplayFilterOptions, IIssueDisplayProperties, TIssueOrderByOptions } from "@plane/types";
import { Row } from "@plane/ui";
import { cn } from "@plane/utils";
import useLocalStorage from "@/hooks/use-local-storage";
import { ColumnFilterBody, SPREADSHEET_COLUMN_FILTER_KEY, useSpreadsheetColumnFilter } from "../column-filters";
import { SpreadSheetPropertyIcon } from "../../utils";

interface Props {
  property: keyof IIssueDisplayProperties;
  displayFilters: IIssueDisplayFilterOptions;
  handleDisplayFilterUpdate: (data: Partial<IIssueDisplayFilterOptions>) => void;
  onClose: () => void;
  isEpic?: boolean;
}

export const HeaderColumn = observer(function HeaderColumn(props: Props) {
  const { displayFilters, handleDisplayFilterUpdate, property, onClose, isEpic = false } = props;
  // i18n
  const { t } = useTranslation();
  const { storedValue: selectedMenuItem, setValue: setSelectedMenuItem } = useLocalStorage(
    "spreadsheetViewSorting",
    ""
  );
  const { storedValue: activeSortingProperty, setValue: setActiveSortingProperty } = useLocalStorage(
    "spreadsheetViewActiveSortingProperty",
    ""
  );
  const propertyDetails = SPREADSHEET_PROPERTY_DETAILS[property];

  const handleOrderBy = (order: TIssueOrderByOptions, itemKey: string) => {
    handleDisplayFilterUpdate({ order_by: order });

    setSelectedMenuItem(`${order}_${itemKey}`);
    setActiveSortingProperty(order === "-created_at" ? "" : itemKey);
  };

  const [isOpen, setIsOpen] = useState(false);
  const { projectId } = useParams();
  const filterKey = SPREADSHEET_COLUMN_FILTER_KEY[property];
  // hooks must not be conditional: use a fallback key and ignore it when the column has no filter
  const columnFilter = useSpreadsheetColumnFilter(filterKey ?? "state_id");
  const isFiltered = !!filterKey && columnFilter.isAvailable && columnFilter.isActive;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) onClose();
  };

  const sortItem = (orderKey: TIssueOrderByOptions, label: React.ReactNode, icon: React.ReactNode) => {
    const isSelected = selectedMenuItem === `${orderKey}_${property}`;
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-sm px-2 py-1 text-13 hover:bg-layer-1",
          isSelected ? "text-primary" : "text-secondary hover:text-primary"
        )}
        onClick={() => {
          handleOrderBy(orderKey, property);
          handleOpenChange(false);
        }}
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        {isSelected && <CheckIcon className="h-3 w-3" />}
      </button>
    );
  };

  if (!propertyDetails) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Button className="clickable w-full" tabIndex={-1}>
        <Row
          className={cn(
            "flex w-full cursor-pointer items-center justify-between gap-1.5 py-2 text-13 hover:text-primary",
            isFiltered ? "text-accent-primary" : "text-secondary"
          )}
        >
          <div className="flex items-center gap-1.5">
            <SpreadSheetPropertyIcon
              iconKey={propertyDetails.icon}
              className={cn("h-4 w-4", isFiltered ? "text-accent-primary" : "text-placeholder")}
            />
            {property === "sub_issue_count" && isEpic ? t("issue.label", { count: 2 }) : t(propertyDetails.i18n_title)}
          </div>
          <div className="ml-3 flex items-center gap-1">
            {activeSortingProperty === property && (
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full">
                {propertyDetails.ascendingOrderKey === displayFilters.order_by ? (
                  <ArrowDownWideNarrow className="h-3 w-3" />
                ) : (
                  <ArrowUpNarrowWide className="h-3 w-3" />
                )}
              </div>
            )}
            {isFiltered ? (
              <span className="relative flex" title={`Đang lọc: ${columnFilter.activeCount}`}>
                <Filter className="h-3 w-3" />
                <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-accent-primary" />
              </span>
            ) : (
              <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
            )}
          </div>
        </Row>
      </Popover.Button>
      <Popover.Panel
        side="bottom"
        align="start"
        sideOffset={4}
        className="z-30 w-64 rounded-md border-[0.5px] border-strong bg-surface-1 py-1 shadow-raised-200"
      >
        <div className="px-1">
          {sortItem(
            propertyDetails.ascendingOrderKey,
            <>
              <span>{propertyDetails.ascendingOrderTitle}</span>
              <MoveRight className="h-3 w-3" />
              <span>{propertyDetails.descendingOrderTitle}</span>
            </>,
            <ArrowDownWideNarrow className="h-3 w-3 stroke-[1.5]" />
          )}
          {sortItem(
            propertyDetails.descendingOrderKey,
            <>
              <span>{propertyDetails.descendingOrderTitle}</span>
              <MoveRight className="h-3 w-3" />
              <span>{propertyDetails.ascendingOrderTitle}</span>
            </>,
            <ArrowUpNarrowWide className="h-3 w-3 stroke-[1.5]" />
          )}
          {selectedMenuItem &&
            displayFilters?.order_by !== "-created_at" &&
            selectedMenuItem.includes(property) &&
            sortItem("-created_at", t("common.actions.clear_sorting"), <Eraser className="h-3 w-3" />)}
        </div>
        {filterKey && <ColumnFilterBody filterKey={filterKey} projectId={projectId?.toString()} />}
      </Popover.Panel>
    </Popover>
  );
});
