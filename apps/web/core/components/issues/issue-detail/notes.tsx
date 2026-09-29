import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { FileText } from "lucide-react";
import { cn } from "@plane/utils";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TIssueOperations } from "./root";

type TIssueDetailNotesProps = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueOperations: TIssueOperations;
  disabled?: boolean;
  className?: string;
};

export const IssueDetailNotes = observer(function IssueDetailNotes(props: TIssueDetailNotesProps) {
  const { workspaceSlug, projectId, issueId, issueOperations, disabled = false, className = "" } = props;

  const {
    issue: { getIssueById },
  } = useIssueDetail();

  const issue = issueId ? getIssueById(issueId) : undefined;
  const currentNotes = issue?.notes ?? "";

  const [noteValue, setNoteValue] = useState(currentNotes);

  useEffect(() => {
    setNoteValue(issue?.notes ?? "");
  }, [issue?.notes]);

  const handleBlur = () => {
    if (disabled) return;
    const trimmed = noteValue.trim();
    const existing = (issue?.notes ?? "").trim();
    if (trimmed !== existing) {
      issueOperations.update(workspaceSlug, projectId, issueId, {
        notes: trimmed || null,
      });
    }
  };

  return (
    <div
      className={cn(
        "focus-within:border-secondary rounded-lg border-[0.5px] border-subtle-1 bg-layer-2/60 p-3.5 transition-colors focus-within:bg-layer-2",
        disabled && "opacity-70",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-body-xs-medium font-medium text-secondary">
        <FileText className="size-4 text-tertiary" />
        <span>Ghi chú công việc</span>
      </div>
      <textarea
        value={noteValue}
        disabled={disabled}
        onChange={(e) => setNoteValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={disabled ? "Chưa có ghi chú" : "Nhập ghi chú công việc, dặn dò hoặc lưu ý vận hành..."}
        rows={3}
        className={cn(
          "min-h-[64px] w-full resize-y bg-transparent text-body-xs-regular leading-relaxed text-primary outline-none placeholder:text-placeholder",
          disabled && "cursor-default"
        )}
      />
    </div>
  );
});
