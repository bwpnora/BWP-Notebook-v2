/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 * Customized & Developed by BWP Engineering Team
 */

import assert from "node:assert/strict";
import test from "node:test";
import { FALLBACK_LANGUAGE } from "../constants/language";
import { NAMESPACES } from "../constants/namespaces";
import { coreResources } from "../locales/resources";
import { dynamicLocaleLoaders } from "../locales/registry";
import { i18nInstance, initPromise } from "./instance";

test("FALLBACK_LANGUAGE is set to vi-VN", () => {
  assert.equal(FALLBACK_LANGUAGE, "vi-VN");
});

test("coreResources contains all 28 namespaces for vi-VN and en", () => {
  assert.ok(coreResources["vi-VN"], "vi-VN resources should exist");
  assert.ok(coreResources["en"], "en resources should exist");

  for (const ns of NAMESPACES) {
    assert.ok(coreResources["vi-VN"][ns], `vi-VN should have namespace: ${ns}`);
    assert.ok(coreResources["en"][ns], `en should have namespace: ${ns}`);
    assert.equal(typeof coreResources["vi-VN"][ns], "object");
    assert.equal(typeof coreResources["en"][ns], "object");
  }
});

test("dynamicLocaleLoaders contains loaders for secondary languages", async () => {
  assert.ok(dynamicLocaleLoaders.fr, "French loaders should exist");
  assert.ok(dynamicLocaleLoaders.ja, "Japanese loaders should exist");

  // Verify dynamic loading of a sample namespace
  const frCommonLoader = dynamicLocaleLoaders.fr.common;
  assert.equal(typeof frCommonLoader, "function");

  const frCommonMod = await frCommonLoader();
  const frCommon = frCommonMod.default || frCommonMod;
  assert.ok(frCommon, "Loaded module should exist");
  assert.equal(typeof frCommon, "object");
});

test("i18nInstance initializes properly and resolves fallback language vi-VN", async () => {
  await initPromise;
  assert.equal(i18nInstance.isInitialized, true);
  const fallbackLng = i18nInstance.options.fallbackLng;
  const resolved = Array.isArray(fallbackLng) ? fallbackLng[0] : fallbackLng;
  assert.equal(resolved, "vi-VN");
});
