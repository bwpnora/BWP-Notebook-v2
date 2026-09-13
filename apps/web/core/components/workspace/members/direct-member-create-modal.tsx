/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Wand2, KeyRound, Eye, EyeOff, UserPlus, Mail, Shield, AlertCircle } from "lucide-react";
import { Button } from "@plane/propel/button";
import { ChevronDownIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import type { IDirectMemberCreateData, IDirectMemberCreateResponse } from "@plane/types";
import { CustomSelect, EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { CredentialSummaryCard } from "./credential-summary-card";

/**
 * Remove Vietnamese accents and convert to snake_case-friendly ASCII string
 */
export const removeVietnameseTones = (str: string): string => {
  return str
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
};

/**
 * Generate a random username from display name adhering to ^[a-z0-9_]{3,30}$
 */
export const generateRandomUsername = (displayName?: string): string => {
  const base = displayName ? removeVietnameseTones(displayName) : "";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  let username = "";

  if (!base) {
    username = `user_${randomSuffix}`;
  } else {
    const trimmedBase = base.slice(0, 24).replace(/_+$/, "");
    username = `${trimmedBase}_${randomSuffix}`;
  }

  if (username.length < 3) {
    username = (username + "_abc").slice(0, 30);
  }

  return username.toLowerCase().slice(0, 30);
};

const getRandomChar = (chars: string): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return chars[array[0] % chars.length];
};

/**
 * Generate a cryptographically secure 14-char password with upper, lower, numbers, and safe symbols
 */
export const generateStrongPassword = (length = 14): string => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=";
  const allChars = lowercase + uppercase + numbers + symbols;

  const passwordChars = [
    getRandomChar(lowercase),
    getRandomChar(uppercase),
    getRandomChar(numbers),
    getRandomChar(symbols),
  ];

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
};

export type TDirectMemberCreateFormValues = {
  displayName: string;
  username: string;
  password: string;
  email?: string;
  role: number;
  projectRole?: number;
};

export type TDirectMemberCreateFormProps = {
  workspaceSlug?: string;
  projectId?: string;
  projectName?: string;
  onSuccess?: (createdData: IDirectMemberCreateResponse) => void;
  onCancel?: () => void;
  onSwitchToInvite?: () => void;
};

export const DirectMemberCreateForm = observer(function DirectMemberCreateForm(props: TDirectMemberCreateFormProps) {
  const { workspaceSlug: propWorkspaceSlug, projectId, projectName, onSuccess, onCancel, onSwitchToInvite } = props;
  const params = useParams();
  const workspaceSlug = (propWorkspaceSlug ?? (params?.workspaceSlug as string | undefined))?.toString() ?? "";

  const {
    workspace: { directCreateMember },
    project: { fetchProjectMembers },
  } = useMember();
  const { getProjectById } = useProject();

  const currentProjectName = projectName || (projectId ? getProjectById(projectId)?.name : undefined);

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TDirectMemberCreateFormValues>({
    defaultValues: {
      displayName: "",
      username: "",
      password: "",
      email: "",
      role: 15,
      projectRole: 15,
    },
  });

  const displayNameValue = watch("displayName");

  const handleAutoGenerateUsername = () => {
    const username = generateRandomUsername(displayNameValue);
    setValue("username", username, { shouldValidate: true });
  };

  const handleAutoGeneratePassword = () => {
    const strongPassword = generateStrongPassword(14);
    setValue("password", strongPassword, { shouldValidate: true });
    setShowPassword(true);
  };

  const onSubmit = async (data: TDirectMemberCreateFormValues) => {
    if (!workspaceSlug || isSubmitting) return;

    setFormError(null);

    const payload: IDirectMemberCreateData = {
      display_name: data.displayName.trim(),
      username: data.username.trim().toLowerCase(),
      password: data.password,
      role: Number(data.role),
    };

    if (data.email && data.email.trim()) {
      payload.email = data.email.trim();
    }

    if (projectId) {
      payload.project_id = projectId;
      payload.project_role = Number(data.projectRole ?? data.role ?? 15);
    }

    try {
      const response = await directCreateMember(workspaceSlug, payload);

      if (projectId) {
        await fetchProjectMembers(workspaceSlug, projectId);
      }

      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Thành công!",
        message: `Đã tạo tài khoản cho ${response.display_name}`,
      });

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error: any) {
      let message = "Đã có lỗi xảy ra, vui lòng kiểm tra lại thông tin.";
      if (error?.error) {
        message = error.error;
      } else if (error?.message) {
        message = error.message;
      }
      setFormError(message);
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Lỗi tạo tài khoản",
        message,
      });
    }
  };

  const roles = [
    { value: 20, label: "Quản trị viên (Admin)" },
    { value: 15, label: "Thành viên (Member)" },
    { value: 5, label: "Khách (Guest)" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      {/* Dual Tab Header if onSwitchToInvite is provided */}
      {onSwitchToInvite && (
        <div className="mb-4 flex gap-2 border-b border-subtle pb-3">
          <button
            type="button"
            className="border-accent-primary flex items-center gap-1.5 border-b-2 pb-1 text-13 font-medium text-accent-primary"
          >
            <UserPlus className="h-4 w-4" />
            Tạo tài khoản trực tiếp
          </button>
          <button
            type="button"
            onClick={onSwitchToInvite}
            className="flex items-center gap-1.5 border-b-2 border-transparent pb-1 text-13 font-medium text-secondary transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            Mời qua email
          </button>
        </div>
      )}

      {/* Scope info banner */}
      {projectId && (
        <div className="flex items-center gap-2 rounded-md border border-subtle bg-surface-2 p-3 text-13 text-secondary">
          <Shield className="h-4 w-4 shrink-0 text-accent-primary" />
          <span>
            Tài khoản mới sẽ được tạo trong đơn vị và tự động thêm vào phòng ban:{" "}
            <strong className="text-primary">{currentProjectName || "hiện tại"}</strong>.
          </span>
        </div>
      )}

      {/* Inline Form Error */}
      {formError && (
        <div className="flex items-center gap-2 rounded-md border border-danger-strong/30 bg-danger-subtle/10 p-3 text-13 text-danger-primary">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Full Name / Display Name */}
        <div className="space-y-1">
          <label className="text-13 font-medium text-primary" htmlFor="displayName">
            Họ và tên <span className="text-danger-primary">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            placeholder="Ví dụ: Trần Văn Bình"
            className="focus:border-accent-primary w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary transition-colors outline-none"
            {...register("displayName", {
              required: "Vui lòng nhập họ và tên",
              maxLength: { value: 255, message: "Họ và tên không vượt quá 255 ký tự" },
            })}
          />
          {errors.displayName && <p className="text-12 text-danger-primary">{errors.displayName.message}</p>}
        </div>

        {/* Username with Auto-generation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-13 font-medium text-primary" htmlFor="username">
              Tên đăng nhập <span className="text-danger-primary">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateUsername}
              className="flex items-center gap-1 text-12 font-medium text-accent-primary hover:underline"
            >
              <Wand2 className="h-3 w-3" />
              Sinh tự động
            </button>
          </div>
          <div className="relative">
            <input
              id="username"
              type="text"
              placeholder="tran_van_binh_1234"
              className="font-mono focus:border-accent-primary w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary lowercase transition-colors outline-none"
              {...register("username", {
                required: "Vui lòng nhập tên đăng nhập",
                pattern: {
                  value: /^[a-z0-9_]{3,30}$/,
                  message: "Tên đăng nhập phải từ 3-30 ký tự, chỉ gồm chữ thường không dấu, số và dấu gạch dưới (_)",
                },
              })}
            />
          </div>
          {errors.username ? (
            <p className="text-12 text-danger-primary">{errors.username.message}</p>
          ) : (
            <p className="text-11 text-placeholder">3-30 ký tự, chữ thường không dấu, số và gạch dưới (_)</p>
          )}
        </div>

        {/* Password with Strong Generator and Show/Hide */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-13 font-medium text-primary" htmlFor="password">
              Mật khẩu khởi tạo <span className="text-danger-primary">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGeneratePassword}
              className="flex items-center gap-1 text-12 font-medium text-accent-primary hover:underline"
            >
              <KeyRound className="h-3 w-3" />
              Sinh mật khẩu mạnh
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập hoặc bấm 'Sinh mật khẩu mạnh'"
              className="font-mono focus:border-accent-primary w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 pr-10 text-13 text-primary transition-colors outline-none"
              {...register("password", {
                required: "Vui lòng nhập mật khẩu",
                minLength: { value: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              })}
            />
            <Tooltip tooltipContent={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-0.5 text-placeholder transition-colors hover:text-primary"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
          {errors.password && <p className="text-12 text-danger-primary">{errors.password.message}</p>}
        </div>

        {/* Email (Optional) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-13 font-medium text-primary" htmlFor="email">
              Email
            </label>
            <span className="text-11 text-placeholder">(Không bắt buộc)</span>
          </div>
          <input
            id="email"
            type="email"
            placeholder="nhan_vien@company.com"
            className="focus:border-accent-primary w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13 text-primary transition-colors outline-none"
            {...register("email", {
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Địa chỉ email không đúng định dạng",
              },
            })}
          />
          {errors.email && <p className="text-12 text-danger-primary">{errors.email.message}</p>}
        </div>

        {/* Role in Workspace */}
        <div className="space-y-1">
          <span className="block text-13 font-medium text-primary">
            Vai trò trong đơn vị <span className="text-danger-primary">*</span>
          </span>
          <Controller
            control={control}
            name="role"
            rules={{ required: "Vui lòng chọn vai trò" }}
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={field.onChange}
                customButton={
                  <div className="shadow-sm flex w-full items-center justify-between gap-1 rounded-md border border-subtle px-3 py-2 text-left text-13 text-primary duration-200 hover:bg-layer-1 focus:outline-none">
                    <span>{roles.find((r) => r.value === Number(field.value))?.label ?? "Chọn vai trò"}</span>
                    <ChevronDownIcon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                  </div>
                }
                input
              >
                {roles.map((item) => (
                  <CustomSelect.Option key={item.value} value={item.value}>
                    {item.label}
                  </CustomSelect.Option>
                ))}
              </CustomSelect>
            )}
          />
        </div>

        {/* Project Role if scoped to project */}
        {projectId && (
          <div className="space-y-1">
            <span className="block text-13 font-medium text-primary">
              Vai trò trong phòng ban <span className="text-danger-primary">*</span>
            </span>
            <Controller
              control={control}
              name="projectRole"
              rules={{ required: "Vui lòng chọn vai trò phòng ban" }}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  customButton={
                    <div className="shadow-sm flex w-full items-center justify-between gap-1 rounded-md border border-subtle px-3 py-2 text-left text-13 text-primary duration-200 hover:bg-layer-1 focus:outline-none">
                      <span>{roles.find((r) => r.value === Number(field.value))?.label ?? "Chọn vai trò"}</span>
                      <ChevronDownIcon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                    </div>
                  }
                  input
                >
                  {roles.map((item) => (
                    <CustomSelect.Option key={item.value} value={item.value}>
                      {item.label}
                    </CustomSelect.Option>
                  ))}
                </CustomSelect>
              )}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-end gap-2 border-t border-subtle pt-3">
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel} type="button">
            Hủy
          </Button>
        )}
        <Button variant="primary" size="lg" type="submit" loading={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
        </Button>
      </div>
    </form>
  );
});

export type TDirectMemberCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  workspaceSlug?: string;
  onSuccess?: () => void;
  onSwitchToInvite?: () => void;
};

export const DirectMemberCreateModal = observer(function DirectMemberCreateModal(props: TDirectMemberCreateModalProps) {
  const { isOpen, onClose, projectId, projectName, workspaceSlug, onSuccess, onSwitchToInvite } = props;
  const [createdData, setCreatedData] = useState<IDirectMemberCreateResponse | null>(null);

  const handleClose = () => {
    setCreatedData(null);
    onClose();
  };

  const handleSuccess = (data: IDirectMemberCreateResponse) => {
    setCreatedData(data);
    if (onSuccess) onSuccess();
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      {createdData ? (
        <CredentialSummaryCard
          displayName={createdData.display_name}
          username={createdData.credentials?.username || createdData.username}
          password={createdData.credentials?.password || ""}
          role={createdData.role}
          email={createdData.email}
          projectName={projectName}
          projectRole={createdData.project_role}
          onClose={handleClose}
          onReset={() => setCreatedData(null)}
        />
      ) : (
        <div className="w-full">
          <div className="border-b border-subtle px-5 pt-5 pb-3">
            <h3 className="text-16 font-medium text-primary">
              {projectId ? "Tạo tài khoản thành viên phòng ban" : "Thêm thành viên đơn vị"}
            </h3>
            <p className="mt-0.5 text-13 text-secondary">
              Khởi tạo tài khoản trực tiếp không yêu cầu xác nhận email. Admin sẽ nhận mật khẩu bàn giao ngay sau khi
              tạo.
            </p>
          </div>
          <DirectMemberCreateForm
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            projectName={projectName}
            onSuccess={handleSuccess}
            onCancel={handleClose}
            onSwitchToInvite={onSwitchToInvite}
          />
        </div>
      )}
    </ModalCore>
  );
});
