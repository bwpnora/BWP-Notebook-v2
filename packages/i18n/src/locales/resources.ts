/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 * Customized & Developed by IT Leon
 */

// vi-VN namespaces
import viAccessibility from "./vi-VN/accessibility.json";
import viAuth from "./vi-VN/auth.json";
import viAutomation from "./vi-VN/automation.json";
import viCommon from "./vi-VN/common.json";
import viCycle from "./vi-VN/cycle.json";
import viEditor from "./vi-VN/editor.json";
import viEmptyState from "./vi-VN/empty-state.json";
import viHome from "./vi-VN/home.json";
import viInbox from "./vi-VN/inbox.json";
import viIntegration from "./vi-VN/integration.json";
import viModule from "./vi-VN/module.json";
import viNavigation from "./vi-VN/navigation.json";
import viNotification from "./vi-VN/notification.json";
import viPage from "./vi-VN/page.json";
import viPowerK from "./vi-VN/power-k.json";
import viProjectSettings from "./vi-VN/project-settings.json";
import viProject from "./vi-VN/project.json";
import viSettings from "./vi-VN/settings.json";
import viStickies from "./vi-VN/stickies.json";
import viTemplate from "./vi-VN/template.json";
import viTour from "./vi-VN/tour.json";
import viUpdate from "./vi-VN/update.json";
import viWiki from "./vi-VN/wiki.json";
import viWorkItemType from "./vi-VN/work-item-type.json";
import viWorkItem from "./vi-VN/work-item.json";
import viWorkflow from "./vi-VN/workflow.json";
import viWorkspaceSettings from "./vi-VN/workspace-settings.json";
import viWorkspace from "./vi-VN/workspace.json";

// en namespaces
import enAccessibility from "./en/accessibility.json";
import enAuth from "./en/auth.json";
import enAutomation from "./en/automation.json";
import enCommon from "./en/common.json";
import enCycle from "./en/cycle.json";
import enEditor from "./en/editor.json";
import enEmptyState from "./en/empty-state.json";
import enHome from "./en/home.json";
import enInbox from "./en/inbox.json";
import enIntegration from "./en/integration.json";
import enModule from "./en/module.json";
import enNavigation from "./en/navigation.json";
import enNotification from "./en/notification.json";
import enPage from "./en/page.json";
import enPowerK from "./en/power-k.json";
import enProjectSettings from "./en/project-settings.json";
import enProject from "./en/project.json";
import enSettings from "./en/settings.json";
import enStickies from "./en/stickies.json";
import enTemplate from "./en/template.json";
import enTour from "./en/tour.json";
import enUpdate from "./en/update.json";
import enWiki from "./en/wiki.json";
import enWorkItemType from "./en/work-item-type.json";
import enWorkItem from "./en/work-item.json";
import enWorkflow from "./en/workflow.json";
import enWorkspaceSettings from "./en/workspace-settings.json";
import enWorkspace from "./en/workspace.json";

export const coreResources: Record<string, Record<string, any>> = {
  "vi-VN": {
    accessibility: viAccessibility,
    auth: viAuth,
    automation: viAutomation,
    common: viCommon,
    cycle: viCycle,
    editor: viEditor,
    "empty-state": viEmptyState,
    home: viHome,
    inbox: viInbox,
    integration: viIntegration,
    module: viModule,
    navigation: viNavigation,
    notification: viNotification,
    page: viPage,
    "power-k": viPowerK,
    "project-settings": viProjectSettings,
    project: viProject,
    settings: viSettings,
    stickies: viStickies,
    template: viTemplate,
    tour: viTour,
    update: viUpdate,
    wiki: viWiki,
    "work-item-type": viWorkItemType,
    "work-item": viWorkItem,
    workflow: viWorkflow,
    "workspace-settings": viWorkspaceSettings,
    workspace: viWorkspace,
  },
  en: {
    accessibility: enAccessibility,
    auth: enAuth,
    automation: enAutomation,
    common: enCommon,
    cycle: enCycle,
    editor: enEditor,
    "empty-state": enEmptyState,
    home: enHome,
    inbox: enInbox,
    integration: enIntegration,
    module: enModule,
    navigation: enNavigation,
    notification: enNotification,
    page: enPage,
    "power-k": enPowerK,
    "project-settings": enProjectSettings,
    project: enProject,
    settings: enSettings,
    stickies: enStickies,
    template: enTemplate,
    tour: enTour,
    update: enUpdate,
    wiki: enWiki,
    "work-item-type": enWorkItemType,
    "work-item": enWorkItem,
    workflow: enWorkflow,
    "workspace-settings": enWorkspaceSettings,
    workspace: enWorkspace,
  },
};
