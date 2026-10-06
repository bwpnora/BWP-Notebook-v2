import { describe, expect, it } from "vitest";
import type { IIssueDisplayProperties, TIssue } from "@plane/types";
import { buildSpreadsheetCsvData } from "./spreadsheet-csv";

describe("buildSpreadsheetCsvData", () => {
  const mockIssues: TIssue[] = [
    {
      id: "issue-1",
      sequence_id: 133,
      name: 'Fix "TIVI", living room',
      sort_order: 1,
      state_id: "state-done",
      priority: "high",
      label_ids: ["label-1", "label-2"],
      assignee_ids: ["user-1"],
      estimate_point: null,
      sub_issues_count: 0,
      attachment_count: 2,
      link_count: 1,
      project_id: "proj-1",
      parent_id: null,
      cycle_id: "cycle-1",
      module_ids: ["mod-1"],
      type_id: "operational",
      supporter_ids: ["user-2"],
      room: 2415,
      notes: "Cần thay dây HDMI\nĐã kiểm tra sáng nay",
      created_at: "2026-10-06T07:00:00Z",
      updated_at: "2026-10-06T08:00:00Z",
      start_date: "2026-10-06",
      target_date: "2026-10-07",
      completed_at: null,
    } as unknown as TIssue,
    {
      id: "issue-2",
      sequence_id: 134,
      name: "Sự kiện phòng họp",
      sort_order: 2,
      state_id: "state-todo",
      priority: null,
      label_ids: [],
      assignee_ids: [],
      estimate_point: "3",
      sub_issues_count: 2,
      attachment_count: 0,
      link_count: 0,
      project_id: "proj-1",
      parent_id: null,
      cycle_id: null,
      module_ids: null,
      type_id: "other",
      supporter_ids: [],
      room: null,
      notes: null,
      created_at: "2026-10-05T07:00:00Z",
      updated_at: "2026-10-05T08:00:00Z",
      start_date: null,
      target_date: null,
      completed_at: null,
    } as unknown as TIssue,
  ];

  const defaultDisplayProperties: IIssueDisplayProperties = {
    key: true,
    state: true,
    priority: true,
    issue_type: true,
    assignee: true,
    supporter: true,
    room: true,
    notes: true,
    labels: true,
    modules: true,
    cycle: true,
    start_date: true,
    due_date: true,
    estimate: true,
    created_on: true,
    updated_on: true,
    link: true,
    attachment_count: true,
    sub_issue_count: true,
  };

  const mockLookups = {
    projectIdentifier: "IT",
    getStateName: (id: string | null | undefined) => (id === "state-done" ? "Hoàn thành" : "Chưa bắt đầu"),
    getUserName: (id: string | null | undefined) =>
      id === "user-1" ? "Hồ Quốc Bảo" : id === "user-2" ? "Võ Thiện Tâm" : "",
    getLabelName: (id: string | null | undefined) => (id === "label-1" ? "Khẩn" : id === "label-2" ? "Bảo trì" : ""),
    getModuleName: (id: string | null | undefined) => (id === "mod-1" ? "Module A" : ""),
    getCycleName: (id: string | null | undefined) => (id === "cycle-1" ? "Sprint 1" : ""),
    translatePriority: (p: string) => (p === "high" ? "Cao" : p),
    formatDate: (d: string | null | undefined) => (d ? `formatted-${d.slice(0, 10)}` : ""),
    translateHeader: (key: string) => {
      const map: Record<string, string> = {
        "issue.display.properties.id": "Mã",
        work_items: "Công việc",
        "common.state": "Trạng thái",
        "common.priority": "Ưu tiên",
        "Loại công việc": "Loại công việc",
        "common.assignees": "Người phụ trách",
        "Người hỗ trợ": "Người hỗ trợ",
        "Số phòng": "Số phòng",
        "Ghi chú": "Ghi chú",
        "common.labels": "Nhãn",
        "common.modules": "Module",
        "common.cycle": "Chu kỳ",
        "common.order_by.start_date": "Ngày bắt đầu",
        "common.order_by.due_date": "Hạn chót",
        "common.estimate": "Ước tính",
        "common.sort.created_on": "Thời gian tạo",
        "common.sort.updated_on": "Thời gian cập nhật",
        "common.link": "Liên kết",
        "common.attachment": "Tệp đính kèm",
        "issue.display.properties.sub_issue": "Công việc con",
      };
      return map[key] ?? key;
    },
  };

  it("exports all visible columns when all displayProperties are true", () => {
    const result = buildSpreadsheetCsvData({
      issues: mockIssues,
      displayProperties: defaultDisplayProperties,
      isEstimateEnabled: true,
      lookups: mockLookups,
    });

    const columnKeys = result.columns.map((c) => c.key);
    expect(columnKeys).toContain("identifier");
    expect(columnKeys).toContain("name");
    expect(columnKeys).toContain("state");
    expect(columnKeys).toContain("priority");
    expect(columnKeys).toContain("issue_type");
    expect(columnKeys).toContain("assignee");
    expect(columnKeys).toContain("supporter");
    expect(columnKeys).toContain("room");
    expect(columnKeys).toContain("notes");

    const row1 = result.rows[0];
    expect(row1.identifier).toBe("IT-133");
    expect(row1.name).toBe('Fix "TIVI", living room');
    expect(row1.state).toBe("Hoàn thành");
    expect(row1.priority).toBe("Cao");
    expect(row1.issue_type).toBe("Công việc vận hành");
    expect(row1.assignee).toBe("Hồ Quốc Bảo");
    expect(row1.supporter).toBe("Võ Thiện Tâm");
    expect(row1.room).toBe("Phòng 2415");
    expect(row1.notes).toBe("Cần thay dây HDMI\nĐã kiểm tra sáng nay");
    expect(row1.labels).toBe("Khẩn; Bảo trì");

    const row2 = result.rows[1];
    expect(row2.identifier).toBe("IT-134");
    expect(row2.priority).toBe("");
    expect(row2.issue_type).toBe("Công việc khác");
    expect(row2.room).toBe("");
    expect(row2.notes).toBe("");
  });

  it("excludes hidden columns when displayProperties are false", () => {
    const displayProperties: IIssueDisplayProperties = {
      ...defaultDisplayProperties,
      key: false,
      priority: false,
      notes: false,
      room: false,
    };

    const result = buildSpreadsheetCsvData({
      issues: mockIssues,
      displayProperties,
      isEstimateEnabled: true,
      lookups: mockLookups,
    });

    const columnKeys = result.columns.map((c) => c.key);
    expect(columnKeys).not.toContain("identifier");
    expect(columnKeys).not.toContain("priority");
    expect(columnKeys).not.toContain("notes");
    expect(columnKeys).not.toContain("room");
    expect(columnKeys).toContain("name");
    expect(columnKeys).toContain("state");

    expect(result.rows[0].identifier).toBeUndefined();
    expect(result.rows[0].notes).toBeUndefined();
  });

  it("excludes cycle and modules if omitted in spreadsheetColumnsList", () => {
    const spreadsheetColumnsList = ["state", "priority", "room"] as (keyof IIssueDisplayProperties)[];

    const result = buildSpreadsheetCsvData({
      issues: mockIssues,
      displayProperties: defaultDisplayProperties,
      spreadsheetColumnsList,
      isEstimateEnabled: true,
      lookups: mockLookups,
    });

    const columnKeys = result.columns.map((c) => c.key);
    expect(columnKeys).toEqual(["identifier", "name", "state", "priority", "room"]);
  });

  it("excludes estimate if isEstimateEnabled is false", () => {
    const result = buildSpreadsheetCsvData({
      issues: mockIssues,
      displayProperties: defaultDisplayProperties,
      isEstimateEnabled: false,
      lookups: mockLookups,
    });

    const columnKeys = result.columns.map((c) => c.key);
    expect(columnKeys).not.toContain("estimate");
  });
});
