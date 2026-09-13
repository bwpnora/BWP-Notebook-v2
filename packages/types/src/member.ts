/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export interface IDirectMemberCreateData {
  display_name: string;
  username: string;
  password: string;
  email?: string;
  role: number;
  project_id?: string;
  project_role?: number;
}

export interface IDirectMemberCreateResponse {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  role: number;
  credentials: {
    username: string;
    password: string;
  };
  project_id?: string;
  project_role?: number;
}
