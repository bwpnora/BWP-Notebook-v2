/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import type { Control, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { SlidersHorizontal } from "lucide-react";
// plane package imports
import { ANALYTICS_X_AXIS_VALUES, ANALYTICS_Y_AXIS_VALUES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CalendarLayoutIcon } from "@plane/propel/icons";
import type { IAnalyticsParams } from "@plane/types";
import { ChartXAxisProperty, ChartYAxisMetric } from "@plane/types";
import { cn } from "@plane/utils";
// plane web components
import { SelectXAxis } from "./select-x-axis";
import { SelectYAxis } from "./select-y-axis";

type Props = {
  control: Control<IAnalyticsParams, unknown>;
  setValue: UseFormSetValue<IAnalyticsParams>;
  params: IAnalyticsParams;
  workspaceSlug: string;
  classNames?: string;
  isEpic?: boolean;
};

export const AnalyticsSelectParams = observer(function AnalyticsSelectParams(props: Props) {
  const { control, params, classNames, isEpic } = props;
  const { t } = useTranslation();

  const getXAxisLabel = (value: string | undefined, defaultLabel?: string) => {
    if (!value) return defaultLabel ?? t("workspace_analytics.add_property", { defaultValue: "Thêm thuộc tính" });
    switch (value) {
      case ChartXAxisProperty.STATES:
        return t("state");
      case ChartXAxisProperty.STATE_GROUPS:
        return t("state_group", { defaultValue: "Nhóm trạng thái" });
      case ChartXAxisProperty.PRIORITY:
        return t("priority");
      case ChartXAxisProperty.LABELS:
        return t("labels");
      case ChartXAxisProperty.ASSIGNEES:
        return t("assignees");
      case ChartXAxisProperty.ESTIMATE_POINTS:
        return t("estimate");
      case ChartXAxisProperty.CYCLES:
        return t("cycle");
      case ChartXAxisProperty.MODULES:
        return t("module");
      case ChartXAxisProperty.COMPLETED_AT:
        return t("completed_date", { defaultValue: "Ngày hoàn thành" });
      case ChartXAxisProperty.TARGET_DATE:
        return t("due_date");
      case ChartXAxisProperty.START_DATE:
        return t("start_date");
      case ChartXAxisProperty.CREATED_AT:
        return t("created_date", { defaultValue: "Ngày tạo" });
      default:
        return defaultLabel ?? value;
    }
  };

  const xAxisOptions = useMemo(
    () =>
      ANALYTICS_X_AXIS_VALUES.filter((option) => option.value !== params.group_by).map((option) => ({
        ...option,
        label: getXAxisLabel(option.value, option.label),
      })),
    [params.group_by, t]
  );
  const groupByOptions = useMemo(
    () =>
      ANALYTICS_X_AXIS_VALUES.filter((option) => option.value !== params.x_axis).map((option) => ({
        ...option,
        label: getXAxisLabel(option.value, option.label),
      })),
    [params.x_axis, t]
  );
  const yAxisOptions = useMemo(
    () =>
      ANALYTICS_Y_AXIS_VALUES.map((option) => ({
        ...option,
        label:
          option.value === ChartYAxisMetric.WORK_ITEM_COUNT
            ? t("work_items")
            : option.value === ChartYAxisMetric.ESTIMATE_POINT_COUNT
              ? t("estimate")
              : option.value === ChartYAxisMetric.EPIC_WORK_ITEM_COUNT
                ? t("common.epics")
                : option.label,
      })),
    [t]
  );

  return (
    <div className={cn("flex w-full justify-between", classNames)}>
      <div className={`flex items-center gap-2`}>
        <Controller
          name="y_axis"
          control={control}
          render={({ field: { value, onChange } }) => (
            <SelectYAxis
              value={value}
              onChange={(val: ChartYAxisMetric | null) => {
                onChange(val);
              }}
              options={yAxisOptions}
              hiddenOptions={[
                ChartYAxisMetric.ESTIMATE_POINT_COUNT,
                isEpic ? ChartYAxisMetric.WORK_ITEM_COUNT : ChartYAxisMetric.EPIC_WORK_ITEM_COUNT,
              ]}
            />
          )}
        />
        <Controller
          name="x_axis"
          control={control}
          render={({ field: { value, onChange } }) => (
            <SelectXAxis
              value={value}
              onChange={(val) => {
                onChange(val);
              }}
              label={
                <div className="flex items-center gap-2">
                  <CalendarLayoutIcon className="h-3 w-3" />
                  <span className={cn("text-secondary", value && "text-primary")}>
                    {getXAxisLabel(value)}
                  </span>
                </div>
              }
              options={xAxisOptions}
            />
          )}
        />
        <Controller
          name="group_by"
          control={control}
          render={({ field: { value, onChange } }) => (
            <SelectXAxis
              value={value}
              onChange={(val) => {
                onChange(val);
              }}
              label={
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span className={cn("text-secondary", value && "text-primary")}>
                    {getXAxisLabel(value)}
                  </span>
                </div>
              }
              options={groupByOptions}
              placeholder={t("group_by", { defaultValue: "Nhóm theo" })}
              allowNoValue
            />
          )}
        />
      </div>
    </div>
  );
});
