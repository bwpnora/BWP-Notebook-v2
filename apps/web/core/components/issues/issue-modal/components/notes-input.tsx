import React from "react";
import { observer } from "mobx-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { FileText } from "lucide-react";
import type { TIssue } from "@plane/types";

type TIssueNotesInputProps = {
  control: Control<TIssue>;
  handleFormChange: () => void;
};

export const IssueNotesInput = observer(function IssueNotesInput(props: TIssueNotesInputProps) {
  const { control, handleFormChange } = props;

  return (
    <div className="focus-within:border-secondary relative rounded-lg border-[0.5px] border-subtle-1 bg-layer-2 px-3 py-2.5 transition-colors">
      <div className="text-xs mb-1.5 flex items-center gap-1.5 font-medium text-secondary">
        <FileText className="h-3.5 w-3.5 text-tertiary" />
        <span>Ghi chú công việc</span>
      </div>
      <Controller
        control={control}
        name="notes"
        render={({ field: { value, onChange } }) => (
          <textarea
            value={value ?? ""}
            onChange={(e) => {
              onChange(e.target.value || null);
              handleFormChange();
            }}
            placeholder="Nhập ghi chú công việc, dặn dò hoặc lưu ý vận hành..."
            rows={2}
            className="text-sm min-h-[48px] w-full resize-y bg-transparent leading-relaxed text-primary outline-none placeholder:text-placeholder"
          />
        )}
      />
    </div>
  );
});
