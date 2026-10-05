/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * Code & Architecture by BWP Engineering Team
 */

import type { TFilterProperty } from "@plane/types";
import { COLLECTION_OPERATOR, EQUALITY_OPERATOR } from "@plane/types";
import type {
  IFilterIconConfig,
  TCreateFilterConfig,
  TCreateFilterConfigParams,
  TCreateUserFilterParams,
} from "../../../rich-filters";
import {
  createFilterConfig,
  createOperatorConfigEntry,
  getMemberMultiSelectConfig,
  getMultiSelectConfig,
  getSingleSelectConfig,
} from "../../../rich-filters";
import type { TWorkTypeKey } from "../../column-filters";
import { WORK_TYPE_OPTIONS } from "../../column-filters";

// ------------ Supporter filter ------------

export const getSupporterFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateUserFilterParams> =>
  (params: TCreateUserFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Người hỗ trợ",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getMemberMultiSelectConfig(updatedParams, EQUALITY_OPERATOR.EXACT)
        ),
      ]),
    });

// ------------ Work type filter ------------

export type TCreateWorkTypeFilterParams = TCreateFilterConfigParams & IFilterIconConfig<TWorkTypeKey>;

export const getWorkTypeFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateWorkTypeFilterParams> =>
  (params: TCreateWorkTypeFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Loại công việc",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(COLLECTION_OPERATOR.IN, params, (updatedParams) =>
          getMultiSelectConfig<{ key: TWorkTypeKey; label: string }, TWorkTypeKey, TWorkTypeKey>(
            {
              items: WORK_TYPE_OPTIONS,
              getId: (option) => option.key,
              getLabel: (option) => option.label,
              getValue: (option) => option.key,
              getIconData: (option) => option.key,
            },
            { singleValueOperator: EQUALITY_OPERATOR.EXACT, ...updatedParams },
            { getOptionIcon: updatedParams.getOptionIcon }
          )
        ),
      ]),
    });

// ------------ Room search filter ------------
// Edited from the spreadsheet column menu; registered here so an applied condition
// renders correctly in the header filters row ("Số phòng: chứa 17").

export type TCreateRoomSearchFilterParams = TCreateFilterConfigParams &
  IFilterIconConfig<string> & {
    roomSearchValues: string[];
  };

export const getRoomSearchFilterConfig =
  <P extends TFilterProperty>(key: P): TCreateFilterConfig<P, TCreateRoomSearchFilterParams> =>
  (params: TCreateRoomSearchFilterParams) =>
    createFilterConfig<P>({
      id: key,
      label: "Số phòng",
      ...params,
      icon: params.filterIcon,
      supportedOperatorConfigsMap: new Map([
        createOperatorConfigEntry(EQUALITY_OPERATOR.EXACT, params, (updatedParams) =>
          getSingleSelectConfig<string, string>(
            {
              items: updatedParams.roomSearchValues,
              getId: (value) => value,
              getLabel: (value) => `chứa ${value}`,
              getValue: (value) => value,
            },
            { ...updatedParams }
          )
        ),
      ]),
    });
