/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Lock, DoorClosed, UploadCloud, Paperclip, X } from "lucide-react";
// propel
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// types
import type { TIssuePriorities } from "@plane/types";
// ui & utils
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useFileSize } from "@/hooks/use-file-size";
import { useMemberRole } from "@/hooks/use-member-role";
// services
import { IssueService, IssueAttachmentService } from "@/services/issue";

const issueService = new IssueService();
const issueAttachmentService = new IssueAttachmentService();

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type MemberTaskFormProps = {
  workspaceSlug?: string;
};

export const MemberTaskForm = observer(function MemberTaskForm(props: MemberTaskFormProps) {
  const params = useParams();
  const routeWorkspaceSlug = Array.isArray(params?.workspaceSlug) ? params.workspaceSlug[0] : params?.workspaceSlug;
  const { currentWorkspace } = useWorkspace();
  const activeWorkspaceSlug = props.workspaceSlug || routeWorkspaceSlug || currentWorkspace?.slug || "";

  // store hooks
  const {
    joinedProjectIds,
    workspaceProjectIds,
    getProjectById,
    getPartialProjectById,
    fetchProjects,
    loader: projectLoader,
  } = useProject();

  const {
    getUserDetails,
    project: { fetchProjectMembers },
  } = useMember();

  const { isAdminOrAbove } = useMemberRole(activeWorkspaceSlug);
  const { maxFileSize } = useFileSize();

  // form states
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [supporters, setSupporters] = useState<string[]>([]);
  const [priority, setPriority] = useState<TIssuePriorities>("none");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // fetch projects on mount if needed
  useEffect(() => {
    if (activeWorkspaceSlug) {
      fetchProjects(activeWorkspaceSlug).catch(() => {});
    }
  }, [activeWorkspaceSlug, fetchProjects]);

  // derive accessible projects for member
  const availableProjectIds = useMemo(() => {
    if (joinedProjectIds && joinedProjectIds.length > 0) {
      return joinedProjectIds;
    }
    if (isAdminOrAbove && workspaceProjectIds && workspaceProjectIds.length > 0) {
      return workspaceProjectIds;
    }
    return [];
  }, [joinedProjectIds, isAdminOrAbove, workspaceProjectIds]);

  const availableProjects = useMemo(() => {
    const list: ReturnType<typeof getProjectById>[] = [];
    for (const id of availableProjectIds) {
      const p = getProjectById(id) || getPartialProjectById(id);
      if (p) list.push(p);
    }
    return list;
  }, [availableProjectIds, getProjectById, getPartialProjectById]);

  // auto-select first project or pre-select if only 1 project
  useEffect(() => {
    if (availableProjects.length > 0) {
      if (!selectedProjectId || !availableProjects.some((p) => p?.id === selectedProjectId)) {
        setSelectedProjectId(availableProjects[0]?.id || "");
      }
    }
  }, [availableProjects, selectedProjectId]);

  // proactively fetch members whenever selected project changes
  useEffect(() => {
    if (activeWorkspaceSlug && selectedProjectId) {
      fetchProjectMembers(activeWorkspaceSlug, selectedProjectId).catch(() => {});
    }
  }, [activeWorkspaceSlug, selectedProjectId, fetchProjectMembers]);

  // handle department change
  const handleDepartmentChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setAssignees([]);
    setSupporters([]);
  };

  // dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setAttachments((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    multiple: true,
    disabled: isSubmitting,
  });

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveAssignee = (userId: string) => {
    setAssignees((prev) => prev.filter((id) => id !== userId));
  };

  const handleRemoveSupporter = (userId: string) => {
    setSupporters((prev) => prev.filter((id) => id !== userId));
  };

  // form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeWorkspaceSlug) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Không tìm thấy thông tin không gian làm việc",
      });
      return;
    }

    if (!selectedProjectId) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Vui lòng chọn phòng ban",
      });
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Vui lòng nhập tiêu đề công việc",
      });
      return;
    }

    let parsedRoom: number | null = null;
    if (room.trim() !== "") {
      const parsed = parseInt(room.trim(), 10);
      if (Number.isNaN(parsed)) {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Số phòng phải là một số hợp lệ",
        });
        return;
      }
      parsedRoom = parsed;
    }

    const descriptionHtml = description.trim()
      ? description
          .trim()
          .split("\n")
          .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
          .join("")
      : "<p></p>";

    const payload = {
      name: trimmedTitle,
      description_html: descriptionHtml,
      priority: priority || "none",
      assignees,
      assignee_ids: assignees,
      supporters,
      supporter_ids: supporters,
      room: parsedRoom,
      task_type: "operational",
      type_id: "operational",
    };

    setIsSubmitting(true);
    try {
      const issue = await issueService.createIssue(activeWorkspaceSlug, selectedProjectId, payload as any);

      // upload attachments if present
      if (attachments.length > 0 && issue?.id) {
        await Promise.allSettled(
          attachments.map((file) =>
            issueAttachmentService
              .uploadIssueAttachment(activeWorkspaceSlug, selectedProjectId, issue.id, file)
              .catch((uploadError) => {
                console.error("Failed to upload attachment", file.name, uploadError);
              })
          )
        );
      }

      // success toast without view issue link
      setToast({
        title: "Công việc đã được tạo thành công",
        type: TOAST_TYPE.SUCCESS,
      });

      // reset form fields while retaining selected department
      setTitle("");
      setRoom("");
      setDescription("");
      setAssignees([]);
      setSupporters([]);
      setPriority("none");
      setAttachments([]);
    } catch (error: any) {
      console.error("Task creation failed", error);
      const errorMessage =
        error?.error ||
        error?.detail ||
        error?.message ||
        (typeof error === "string" ? error : "Đã xảy ra lỗi khi tạo công việc. Vui lòng thử lại.");
      setToast({
        title: "Không thể tạo công việc",
        message: errorMessage,
        type: TOAST_TYPE.ERROR,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = availableProjects.find((p) => p?.id === selectedProjectId);
  const isLoadingProjects = projectLoader === "init-loader" && availableProjects.length === 0;

  if (isLoadingProjects) {
    return (
      <div className="text-custom-text-300 flex items-center justify-center gap-3 py-12">
        <LogoSpinner />
        <span className="text-sm">Đang tải thông tin phòng ban...</span>
      </div>
    );
  }

  if (availableProjects.length === 0) {
    return (
      <div className="border-yellow-500/30 bg-yellow-500/10 text-sm text-yellow-500 rounded-md border p-4">
        Bạn chưa được gán vào phòng ban nào. Vui lòng liên hệ Quản trị viên để được thêm vào phòng ban trước khi tạo
        công việc.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Department selection */}
      <div className="flex flex-col gap-1.5">
        {availableProjects.length === 1 ? (
          <>
            <span className="text-sm text-custom-text-100 font-medium">Phòng ban</span>
            <div className="border-custom-border-200 bg-custom-background-80 text-sm text-custom-text-100 flex items-center gap-2 rounded-md border px-3 py-2">
              <Lock className="text-custom-text-300 h-4 w-4" />
              <span className="font-medium">{selectedProject?.name || "Phòng ban"}</span>
              {selectedProject?.identifier && (
                <span className="bg-custom-background-90 text-xs text-custom-text-300 rounded px-1.5 py-0.5">
                  {selectedProject.identifier}
                </span>
              )}
              <span className="text-xs text-custom-text-300 ml-auto italic">(Được khóa theo phòng ban của bạn)</span>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="department-select" className="text-sm text-custom-text-100 font-medium">
              Phòng ban
            </label>
            <select
              id="department-select"
              value={selectedProjectId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={isSubmitting}
              className="border-custom-border-200 bg-custom-background-100 text-sm text-custom-text-100 focus:border-custom-primary-100 w-full rounded-md border px-3 py-2 focus:outline-none"
            >
              {availableProjects.map((project) => (
                <option key={project?.id} value={project?.id}>
                  {project?.name} {project?.identifier ? `(${project.identifier})` : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Task Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-sm text-custom-text-100 font-medium">
          Tiêu đề công việc <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          placeholder="Nhập tiêu đề công việc..."
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          className="border-custom-border-200 bg-custom-background-100 text-sm text-custom-text-100 placeholder:text-custom-text-400 focus:border-custom-primary-100 w-full rounded-md border px-3 py-2 focus:outline-none"
        />
      </div>

      {/* Room and Priority row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Room number */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-room" className="text-sm text-custom-text-200 font-medium">
            Số phòng (Room)
          </label>
          <div className="relative flex items-center">
            <DoorClosed className="text-custom-text-300 pointer-events-none absolute left-2.5 h-4 w-4" />
            <input
              id="task-room"
              type="number"
              min="0"
              placeholder="Ví dụ: 101"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={isSubmitting}
              className="border-custom-border-200 bg-custom-background-100 text-sm text-custom-text-100 placeholder:text-custom-text-400 focus:border-custom-primary-100 w-full rounded-md border py-2 pr-3 pl-8 focus:outline-none"
            />
          </div>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-custom-text-200 font-medium">Mức độ ưu tiên</span>
          <div className="h-9">
            <PriorityDropdown
              value={priority}
              onChange={(val) => setPriority(val)}
              buttonVariant="border-with-text"
              buttonClassName="h-9 w-full justify-start text-left text-xs"
              dropdownArrow
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Assignees and Supporters row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Assignees */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-custom-text-200 font-medium">Người thực hiện</span>
          <div className="h-9">
            <MemberDropdown
              projectId={selectedProjectId}
              value={assignees}
              onChange={setAssignees}
              multiple
              placeholder="Chọn người thực hiện"
              buttonVariant="border-with-text"
              buttonClassName="h-9 w-full justify-start text-left text-xs"
              disabled={isSubmitting || !selectedProjectId}
            />
          </div>
          {assignees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {assignees.map((id) => {
                const user = getUserDetails(id);
                const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
                const name = user?.display_name || fullName || user?.email || id;
                return (
                  <span
                    key={id}
                    className="border-custom-border-200 bg-custom-background-80 text-xs text-custom-text-200 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5"
                  >
                    <Avatar name={name} src={getFileURL(user?.avatar_url ?? "")} size={16} shape="circle" />
                    <span className="max-w-[120px] truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(id)}
                      disabled={isSubmitting}
                      className="hover:text-custom-text-100 text-custom-text-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Supporters */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-custom-text-200 font-medium">Người hỗ trợ</span>
          <div className="h-9">
            <MemberDropdown
              projectId={selectedProjectId}
              value={supporters}
              onChange={setSupporters}
              multiple
              placeholder="Chọn người hỗ trợ"
              buttonVariant="border-with-text"
              buttonClassName="h-9 w-full justify-start text-left text-xs"
              disabled={isSubmitting || !selectedProjectId}
            />
          </div>
          {supporters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {supporters.map((id) => {
                const user = getUserDetails(id);
                const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
                const name = user?.display_name || fullName || user?.email || id;
                return (
                  <span
                    key={id}
                    className="border-custom-border-200 bg-custom-background-80 text-xs text-custom-text-200 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5"
                  >
                    <Avatar name={name} src={getFileURL(user?.avatar_url ?? "")} size={16} shape="circle" />
                    <span className="max-w-[120px] truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSupporter(id)}
                      disabled={isSubmitting}
                      className="hover:text-custom-text-100 text-custom-text-400 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-description" className="text-sm text-custom-text-200 font-medium">
          Mô tả chi tiết
        </label>
        <textarea
          id="task-description"
          rows={4}
          placeholder="Nhập nội dung mô tả chi tiết công việc hoặc yêu cầu vận hành..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          className="border-custom-border-200 bg-custom-background-100 text-sm text-custom-text-100 placeholder:text-custom-text-400 focus:border-custom-primary-100 w-full resize-y rounded-md border px-3 py-2 focus:outline-none"
        />
      </div>

      {/* Attachments Dropzone */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-custom-text-200 font-medium">Tệp đính kèm</span>
        <div
          {...getRootProps()}
          className={`text-xs flex flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors ${
            isDragActive
              ? "border-custom-primary-100 bg-custom-primary-100/10"
              : "border-custom-border-200 bg-custom-background-80/50 hover:bg-custom-background-80"
          } ${isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="text-custom-text-300 mb-1 h-6 w-6" />
          <p className="text-custom-text-200 font-medium">
            {isDragActive ? "Thả tệp vào đây..." : "Kéo thả tệp vào đây, hoặc nhấn để chọn tệp"}
          </p>
          <p className="text-custom-text-400 mt-0.5 text-[11px]">
            Tối đa {(maxFileSize / (1024 * 1024)).toFixed(0)}MB mỗi tệp
          </p>
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-col gap-1 pt-1.5">
            {attachments.map((file, idx) => (
              <div
                key={`${file.name}-${file.lastModified}-${file.size}`}
                className="border-custom-border-200 bg-custom-background-80 text-xs text-custom-text-200 flex items-center justify-between rounded-md border px-3 py-1.5"
              >
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="text-custom-text-300 h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-custom-text-400">({formatFileSize(file.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  disabled={isSubmitting}
                  className="hover:text-custom-text-100 text-custom-text-400 ml-2 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="border-custom-border-200 flex justify-end border-t pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || !selectedProjectId || !title.trim()}
        >
          {isSubmitting ? "Đang tạo công việc..." : "Tạo công việc"}
        </Button>
      </div>
    </form>
  );
});
